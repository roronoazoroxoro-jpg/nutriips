import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { handleError, notFound, readJson } from "@/lib/api";
import { ValidationError } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { patientInclude, presentPatient } from "@/lib/patient";
import type { MealPlanData } from "@/lib/plan";
import { mailConfigured, sendMail } from "@/lib/mail";
import { buildPatientPlanEmail } from "@/lib/patient-email";

function parsePlan(raw: string): MealPlanData | null {
  try {
    return JSON.parse(raw) as MealPlanData;
  } catch {
    return null;
  }
}

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function asString(value: unknown, max = 5000) {
  const text = String(value ?? "").trim();
  return text.slice(0, max);
}

export async function GET(_request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const patient = await prisma.patient.findFirst({ where: { id, nutritionistId: user.id }, select: { id: true, email: true, fullName: true } });
  if (!patient) return notFound("Paciente no encontrado");
  return NextResponse.json({
    configured: mailConfigured(),
    patientEmail: patient.email,
    from: process.env.SMTP_USER || null,
  });
}

export async function POST(request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;

  try {
    if (!mailConfigured()) {
      throw new ValidationError(
        "El envío por Gmail todavía no está configurado. Pedile a administración que cargue SMTP_USER y SMTP_PASS (contraseña de aplicación de Gmail)."
      );
    }

    const patient = await prisma.patient.findFirst({ where: { id, nutritionistId: user.id }, include: patientInclude });
    if (!patient) return notFound("Paciente no encontrado");

    const body = await readJson(request);
    const to = asString(body.to || patient.email, 200).toLowerCase();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new ValidationError("El paciente necesita un email válido para recibir el mensaje");
    }

    const personalMessage = asString(body.message, 4000);
    const tips = asString(body.tips, 4000);
    const includePlan = body.includePlan !== false;
    const subject = asString(body.subject, 180) || `Tu plan alimentario · ${user.clinicName || process.env.CLINIC_NAME || "NutriIPS"}`;

    const latestPlan = patient.plans[0] ? parsePlan(patient.plans[0].payload) : null;
    if (includePlan && !latestPlan) {
      throw new ValidationError("Guardá un plan alimentario antes de enviarlo por correo");
    }
    if (!personalMessage && !tips && !includePlan) {
      throw new ValidationError("Escribí un mensaje, tips o incluí el plan para enviar");
    }

    const clinic = user.clinicName || process.env.CLINIC_NAME || "Departamento de Nutrición · IPS";
    const content = buildPatientPlanEmail({
      patientName: patient.fullName,
      nutritionistName: user.name,
      clinicName: clinic,
      personalMessage:
        personalMessage ||
        `Te comparto tu plan alimentario personalizado. Está pensado para acompañarte estos días con comidas claras y prácticas.`,
      tips: tips || latestPlan?.recommendations || "",
      plan: latestPlan,
      includePlan,
    });

    await sendMail({
      to,
      subject,
      html: content.html,
      text: content.text,
      replyTo: user.email,
    });

    if (!patient.email || patient.email.toLowerCase() !== to) {
      await prisma.patient.update({ where: { id: patient.id }, data: { email: to } });
    }

    await prisma.progressNote.create({
      data: {
        patientId: patient.id,
        visitDate: new Date(),
        summary: `Plan / tips enviados por email a ${to}.`,
        nextVisit: null,
      },
    });

    const refreshed = await prisma.patient.findFirst({ where: { id: patient.id }, include: patientInclude });
    return NextResponse.json({
      ok: true,
      to,
      patient: refreshed ? presentPatient(refreshed) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
