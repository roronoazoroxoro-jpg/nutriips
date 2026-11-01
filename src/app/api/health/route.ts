import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";
import { catalogSize } from "@/lib/cie10";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body: Record<string, unknown> = {
    app: "NutriIPS",
    ok: true,
    time: new Date().toISOString(),
    cie10: catalogSize(),
  };
  try {
    body.database = await pingDatabase();
  } catch (error) {
    body.ok = false;
    body.database = {
      ok: false,
      error: error instanceof Error ? error.message : "Sin conexión a la base",
    };
    return NextResponse.json(body, { status: 503 });
  }
  return NextResponse.json(body);
}
