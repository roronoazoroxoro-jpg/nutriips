import type { SessionUser } from "./auth";

export type StaffRole = "nutritionist" | "chief" | "technical";

export function staffRole(user: { role?: string | null; technical?: boolean | null }): StaffRole {
  if (user.role === "chief" || user.role === "technical" || user.role === "nutritionist") return user.role;
  if (user.technical) return "technical";
  return "nutritionist";
}

export function isChief(user: { role?: string | null }) {
  return staffRole(user) === "chief";
}

export function isTechnical(user: { role?: string | null; technical?: boolean | null }) {
  return staffRole(user) === "technical";
}

export function isClinical(user: { role?: string | null; technical?: boolean | null }) {
  const role = staffRole(user);
  return role === "nutritionist" || role === "chief";
}

export function forbidden() {
  return Response.json({ error: "No tenés permiso para esta acción" }, { status: 403 });
}

export function assertChief(user: SessionUser) {
  return isChief(user);
}
