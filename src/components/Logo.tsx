import { cx } from "@/components/ui";

const IPS_BLUE = "#5065A8";
const LEAF = "#34a172";

/** Sello IPS Misiones + hoja de nutrición (mark cuadrado). */
export function Logo({ className = "h-8 w-8", title = "IPS Misiones · Nutrición" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      {/* Anillo irregular estilo sello IPS */}
      <path
        fill={IPS_BLUE}
        d="M32.2 4.2c7.8-.6 15.2 1.8 20.8 6.8 5.8 5.2 9.2 12.6 9.1 20.5-.1 8.2-3.6 15.8-9.7 20.9-6 5-14 7.6-22 7-7.6-.6-14.8-3.8-19.8-9.4C5.4 44.2 2.4 36.6 2.8 28.6c.4-8.2 4.2-15.6 10.4-20.6C19.2 3.2 26.2 4.6 32.2 4.2z"
      />
      <path
        fill="#ffffff"
        d="M32 12.2c5.8-.4 11.4 1.4 15.6 5.2 4.4 4 6.9 9.6 6.8 15.5-.1 6.2-2.8 12-7.4 15.9-4.6 3.9-10.8 5.8-16.9 5.4-5.8-.4-11.3-3-15.1-7.2-3.9-4.3-5.9-10-5.6-15.9.3-6.1 3.1-11.7 7.9-15.4 4.5-3.5 9.7-3.2 14.7-3.5z"
      />
      <text
        x="32"
        y="37.5"
        textAnchor="middle"
        fill={IPS_BLUE}
        fontFamily="Segoe UI, Arial, sans-serif"
        fontWeight="800"
        fontSize="16"
        letterSpacing="0.5"
      >
        IPS
      </text>
      {/* Hoja nutrición */}
      <path
        fill={LEAF}
        d="M46.5 42.5c6.8-1.8 11.2-6.2 12.8-12.2-5.6 1.2-10.2 4.8-12.6 10.2-.4 1-.6 1.8-.2 2z"
      />
      <path
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        d="M47.2 42c2.8-3.2 6.4-5.6 10.6-7"
      />
    </svg>
  );
}

/** Lockup horizontal: sello + texto institucional + Nutrición. */
export function BrandLockup({
  className,
  compact = false,
  size = "md",
}: {
  className?: string;
  compact?: boolean;
  size?: "sm" | "md" | "hero";
}) {
  const tone = compact ? "sm" : size;
  const logoClass = tone === "hero" ? "h-20 w-20 sm:h-24 sm:w-24" : tone === "sm" ? "h-10 w-10" : "h-14 w-14";
  return (
    <div className={cx("flex items-center", tone === "hero" ? "gap-4 sm:gap-5" : "gap-3", className)}>
      <Logo className={logoClass} />
      <div className="min-w-0 leading-tight">
        <p
          className={cx(
            "font-semibold uppercase tracking-[0.08em] text-ink-500",
            tone === "hero" ? "text-[11px] sm:text-xs" : tone === "sm" ? "text-[9px]" : "text-[10px]"
          )}
        >
          Instituto de Previsión Social
        </p>
        <p
          className={cx(
            "font-display font-bold tracking-tight text-[#5065A8]",
            tone === "hero" ? "text-3xl sm:text-4xl md:text-5xl" : tone === "sm" ? "text-lg" : "text-2xl"
          )}
        >
          MISIONES
        </p>
        <p
          className={cx(
            "font-semibold uppercase tracking-[0.2em] text-leaf-700",
            tone === "hero" ? "mt-1.5 text-sm sm:text-base" : tone === "sm" ? "mt-0.5 text-[10px]" : "mt-1 text-xs"
          )}
        >
          Nutrición
        </p>
      </div>
    </div>
  );
}
