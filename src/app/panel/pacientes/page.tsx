"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/client";
import type { PatientSummary } from "@/lib/patient";
import { diabetesLabel, fmtNumber, relativeDay } from "@/lib/format";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, Skeleton, cx } from "@/components/ui";

type Filter = "todos" | "alertas" | "diabetes" | "pendientes";
type Sort = "nombre" | "reciente" | "alertas";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "alertas", label: "Con alertas" },
  { key: "diabetes", label: "Diabetes / prediabetes" },
  { key: "pendientes", label: "Sin control +60 días" },
];

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [sort, setSort] = useState<Sort>("nombre");

  useEffect(() => {
    api<{ patients: PatientSummary[] }>("/api/patients")
      .then((data) => setPatients(data.patients))
      .catch(() => setPatients([]));
  }, []);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    const rows = (patients ?? []).filter((p) => {
      if (q && !normalize(`${p.fullName} ${p.dni ?? ""} ${p.phone ?? ""} ${p.diagnosis ?? ""}`).includes(q)) return false;
      if (filter === "alertas") return p.alerts > 0;
      if (filter === "diabetes") return p.diabetesType !== "ninguna";
      if (filter === "pendientes") return !p.lastVisit || Date.now() - new Date(p.lastVisit).getTime() > 60 * 86_400_000;
      return true;
    });
    return rows.sort((a, b) => {
      if (sort === "reciente") return (b.lastVisit ?? b.createdAt).localeCompare(a.lastVisit ?? a.createdAt);
      if (sort === "alertas") return b.alerts - a.alerts || a.fullName.localeCompare(b.fullName);
      return a.fullName.localeCompare(b.fullName, "es");
    });
  }, [patients, query, filter, sort]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Consultorio"
        title="Pacientes"
        description={patients ? `${patients.length} ${patients.length === 1 ? "paciente" : "pacientes"} en total` : "Cargando..."}
        actions={
          <ButtonLink href="/panel/pacientes/nuevo" icon={<UserPlus className="h-4 w-4" />}>
            Nuevo paciente
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input pl-9" placeholder="Buscar por nombre, DNI, teléfono o diagnóstico" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input md:w-52" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
          <option value="nombre">Ordenar por nombre</option>
          <option value="reciente">Última consulta</option>
          <option value="alertas">Más alertas primero</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              filter === f.key ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-inset ring-ink-900/10 hover:bg-sand-100"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {patients == null ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="Todavía no hay pacientes"
            description="Creá la primera ficha para empezar a registrar anamnesis, mediciones y planes."
            action={
              <ButtonLink href="/panel/pacientes/nuevo" icon={<UserPlus className="h-4 w-4" />}>
                Crear primer paciente
              </ButtonLink>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState icon={<Search className="h-5 w-5" />} title="Sin resultados" description="Probá con otra búsqueda o cambiá el filtro." />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,0.7fr))_minmax(0,1fr)_24px] gap-4 border-b border-ink-900/[0.06] bg-sand-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500 md:grid">
              <span>Paciente</span>
              <span>Peso</span>
              <span>IMC</span>
              <span>% grasa</span>
              <span>Último control</span>
              <span />
            </div>
            <ul className="divide-y divide-ink-900/[0.06]">
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/panel/pacientes/${p.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_24px] items-center gap-4 px-5 py-3.5 transition hover:bg-sand-50 md:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,0.7fr))_minmax(0,1fr)_24px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={p.fullName} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink-950">
                          {p.fullName}
                          {p.alerts > 0 && (
                            <span title={`${p.alerts} ${p.alerts === 1 ? "alerta" : "alertas"}`} className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {p.alerts}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-ink-600">
                          {[p.age != null ? `${p.age} años` : null, p.dni ? `DNI ${p.dni}` : null, p.diagnosis].filter(Boolean).join(" · ") || "Sin datos cargados"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5 md:hidden">
                          {p.bmi != null && <Badge>IMC {fmtNumber(p.bmi)}</Badge>}
                          <Badge>{relativeDay(p.lastVisit)}</Badge>
                        </div>
                      </div>
                    </div>
                    <span className="hidden text-sm text-ink-800 md:block">{p.weight != null ? `${fmtNumber(p.weight)} kg` : "—"}</span>
                    <span className="hidden text-sm text-ink-800 md:block">{fmtNumber(p.bmi)}</span>
                    <span className="hidden text-sm text-ink-800 md:block">{p.bodyFat != null ? `${fmtNumber(p.bodyFat)}%` : "—"}</span>
                    <span className="hidden md:block">
                      <span className="block text-sm text-ink-800">{relativeDay(p.lastVisit)}</span>
                      {p.diabetesType !== "ninguna" && <span className="text-xs text-ink-500">{diabetesLabel(p.diabetesType)}</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
