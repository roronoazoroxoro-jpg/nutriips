import { NextResponse } from "next/server";
import { getSessionNutritionist, publicUser, unauthorized } from "@/lib/auth";
import { badRequest, handleError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { text } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const body = await readJson(request);
    const name = text(body.name, 120);
    if (!name) return badRequest("El nombre profesional es obligatorio");
    const email = text(body.email, 120)?.toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("El email no es válido");
    if (email !== user.email && (await prisma.nutritionist.findUnique({ where: { email } }))) {
      return badRequest("Ese email ya está en uso");
    }
    const updated = await prisma.nutritionist.update({
      where: { id: user.id },
      data: {
        name,
        email,
        license: text(body.license, 60),
        phone: text(body.phone, 40),
        clinicName: text(body.clinicName, 120),
        address: text(body.address, 200),
      },
    });
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
