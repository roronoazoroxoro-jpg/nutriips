import { NextResponse } from "next/server";
import { listClinicalTeam } from "@/lib/shared-access";

export const runtime = "nodejs";

/** Público: listado clínico para el panel compartido (sin clave). */
export async function GET() {
  const team = await listClinicalTeam();
  return NextResponse.json({ team });
}
