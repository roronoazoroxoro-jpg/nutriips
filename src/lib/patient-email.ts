import { ACTIVITY, GOALS, macroGrams, type MealPlanData } from "./plan";
import { fmtNumber } from "./format";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesToHtml(text: string) {
  return escapeHtml(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li style="margin:0 0 6px;">${line}</li>`)
    .join("");
}

export function buildPatientPlanEmail(input: {
  patientName: string;
  nutritionistName: string;
  clinicName: string;
  personalMessage: string;
  tips: string;
  plan: MealPlanData | null;
  includePlan: boolean;
}) {
  const firstName = input.patientName.trim().split(/\s+/)[0] || input.patientName;
  const clinic = input.clinicName || "Departamento de Nutrición";
  const grams = input.plan ? macroGrams(input.plan.kcalTarget, input.plan.macros) : null;

  const messageHtml = escapeHtml(input.personalMessage.trim()).replace(/\r?\n/g, "<br/>");
  const tipsList = input.tips.trim() ? linesToHtml(input.tips) : "";

  let planHtml = "";
  let planText = "";
  if (input.includePlan && input.plan) {
    const mealsHtml = input.plan.meals
      .map((meal) => {
        const items = linesToHtml(meal.items);
        return `<tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e8efe6;vertical-align:top;width:140px;">
            <div style="font-weight:700;color:#14301f;">${escapeHtml(meal.name)}</div>
            ${meal.time ? `<div style="font-size:12px;color:#5f7466;margin-top:4px;">${escapeHtml(meal.time)} hs</div>` : ""}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #e8efe6;vertical-align:top;color:#24352b;">
            <ul style="margin:0;padding-left:18px;">${items || "<li style='color:#7a8b80;'>Sin detalle</li>"}</ul>
          </td>
        </tr>`;
      })
      .join("");

    planHtml = `
      <div style="margin-top:28px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#14301f;">${escapeHtml(input.plan.title || "Tu plan alimentario")}</h2>
        <p style="margin:0 0 14px;font-size:14px;color:#5f7466;">
          ${escapeHtml(GOALS[input.plan.goal]?.label || "")}
          ${input.plan.kcalTarget ? ` · ${fmtNumber(input.plan.kcalTarget, 0)} kcal/día` : ""}
          ${grams ? ` · HC ${input.plan.macros.carbs}% · Prot ${input.plan.macros.protein}% · Grasas ${input.plan.macros.fat}%` : ""}
          · ${escapeHtml(ACTIVITY[input.plan.activity]?.label || "")}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7e4d4;border-radius:14px;overflow:hidden;background:#fff;">
          ${mealsHtml}
        </table>
        ${
          input.plan.shopping.length
            ? `<div style="margin-top:18px;padding:14px 16px;border-radius:14px;background:#f4faf2;border:1px solid #d7e4d4;">
                <div style="font-weight:700;color:#14301f;margin-bottom:8px;">Lista de compras</div>
                <ul style="margin:0;padding-left:18px;color:#24352b;">${input.plan.shopping.map((item) => `<li style="margin:0 0 4px;">${escapeHtml(item)}</li>`).join("")}</ul>
              </div>`
            : ""
        }
      </div>`;

    planText = [
      "",
      input.plan.title || "Tu plan alimentario",
      `${GOALS[input.plan.goal]?.label || ""}${input.plan.kcalTarget ? ` · ${input.plan.kcalTarget} kcal/día` : ""}`,
      ...input.plan.meals.map((meal) => `\n${meal.name}${meal.time ? ` (${meal.time})` : ""}\n${meal.items}`),
      input.plan.shopping.length ? `\nLista de compras:\n- ${input.plan.shopping.join("\n- ")}` : "",
    ].join("\n");
  }

  const tipsHtml = tipsList
    ? `<div style="margin-top:28px;padding:16px 18px;border-radius:14px;background:#fff8eb;border:1px solid #f0dfb8;">
        <div style="font-weight:700;color:#6a4b10;margin-bottom:8px;">Tips para estos días</div>
        <ul style="margin:0;padding-left:18px;color:#4a3a1a;">${tipsList}</ul>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f3f6f2;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c2a22;">
  <div style="max-width:640px;margin:0 auto;padding:24px 14px;">
    <div style="background:#14301f;border-radius:18px 18px 0 0;padding:22px 24px;color:#fff;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;">${escapeHtml(clinic)}</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px;">Hola ${escapeHtml(firstName)}</div>
    </div>
    <div style="background:#ffffff;border:1px solid #d7e4d4;border-top:0;border-radius:0 0 18px 18px;padding:22px 24px;">
      <p style="margin:0;font-size:15px;line-height:1.55;color:#24352b;">${messageHtml || `Te comparto tu plan alimentario personalizado.`}</p>
      ${planHtml}
      ${tipsHtml}
      <p style="margin:28px 0 0;font-size:14px;color:#5f7466;line-height:1.5;">
        Cualquier duda, escribime.<br/>
        <strong style="color:#14301f;">${escapeHtml(input.nutritionistName)}</strong><br/>
        ${escapeHtml(clinic)}
      </p>
    </div>
    <p style="margin:14px 8px 0;font-size:11px;color:#7a8b80;text-align:center;">Mensaje enviado desde NutriIPS</p>
  </div>
</body>
</html>`;

  const text = [
    `Hola ${firstName},`,
    "",
    input.personalMessage.trim() || "Te comparto tu plan alimentario personalizado.",
    planText,
    input.tips.trim() ? `\nTips para estos días:\n- ${input.tips.trim().split(/\r?\n/).filter(Boolean).join("\n- ")}` : "",
    "",
    `Cualquier duda, escribime.`,
    input.nutritionistName,
    clinic,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { html, text };
}
