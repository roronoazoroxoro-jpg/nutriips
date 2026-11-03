import { NextResponse } from "next/server";
import { handleError, readJson } from "@/lib/api";
import { logActivity, notifyNutritionist } from "@/lib/activity";
import { assertNoOverlap, parseStart } from "@/lib/appointments-server";
import { prisma } from "@/lib/db";
import { requireClinicalActor } from "@/lib/shared-access";
import { ValidationError, optionalNumber, text } from "@/lib/validation";

export const runtime = "nodejs";

const REFERRAL_INCLUDE = {
  assignedTo: { select: { id: true, name: true } },
  assignedBy: { select: { id: true, name: true } },
  patient: { select: { id: true, fullName: true } },
} as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const referrals = await prisma.referral.findMany({
    where: status ? { status } : undefined,
    include: REFERRAL_INCLUDE,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ referrals });
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const actor = await requireClinicalActor(body.actorId ? String(body.actorId) : null);
    const fullName = text(body.fullName, 160);
    if (!fullName) throw new ValidationError("El nombre del paciente es obligatorio");

    const assignedToId = body.assignedToId ? String(body.assignedToId) : null;
    const scheduledAt = body.scheduledAt ? parseStart(body.scheduledAt) : null;
    const durationMin = optionalNumber(body.durationMin, { min: 10, max: 240, label: "Duración", unit: "min" }) ?? 45;
    const reason = text(body.reason, 400);
    const status = assignedToId ? "asignado" : "pendiente";

    let patientId: string | null = body.patientId ? String(body.patientId) : null;
    let appointmentId: string | null = null;

    if (assignedToId) {
      const assignee = await prisma.nutritionist.findFirst({
        where: { id: assignedToId, NOT: { role: "technical" }, technical: false },
        select: { id: true, name: true },
      });
      if (!assignee) throw new ValidationError("Elegí una nutricionista válida");

      if (!patientId) {
        const dni = text(body.dni, 30);
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
            nutritionistId: assignedToId,
            fullName,
            dni: text(body.dni, 30),
            birthDate: text(body.birthDate, 20),
            phone: text(body.phone, 40),
            sex: text(body.sex, 20) || "femenino",
            diagnosis: reason,
          },
        });
        patientId = patient.id;
      } else {
        await prisma.patient.update({
          where: { id: patientId },
          data: {
            nutritionistId: assignedToId,
            fullName,
            dni: text(body.dni, 30) || undefined,
            birthDate: text(body.birthDate, 20) || undefined,
            phone: text(body.phone, 40) || undefined,
            diagnosis: reason || undefined,
          },
        });
      }

      if (scheduledAt) {
        await assertNoOverlap(assignedToId, scheduledAt, durationMin);
        const appointment = await prisma.appointment.create({
          data: {
            nutritionistId: assignedToId,
            patientId,
            startsAt: scheduledAt,
            durationMin,
            reason,
            status: "programado",
          },
        });
        appointmentId = appointment.id;
      }

      await notifyNutritionist({
        nutritionistId: assignedToId,
        type: "referral.assigned",
        title: "Te asignaron un paciente",
        body: `${fullName}${scheduledAt ? ` · ${scheduledAt.toLocaleString("es-AR")}` : ""}${reason ? ` · ${reason}` : ""} · por ${actor.name}`,
        href: `/panel/pacientes/${patientId}`,
      });
    }

    const referral = await prisma.referral.create({
      data: {
        fullName,
        dni: text(body.dni, 30),
        birthDate: text(body.birthDate, 20),
        phone: text(body.phone, 40),
        affiliateNumber: text(body.affiliateNumber, 40),
        sex: text(body.sex, 20) || "femenino",
        reason,
        notes: text(body.notes, 1000),
        status,
        scheduledAt,
        durationMin,
        assignedToId,
        assignedById: actor.id,
        patientId,
        appointmentId,
      },
      include: REFERRAL_INCLUDE,
    });

    await logActivity({
      actorId: actor.id,
      action: "referral.create",
      entity: "referral",
      entityId: referral.id,
      detail: { fullName, assignedToId, status },
    });

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
