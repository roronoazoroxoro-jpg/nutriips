import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, isChief } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  if (!isChief(user)) return forbidden();

  const limit = Math.min(100, Number(new URL(request.url).searchParams.get("limit") || 40));
  const activity = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json({
    activity: activity.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      detail: row.detail,
      createdAt: row.createdAt,
      actor: row.actor,
    })),
  });
}
