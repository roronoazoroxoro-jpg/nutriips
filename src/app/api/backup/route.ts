import { NextResponse } from "next/server";
import { getSessionNutritionist, publicUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const patients = await prisma.patient.findMany({
    where: { nutritionistId: user.id },
    include: {
      anamneses: true,
      isak: true,
      omron: true,
      glucose: true,
      meals: true,
      labs: true,
      plans: true,
      notes: true,
      appointments: true,
    },
    orderBy: { fullName: "asc" },
  });
  const decode = <T extends { payload: string }>(rows: T[]) =>
    rows.map(({ payload, ...rest }) => {
      try {
        return { ...rest, payload: JSON.parse(payload) };
      } catch {
        return { ...rest, payload };
      }
    });
  const data = {
    app: "NutriIPS",
    version: 1,
    exportedAt: new Date().toISOString(),
    professional: publicUser(user),
    patients: patients.map((patient) => ({
      ...patient,
      anamneses: decode(patient.anamneses),
      isak: decode(patient.isak),
      omron: decode(patient.omron),
      plans: decode(patient.plans),
    })),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutriips-respaldo-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
