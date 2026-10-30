"use client";

import Link from "next/link";
import { forwardRef, useEffect, useId, type ComponentProps, type ReactNode } from "react";
import { AlertTriangle, Info, Loader2, TrendingDown, TrendingUp, X, CheckCircle2, Minus } from "lucide-react";
import type { Tone } from "@/lib/insights";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-ink-800 shadow-sm",
  secondary: "bg-white text-ink-900 border border-ink-900/10 hover:bg-sand-50 shadow-sm",
  ghost: "text-ink-800 hover:bg-ink-900/5",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  soft: "bg-leaf-100 text-leaf-800 hover:bg-leaf-200",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

function buttonClass(variant: Variant, size: Size, className?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }
>(function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cx("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-900/[0.06] px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-leaf-50 text-leaf-700">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-950">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-600">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leaf-700">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold text-ink-950 md:text-[34px]">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-ink-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

type FieldProps = { label?: ReactNode; hint?: ReactNode; className?: string; suffix?: string };

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input"> & FieldProps>(function Input(
  { label, hint, className, suffix, id, ...props },
  ref
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input ref={ref} id={inputId} className={cx("input", suffix && "pr-12")} {...props} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
});

export function Select({ label, hint, className, id, children, ...props }: ComponentProps<"select"> & FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <select id={inputId} className="input" {...props}>
        {children}
      </select>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, hint, className, id, ...props }: ComponentProps<"textarea"> & FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <textarea id={inputId} className="input" {...props} />
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

const TONES: Record<Tone | "neutral", string> = {
  high: "bg-red-50 text-red-700 ring-red-600/15",
  mid: "bg-amber-50 text-amber-800 ring-amber-600/20",
  good: "bg-leaf-50 text-leaf-700 ring-leaf-600/20",
  info: "bg-sky-50 text-sky-800 ring-sky-600/15",
  neutral: "bg-ink-900/[0.04] text-ink-700 ring-ink-900/10",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone | "neutral"; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function AlertRow({ tone, title, detail }: { tone: Tone; title: string; detail: string }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle;
  const color = { high: "text-red-600", mid: "text-amber-600", good: "text-leaf-600", info: "text-sky-600" }[tone];
  return (
    <li className="flex gap-3 py-2.5">
      <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", color)} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-950">{title}</p>
        <p className="text-xs leading-relaxed text-ink-600">{detail}</p>
      </div>
    </li>
  );
}

export function Stat({
  label,
  value,
  unit,
  detail,
  change,
  goodWhen = "down",
  icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: ReactNode;
  change?: { text: string; value: number } | null;
  goodWhen?: "down" | "up" | "none";
  icon?: ReactNode;
}) {
  const direction = change ? Math.sign(change.value) : 0;
  const good = goodWhen === "none" || direction === 0 ? null : goodWhen === "down" ? direction < 0 : direction > 0;
  const TrendIcon = direction > 0 ? TrendingUp : direction < 0 ? TrendingDown : Minus;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-600">{label}</p>
        {icon && <span className="text-ink-500">{icon}</span>}
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold leading-none tracking-tight text-ink-950">{value}</span>
        {unit && <span className="text-sm text-ink-500">{unit}</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-600">
        {change && (
          <span
            className={cx(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
              good == null ? "bg-ink-900/5 text-ink-700" : good ? "bg-leaf-100 text-leaf-800" : "bg-red-50 text-red-700"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {change.text}
          </span>
        )}
        {detail && <span className="truncate">{detail}</span>}
      </div>
    </Card>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-50 text-leaf-600">{icon}</div>}
      <p className="mt-3 text-sm font-semibold text-ink-950">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-ink-900/[0.06]", className)} />;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx("relative flex max-h-[92vh] w-full animate-scale-in flex-col rounded-t-2xl bg-white shadow-lift sm:rounded-2xl", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-900/[0.06] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-600">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-900/5" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-900/[0.06] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-700">{description}</p>
    </Modal>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: T; label: string; icon?: ReactNode; badge?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <nav className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Secciones">
      <div className="inline-flex min-w-full gap-1 border-b border-ink-900/10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cx(
              "relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition",
              value === tab.key ? "border-ink-900 text-ink-950" : "border-transparent text-ink-600 hover:text-ink-900"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const palette = ["bg-leaf-100 text-leaf-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800", "bg-violet-100 text-violet-800"];
  const color = palette[[...name].reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length];
  const dims = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" }[size];
  return <div className={cx("grid shrink-0 place-items-center rounded-full font-semibold", color, dims)}>{letters || "?"}</div>;
}
