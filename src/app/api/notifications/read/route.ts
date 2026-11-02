import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const body = await readJson(request).catch(() => ({} as Record<string, unknown>));
    const id = body.id ? String(body.id) : null;
    if (id) {
      await prisma.notification.updateMany({
        where: { id, nutritionistId: user.id },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { nutritionistId: user.id, read: false },
        data: { read: true },
      });
    }
    const unread = await prisma.notification.count({ where: { nutritionistId: user.id, read: false } });
    return NextResponse.json({ ok: true, unread });
  } catch (error) {
    return handleError(error);
  }
}
