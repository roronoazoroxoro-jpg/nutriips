import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { nutritionistId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({ where: { nutritionistId: user.id, read: false } }),
  ]);
  return NextResponse.json({ notifications, unread });
}
