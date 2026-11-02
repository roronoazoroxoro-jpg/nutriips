import { prisma } from "./db";

export async function logActivity(input: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | Record<string, unknown> | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        detail: input.detail == null ? null : typeof input.detail === "string" ? input.detail : JSON.stringify(input.detail),
      },
    });
  } catch (error) {
    console.error("[NutriIPS] activity log", error);
  }
}

export async function notifyNutritionist(input: {
  nutritionistId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        nutritionistId: input.nutritionistId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href || null,
      },
    });
  } catch (error) {
    console.error("[NutriIPS] notification", error);
  }
}
