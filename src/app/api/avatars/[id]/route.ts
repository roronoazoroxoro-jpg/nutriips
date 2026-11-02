import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const person = await prisma.nutritionist.findUnique({
    where: { id },
    select: { avatarBytes: true, avatarMime: true, avatarAt: true },
  });
  if (!person?.avatarBytes || !person.avatarAt) {
    return new NextResponse(null, { status: 404 });
  }

  const body = Buffer.from(person.avatarBytes);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": person.avatarMime || "image/jpeg",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
