import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionNutritionist, publicUser, unauthorized } from "@/lib/auth";
import { badRequest, readJson, handleError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const body = await readJson<{ current?: string; next?: string }>(request);
    if (!body.current || !(await bcrypt.compare(body.current, user.passwordHash))) {
      return badRequest("La clave actual no es correcta");
    }
    const next = body.next ?? "";
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      return badRequest("La clave nueva debe tener al menos 8 caracteres, con letras y números");
    }
    if (next === body.current) return badRequest("La clave nueva tiene que ser distinta de la actual");
    const updated = await prisma.nutritionist.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false },
    });
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
