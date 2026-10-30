const LOCALE = "es-AR";

export function fmtNumber(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(LOCALE, { maximumFractionDigits: digits });
}

export function fmtDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", ...opts });
}

export function fmtLongDate(value: string | Date) {
  const text = fmtDate(value, { weekday: "long", day: "numeric", month: "long", year: undefined });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fmtTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function fmtDateTime(value: string | Date) {
  return `${fmtDate(value)} ${fmtTime(value)}`;
}

export function daysAgo(value: string | null | undefined) {
  if (!value) return null;
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

export function relativeDay(value: string | null | undefined) {
  const days = daysAgo(value);
  if (days == null) return "Sin registros";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 0) return days === -1 ? "Mañana" : `En ${-days} días`;
  if (days < 30) return `Hace ${days} días`;
  const months = Math.round(days / 30);
  return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`;
}

/** Fecha local en formato YYYY-MM-DD para inputs type=date. */
export function toDateInput(value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function signed(value: number, digits = 1) {
  const text = fmtNumber(Math.abs(value), digits);
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text}`;
  return text;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function diabetesLabel(type: string) {
  const map: Record<string, string> = {
    ninguna: "Sin diabetes",
    prediabetes: "Prediabetes",
    "tipo 1": "Diabetes tipo 1",
    "tipo 2": "Diabetes tipo 2",
    gestacional: "Diabetes gestacional",
  };
  return map[type] ?? type;
}
