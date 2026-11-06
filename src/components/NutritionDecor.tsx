/** Ilustraciones botánicas decorativas para la pantalla de ingreso. */
export function NutritionDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Luz suave */}
      <div className="absolute -left-24 -top-28 h-[28rem] w-[28rem] rounded-full bg-leaf-300/25 blur-3xl" />
      <div className="absolute -right-20 top-24 h-[22rem] w-[22rem] rounded-full bg-[#5065A8]/15 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-leaf-200/30 blur-3xl" />

      {/* Hoja grande izquierda */}
      <svg className="absolute -left-6 top-16 w-40 opacity-[0.55] animate-float-slow sm:left-2 sm:w-52 md:w-60" viewBox="0 0 160 200" fill="none">
        <path
          d="M78 12c28 18 52 52 58 96-4 34-28 62-58 78-30-16-54-44-58-78C26 64 50 30 78 12Z"
          fill="#34a172"
          fillOpacity="0.22"
        />
        <path d="M78 20c-2 40-2 80 0 148" stroke="#157453" strokeWidth="2" strokeOpacity="0.35" />
        <path d="M78 48c18 10 32 28 40 50M78 88c-16 12-28 28-34 46" stroke="#1f8a62" strokeWidth="1.5" strokeOpacity="0.4" />
      </svg>

      {/* Zanahoria */}
      <svg className="absolute right-2 top-28 w-16 animate-float-delayed opacity-70 sm:right-8 sm:w-20 md:right-14" viewBox="0 0 64 120" fill="none">
        <path d="M28 8c2 10 6 16 10 22-8-2-14-2-20 2 4-8 6-16 10-24Z" fill="#157453" fillOpacity="0.75" />
        <path d="M36 10c0 12 4 18 10 24-6-4-10-8-10-24Z" fill="#34a172" fillOpacity="0.85" />
        <path d="M32 28c14 22 18 48 12 78-18 4-28-20-32-46 2-14 10-24 20-32Z" fill="#e07a3a" fillOpacity="0.82" />
        <path d="M34 40c6 16 8 36 4 56" stroke="#c45e22" strokeWidth="1.2" strokeOpacity="0.5" />
      </svg>

      {/* Aguacate */}
      <svg className="absolute bottom-24 right-[-1rem] w-28 animate-float-slow opacity-60 sm:bottom-28 sm:right-4 sm:w-36 md:right-10" viewBox="0 0 120 140" fill="none">
        <path
          d="M60 8c28 6 46 34 44 66-2 34-24 58-48 58S10 108 12 74C14 42 32 14 60 8Z"
          fill="#34a172"
          fillOpacity="0.28"
        />
        <path
          d="M60 22c20 4 34 26 32 50-2 26-18 44-34 44S26 98 28 72C30 48 42 26 60 22Z"
          fill="#96d6b3"
          fillOpacity="0.55"
        />
        <circle cx="58" cy="72" r="16" fill="#8b5a2b" fillOpacity="0.55" />
        <circle cx="54" cy="68" r="4" fill="#f3efe6" fillOpacity="0.35" />
      </svg>

      {/* Brócoli / ramillete */}
      <svg className="absolute bottom-10 left-[-0.5rem] w-24 opacity-55 animate-float-delayed sm:left-6 sm:w-28 md:left-10" viewBox="0 0 110 100" fill="none">
        <circle cx="38" cy="34" r="18" fill="#1f8a62" fillOpacity="0.55" />
        <circle cx="58" cy="24" r="20" fill="#34a172" fillOpacity="0.5" />
        <circle cx="78" cy="36" r="16" fill="#157453" fillOpacity="0.45" />
        <path d="M56 42c2 18 2 34 0 48" stroke="#125c43" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.45" />
        <path d="M48 70c8 4 16 4 24 0" stroke="#1f8a62" strokeWidth="3" strokeOpacity="0.35" />
      </svg>

      {/* Tomate cherry */}
      <svg className="absolute left-[42%] top-8 hidden w-14 animate-float-slow opacity-65 sm:block md:top-12" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="32" r="18" fill="#d4533c" fillOpacity="0.72" />
        <path d="M28 14c4 6 10 8 14 8-6 2-10 6-14 10-4-4-8-8-14-10 4 0 10-2 14-8Z" fill="#157453" fillOpacity="0.8" />
        <circle cx="22" cy="28" r="3" fill="#fff" fillOpacity="0.25" />
      </svg>

      {/* Hojas flotantes chicas */}
      <svg className="absolute right-[30%] bottom-16 hidden w-10 opacity-40 md:block" viewBox="0 0 40 40" fill="none">
        <path d="M8 28C18 8 34 6 34 6S30 24 12 32c-2-2-4-2-4-4Z" fill="#34a172" fillOpacity="0.5" />
      </svg>
      <svg className="absolute left-[28%] bottom-40 hidden w-8 rotate-45 opacity-35 lg:block" viewBox="0 0 40 40" fill="none">
        <path d="M8 28C18 8 34 6 34 6S30 24 12 32c-2-2-4-2-4-4Z" fill="#5065A8" fillOpacity="0.45" />
      </svg>
    </div>
  );
}
