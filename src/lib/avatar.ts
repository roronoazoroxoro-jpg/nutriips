/** URL pública cacheable de la foto de perfil (null si no tiene). */
export function avatarPublicUrl(user: { id: string; avatarAt?: Date | string | null }) {
  if (!user.avatarAt) return null;
  const stamp = user.avatarAt instanceof Date ? user.avatarAt.getTime() : new Date(user.avatarAt).getTime();
  if (!Number.isFinite(stamp)) return null;
  return `/api/avatars/${user.id}?v=${stamp}`;
}

export const AVATAR_MAX_BYTES = 220_000;
export const AVATAR_SIZE = 320;
