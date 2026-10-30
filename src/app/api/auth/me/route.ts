import { NextResponse } from "next/server";
import { getSessionNutritionist, publicUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionNutritionist();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}
