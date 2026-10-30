export type FieldType = "text" | "textarea" | "select" | "number";

export type AnamnesisField = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
};

export type AnamnesisSection = {
  id: string;
  title: string;
  hint: string;
  fields: AnamnesisField[];
};

const FREQUENCY = ["No consume", "Ocasional", "1 a 2 veces/semana", "3 a 6 veces/semana", "Diario"];

export const ANAMNESIS_SECTIONS: AnamnesisSection[] = [
  {
    id: "motivo",
    title: "Motivo y objetivo",
    hint: "Lo que trae a la consulta y el acuerdo con el paciente.",
    fields: [
      { key: "reason", label: "Motivo de consulta", type: "textarea" },
      {
        key: "goal",
        label: "Objetivo",
        type: "select",
        options: [
          "Bajar peso",
          "Mantener peso",
          "Ganar masa muscular",
          "Control de diabetes",
          "Control de lípidos",
          "Síntomas digestivos",
          "Rendimiento",
          "Otro",
        ],
      },
      { key: "expectation", label: "Qué espera lograr", type: "textarea" },
    ],
  },
  {
    id: "clinico",
    title: "Clínica",
    hint: "Antecedentes que cambian el plan alimentario.",
    fields: [
      { key: "diagnoses", label: "Diagnósticos", type: "textarea", placeholder: "Diabetes, hipertensión, hipotiroidismo..." },
      { key: "medications", label: "Medicación", type: "textarea" },
      { key: "supplements", label: "Suplementos", type: "textarea" },
      { key: "allergies", label: "Alergias e intolerancias", type: "textarea" },
      { key: "familyHistory", label: "Antecedentes familiares", type: "textarea" },
      { key: "surgeries", label: "Cirugías o internaciones", type: "textarea" },
    ],
  },
  {
    id: "habitos",
    title: "Hábitos alimentarios",
    hint: "Estructura del día, no solo calorías.",
    fields: [
      { key: "mealsPerDay", label: "Comidas por día", type: "select", options: ["2", "3", "4", "5", "6 o más"] },
      { key: "breakfastTime", label: "Horario desayuno", type: "text", placeholder: "07:30" },
      { key: "lunchTime", label: "Horario almuerzo", type: "text", placeholder: "12:30" },
      { key: "snackTime", label: "Horario merienda", type: "text" },
      { key: "dinnerTime", label: "Horario cena", type: "text" },
      { key: "whoCooks", label: "Quién cocina", type: "text" },
      { key: "eatsOut", label: "Come fuera de casa", type: "select", options: ["Casi nunca", "1 a 2 veces/semana", "Varias veces/semana", "Casi todos los días"] },
      { key: "snacking", label: "Picoteo", type: "select", options: ["No", "A veces", "Frecuente"] },
      { key: "appetite", label: "Apetito", type: "select", options: ["Bajo", "Normal", "Aumentado", "Variable"] },
      { key: "preferences", label: "Preferencias", type: "textarea" },
      { key: "aversions", label: "Rechazos", type: "textarea" },
    ],
  },
  {
    id: "recordatorio",
    title: "Recordatorio de 24 horas",
    hint: "Un día habitual, comida por comida.",
    fields: [
      { key: "recallBreakfast", label: "Desayuno", type: "textarea" },
      { key: "recallMorning", label: "Media mañana", type: "textarea" },
      { key: "recallLunch", label: "Almuerzo", type: "textarea" },
      { key: "recallSnack", label: "Merienda", type: "textarea" },
      { key: "recallDinner", label: "Cena", type: "textarea" },
      { key: "recallNight", label: "Después de cenar", type: "textarea" },
    ],
  },
  {
    id: "frecuencia",
    title: "Frecuencia de consumo",
    hint: "Grupos que suelen figurar en una planilla de anamnesis alimentaria.",
    fields: [
      ["dairy", "Lácteos"],
      ["meat", "Carnes"],
      ["eggs", "Huevos"],
      ["legumes", "Legumbres"],
      ["grains", "Arroz, fideos, papa"],
      ["bread", "Pan y galletitas"],
      ["fruit", "Frutas"],
      ["vegetables", "Verduras"],
      ["ultraprocessed", "Ultraprocesados"],
      ["fried", "Frituras"],
      ["sugar", "Azúcar y postres"],
      ["sweetDrinks", "Bebidas azucaradas"],
      ["alcohol", "Alcohol"],
    ].map(([key, label]) => ({ key, label, type: "select" as const, options: FREQUENCY })),
  },
  {
    id: "vida",
    title: "Estilo de vida y digestivo",
    hint: "Actividad, sueño y síntomas que modifican la pauta.",
    fields: [
      { key: "water", label: "Vasos de agua por día", type: "number" },
      { key: "activity", label: "Actividad física", type: "textarea", placeholder: "Tipo, minutos y veces por semana" },
      { key: "sleep", label: "Horas de sueño", type: "text" },
      { key: "tobacco", label: "Tabaco", type: "select", options: ["No", "Ex fumador", "Sí"] },
      { key: "stress", label: "Estrés o picoteo emocional", type: "select", options: ["Bajo", "Moderado", "Alto"] },
      { key: "giSymptoms", label: "Síntomas digestivos", type: "textarea", placeholder: "Distensión, reflujo, constipación, diarrea" },
    ],
  },
  {
    id: "cierre",
    title: "Cierre del nutricionista",
    hint: "Lo que queda de esta consulta.",
    fields: [
      { key: "impression", label: "Impresión nutricional", type: "textarea" },
      { key: "agreements", label: "Acuerdos con el paciente", type: "textarea" },
      { key: "nextVisit", label: "Próximo control", type: "text", placeholder: "En 30 días" },
    ],
  },
];

export function emptyAnamnesis() {
  return Object.fromEntries(
    ANAMNESIS_SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, ""]))
  ) as Record<string, string>;
}
