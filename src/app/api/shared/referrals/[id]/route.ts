import { NextResponse } from "next/server";
import { handleError, notFound, readJson } from "@/lib/api";
import { logActivity, notifyNutritionist } from "@/lib/activity";
import { assertNoOverlap, parseStart } from "@/lib/appointments-server";
import { prisma } from "@/lib/db";
import { requireClinicalActor } from "@/lib/shared-access";
import { ValidationError, optionalNumber, text } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["pendiente", "asignado", "presente", "ausente", "cancelado"];

const REFERRAL_INCLUDE = {
  assignedTo: { select: { id: true, name: true } },
  assignedBy: { select: { id: true, name: true } },
  patient: { select: { id: true, fullName: true } },
} as const;

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  const current = await prisma.referral.findUnique({ where: { id } });
  if (!current) return notFound("Derivación no encontrada");

  try {
    const body = await readJson(request);
    const actor = await requireClinicalActor(body.actorId ? String(body.actorId) : null);

    const data: {
      fullName?: string;
      dni?: string | null;
      birthDate?: string | null;
      phone?: string | null;
      affiliateNumber?: string | null;
      sex?: string;
      reason?: string | null;
      notes?: string | null;
      status?: string;
      scheduledAt?: Date | null;
      durationMin?: number;
      assignedToId?: string | null;
      patientId?: string | null;
      appointmentId?: string | null;
    } = {};

    if (body.fullName !== undefined) {
      const fullName = text(body.fullName, 160);
      if (!fullName) throw new ValidationError("El nombre es obligatorio");
      data.fullName = fullName;
    }
    if (body.dni !== undefined) data.dni = text(body.dni, 30);
    if (body.birthDate !== undefined) data.birthDate = text(body.birthDate, 20);
    if (body.phone !== undefined) data.phone = text(body.phone, 40);
    if (body.affiliateNumber !== undefined) data.affiliateNumber = text(body.affiliateNumber, 40);
    if (body.sex !== undefined) data.sex = text(body.sex, 20) || "femenino";
    if (body.reason !== undefined) data.reason = text(body.reason, 400);
    if (body.notes !== undefined) data.notes = text(body.notes, 1000);
    if (body.status !== undefined) {
      if (!STATUSES.includes(String(body.status))) throw new ValidationError("Estado inválido");
      data.status = String(body.status);
    }
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? parseStart(body.scheduledAt) : null;
    if (body.durationMin !== undefined) {
      data.durationMin = optionalNumber(body.durationMin, { min: 10, max: 240, label: "Duración", unit: "min" }) ?? 45;
    }

    const assignTo = body.assignedToId !== undefined ? (body.assignedToId ? String(body.assignedToId) : null) : undefined;
    if (assignTo !== undefined) {
      data.assignedToId = assignTo;
      if (assignTo) data.status = data.status || "asignado";
    }

    const nextAssignee = data.assignedToId !== undefined ? data.assignedToId : current.assignedToId;
    const nextSchedule = data.scheduledAt !== undefined ? data.scheduledAt : current.scheduledAt;
    const nextDuration = data.durationMin ?? current.durationMin;
    const nextName = data.fullName || current.fullName;
    const nextReason = data.reason !== undefined ? data.reason : current.reason;

    if (nextAssignee) {
      const assignee = await prisma.nutritionist.findFirst({
        where: { id: nextAssignee, NOT: { role: "technical" }, technical: false },
        select: { id: true, name: true },
      });
      if (!assignee) throw new ValidationError("Elegí una nutricionista válida");

      let patientId = current.patientId;
      if (!patientId) {
        const dni = data.dni ?? current.dni;
        if (dni) {
          const existing = await prisma.patient.findFirst({
            where: { dni },
            select: { id: true },
            orderBy: { createdAt: "desc" },
          });
          if (existing) patientId = existing.id;
        }
      }

      if (!patientId) {
        const patient = await prisma.patient.create({
          data: {
            nutritionistId: nextAssignee,
            fullName: nextName,
            dni: data.dni ?? current.dni,
            birthDate: data.birthDate ?? current.birthDate,
            phone: data.phone ?? current.phone,
            sex: data.sex || current.sex || "femenino",
            diagnosis: nextReason,
          },
        });
        patientId = patient.id;
        data.patientId = patientId;
      } else {
        await prisma.patient.update({
          where: { id: patientId },
          data: {
            nutritionistId: nextAssignee,
            fullName: nextName,
            dni: data.dni ?? undefined,
            phone: data.phone ?? undefined,
            birthDate: data.birthDate ?? undefined,
            diagnosis: nextReason || undefined,
          },
        });
        data.patientId = patientId;
      }

      if (nextSchedule) {
        await assertNoOverlap(nextAssignee, nextSchedule, nextDuration, current.appointmentId || undefined);
        if (current.appointmentId) {
          await prisma.appointment.update({
            where: { id: current.appointmentId },
            data: {
              nutritionistId: nextAssignee,
              patientId,
              startsAt: nextSchedule,
              durationMin: nextDuration,
              reason: nextReason,
              status:
                data.status === "presente"
                  ? "atendido"
                  : data.status === "ausente"
                    ? "ausente"
                    : data.status === "cancelado"
                      ? "cancelado"
                      : "programado",
            },
          });
        } else {
          const appointment = await prisma.appointment.create({
            data: {
              nutritionistId: nextAssignee,
              patientId: patientId!,
              startsAt: nextSchedule,
              durationMin: nextDuration,
              reason: nextReason,
              status: "programado",
            },
          });
          data.appointmentId = appointment.id;
        }
      }

      const reassigned = Boolean(assignTo && assignTo !== current.assignedToId);
      const newlyLinked = Boolean(!current.patientId && patientId);
      if ((reassigned || newlyLinked) && assignTo) {
        await notifyNutritionist({
          nutritionistId: assignTo,
          type: "referral.assigned",
          title: "Te asignaron un paciente",
          body: `${nextName}${nextSchedule ? ` · ${nextSchedule.toLocaleString("es-AR")}` : ""}${nextReason ? ` · ${nextReason}` : ""} · por ${actor.name}`,
          href: `/panel/pacientes/${patientId}`,
        });
      }
    }

    const referral = await prisma.referral.update({
      where: { id },
      data,
      include: REFERRAL_INCLUDE,
    });

    await logActivity({
      actorId: actor.id,
      action: "referral.update",
      entity: "referral",
      entityId: id,
      detail: { status: referral.status, assignedToId: referral.assignedToId },
    });

    return NextResponse.json({ referral });
  } catch (error) {
    return handleError(error);
  }
}
