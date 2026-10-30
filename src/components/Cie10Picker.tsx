"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, Plus, Search, X } from "lucide-react";
import type { Cie10Selection } from "@/lib/cie10-shared";
import { cx } from "./ui";

type Result = Cie10Selection & { chapter?: string };

export function Cie10Picker({
  value,
  onChange,
  label = "Diagnósticos CIE-10",
}: {
  value: Cie10Selection[];
  onChange: (next: Cie10Selection[]) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("Catálogo CIE-10");
  const boxRef = useRef<HTMLDivElement>(null);
  const selectedKeys = useMemo(() => new Set(value.map((v) => v.code.replace(/\./g, "").toUpperCase())), [value]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cie10?q=${encodeURIComponent(query.trim())}&limit=20`);
        const data = await res.json();
        if (cancelled) return;
        setResults(data.results ?? []);
        setHint(data.quick ? "Frecuentes en nutrición · escribí para buscar en todo el CIE-10" : `${data.total?.toLocaleString("es-AR") ?? ""} códigos en catálogo`);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  function add(item: Result) {
    const key = item.code.replace(/\./g, "").toUpperCase();
    if (selectedKeys.has(key)) return;
    onChange([...value, { code: item.code, description: item.description }]);
    setQuery("");
    setOpen(true);
  }

  function remove(code: string) {
    const key = code.replace(/\./g, "").toUpperCase();
    onChange(value.filter((v) => v.code.replace(/\./g, "").toUpperCase() !== key));
  }

  return (
    <div ref={boxRef} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="label mb-0">{label}</label>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-leaf-700">
          <BookMarked className="h-3.5 w-3.5" />
          CIE-10
        </span>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((item) => (
            <li key={item.code} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-leaf-200 bg-leaf-50 py-1 pl-2.5 pr-1 text-sm text-ink-900">
              <span className="font-semibold text-leaf-800">{item.code}</span>
              <span className="truncate text-ink-700">{item.description}</span>
              <button type="button" onClick={() => remove(item.code)} className="rounded-full p-1 text-ink-500 hover:bg-white hover:text-ink-900" aria-label={`Quitar ${item.code}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por código o descripción (ej.: E66, obesidad, diabetes…)"
          className="input pl-9"
          autoComplete="off"
        />
        {open && (
          <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-ink-900/10 bg-white py-1 shadow-lift">
            <p className="px-3 py-1.5 text-[11px] text-ink-500">{loading ? "Buscando…" : hint}</p>
            {results.length === 0 && !loading && <p className="px-3 py-3 text-sm text-ink-500">Sin coincidencias en el CIE-10.</p>}
            <ul>
              {results.map((item) => {
                const key = item.code.replace(/\./g, "").toUpperCase();
                const already = selectedKeys.has(key);
                return (
                  <li key={`${item.code}-${item.description}`}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => add(item)}
                      className={cx(
                        "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition",
                        already ? "cursor-default opacity-45" : "hover:bg-leaf-50"
                      )}
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">{item.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-ink-950">{item.description}</span>
                        {item.chapter && <span className="block text-[11px] text-ink-500">{item.chapter}</span>}
                      </span>
                      {!already && <Plus className="mt-1 h-4 w-4 shrink-0 text-leaf-700" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <p className="text-xs text-ink-500">Podés cargar varios códigos. El texto libre de abajo queda como detalle clínico adicional.</p>
    </div>
  );
}
