export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#34a172" />
      <path d="M9 22.5c0-7.5 5-12.5 14-13-.3 8.8-5.3 13.8-12.8 13.9" fill="#e3f5ea" />
      <path d="M10.5 21.5c2.6-3.4 5.4-5.8 8.5-7.5" stroke="#157453" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
