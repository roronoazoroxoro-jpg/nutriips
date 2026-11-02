import { NextResponse } from "next/server";
import { getSessionNutritionist, publicUser, unauthorized } from "@/lib/auth";
import { badRequest, handleError } from "@/lib/api";
import { AVATAR_MAX_BYTES } from "@/lib/avatar";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return badRequest("Elegí una imagen");
    if (!ALLOWED.has(file.type)) return badRequest("Usá JPG, PNG o WebP");
    if (file.size > AVATAR_MAX_BYTES) return badRequest("La foto es demasiado pesada. Probá otra o recortala.");

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength < 32) return badRequest("La imagen no es válida");
    if (bytes.byteLength > AVATAR_MAX_BYTES) return badRequest("La foto es demasiado pesada. Probá otra o recortala.");

    const updated = await prisma.nutritionist.update({
      where: { id: user.id },
      data: {
        avatarBytes: bytes,
        avatarMime: file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg",
        avatarAt: new Date(),
      },
    });
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const updated = await prisma.nutritionist.update({
      where: { id: user.id },
      data: { avatarBytes: null, avatarMime: null, avatarAt: null },
    });
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
