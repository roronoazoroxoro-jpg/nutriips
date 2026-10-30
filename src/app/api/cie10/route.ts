import { NextRequest, NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { catalogSize, CIE10_QUICK, searchCie10 } from "@/lib/cie10";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(40, Math.max(5, Number(request.nextUrl.searchParams.get("limit") || 20)));

  if (!q) {
    return NextResponse.json({
      total: catalogSize(),
      results: CIE10_QUICK.slice(0, limit),
      quick: true,
    });
  }

  return NextResponse.json({
    total: catalogSize(),
    results: searchCie10(q, limit),
    quick: false,
  });
}
