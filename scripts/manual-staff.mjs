/**
 * Manual visual para el personal: capturas anotadas + PDF.
 * Uso: node scripts/manual-staff.mjs
 * Requiere Chrome/Edge y conexión a la base (Neon).
 */
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const BASE = process.env.VIDEO_URL || process.env.MANUAL_URL || "https://nutriips-ips.netlify.app";
const WIDTH = 1440;
const HEIGHT = 900;
const EMAIL = "manual.demo@nutriips.local";
const PASSWORD = randomBytes(9).toString("base64url") + "a1";
const stamp = new Date().toISOString().slice(0, 10);
const OUT = join(root, "entregables", `manual-personal-${stamp}`);
const SHOTS = join(OUT, "capturas");
const desktopDir = join(process.env.USERPROFILE || root, "Desktop", "NutriIPS - Manual y Tutorial");

const prisma = new PrismaClient();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No se encontró Chrome ni Edge");
  return found;
}

const day = (offset, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function cleanup() {
  await prisma.nutritionist.deleteMany({ where: { email: EMAIL } });
}

async function seed() {
  await cleanup();
  const user = await prisma.nutritionist.create({
    data: {
      email: EMAIL,
      name: "Lic. Ana Pérez",
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      license: "4521",
      phone: "3764-000000",
      clinicName: "Departamento de Nutrición · IPS Misiones",
      address: "Posadas, Misiones",
      title: "Lic. en Nutrición",
      mustChangePassword: false,
    },
  });

  const maria = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "María González",
      dni: "30123456",
      sex: "femenino",
      birthDate: "1982-05-14",
      phone: "3764-555123",
      email: "maria.gonzalez@example.com",
      occupation: "Docente",
      diagnosis: "Sobrepeso, prediabetes e hipotiroidismo tratado",
      diabetesType: "prediabetes",
      heightCm: 162,
    },
  });

  const visits = [
    { offset: -120, weight: 84.2, fat: 38.1, visceral: 11, waist: 98, folds: [24, 28, 14, 30, 22, 32, 30, 20] },
    { offset: -90, weight: 82.6, fat: 37.0, visceral: 10, waist: 95, folds: [23, 26, 13, 28, 21, 30, 29, 19] },
    { offset: -60, weight: 80.9, fat: 35.8, visceral: 10, waist: 92.5, folds: [21, 25, 12, 26, 19, 28, 28, 18] },
    { offset: -30, weight: 79.4, fat: 34.6, visceral: 9, waist: 90, folds: [20, 23, 11, 24, 18, 26, 27, 17] },
    { offset: -2, weight: 78.1, fat: 33.5, visceral: 9, waist: 88, folds: [19, 22, 10, 22, 17, 24, 26, 16] },
  ];
  const keys = ["triceps", "subscapular", "biceps", "iliacCrest", "supraspinale", "abdominal", "thigh", "calf"];
  for (const v of visits) {
    await prisma.isakAssessment.create({
      data: {
        patientId: maria.id,
        measuredAt: day(v.offset),
        payload: JSON.stringify({
          weightKg: v.weight,
          statureCm: 162,
          skinfolds: Object.fromEntries(keys.map((k, i) => [k, v.folds[i]])),
          girths: { armRelaxed: 31, armFlexed: 32, waist: v.waist, hip: 110, calf: 37 },
          breadths: { humerus: 6.2, femur: 9.1 },
        }),
      },
    });
    await prisma.omronReading.create({
      data: {
        patientId: maria.id,
        measuredAt: day(v.offset),
        payload: JSON.stringify({
          model: "HBF-514C",
          weightKg: v.weight,
          bodyFatPercent: v.fat,
          visceralFat: v.visceral,
          skeletalMusclePercent: 24.5,
          restingMetabolism: 1480,
          bodyAge: 48,
          segmental: {},
        }),
      },
    });
  }
  for (const [offset, value, slot] of [
    [-100, 118, "ayunas"],
    [-70, 112, "ayunas"],
    [-40, 106, "ayunas"],
    [-10, 101, "ayunas"],
    [-9, 152, "postprandial"],
  ]) {
    await prisma.glucoseReading.create({ data: { patientId: maria.id, value, slot, measuredAt: day(offset, 8) } });
  }
  await prisma.labResult.create({
    data: { patientId: maria.id, measuredAt: day(-118), glucose: 117, hba1c: 6.1, ldl: 148, triglycerides: 182, creatinine: 0.8 },
  });
  await prisma.labResult.create({
    data: { patientId: maria.id, measuredAt: day(-5), glucose: 102, hba1c: 5.8, ldl: 131, triglycerides: 150, creatinine: 0.8 },
  });
  await prisma.anamnesis.create({
    data: {
      patientId: maria.id,
      createdAt: day(-120),
      payload: JSON.stringify({
        reason: "Quiere bajar de peso; la médica le indicó cambios por prediabetes.",
        goal: "Bajar peso",
        expectation: "Sentirse con más energía y mejorar los análisis.",
        diagnoses: "Prediabetes. Hipotiroidismo.",
        medications: "Levotiroxina 75 mcg.",
        allergies: "Intolerancia a la lactosa",
        familyHistory: "Madre con diabetes tipo 2.",
        mealsPerDay: "3",
        breakfastTime: "07:00",
        lunchTime: "13:00",
        snackTime: "17:30",
        dinnerTime: "21:30",
        snacking: "Frecuente",
        activity: "Camina 2 veces por semana, 30 minutos",
        sleep: "6",
        water: "4",
        sweetDrinks: "Diario",
        bread: "Diario",
        vegetables: "1 a 2 veces/semana",
        impression: "Exceso de harinas y bebidas azucaradas; baja ingesta de verduras.",
        agreements: "Reemplazar gaseosa por agua saborizada natural.",
        nextVisit: "En 30 días",
      }),
    },
  });
  for (const [offset, summary, agreements] of [
    [-120, "Primera consulta. Anamnesis e ISAK.", "Dejar la gaseosa."],
    [-90, "Buena adherencia. Bajó 1,6 kg.", "Colación de media tarde."],
    [-60, "Más caminatas.", "Legumbres 2 veces/semana."],
    [-30, "Glucemias mejorando.", "Planificar salidas."],
    [-2, "Control: −6,1 kg. HbA1c 5,8%.", "Mantener plan."],
  ]) {
    await prisma.progressNote.create({
      data: { patientId: maria.id, visitDate: day(offset), summary, agreements, nextVisit: "En 30 días" },
    });
  }

  const jorge = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "Jorge Ramírez",
      dni: "22456789",
      sex: "masculino",
      birthDate: "1968-11-02",
      phone: "3764-478922",
      diagnosis: "Diabetes tipo 2, dislipemia",
      diabetesType: "tipo 2",
      heightCm: 175,
    },
  });
  await prisma.labResult.create({
    data: { patientId: jorge.id, measuredAt: day(-6), glucose: 164, hba1c: 8.1, ldl: 172, triglycerides: 245, creatinine: 1.1 },
  });
  await prisma.omronReading.create({
    data: {
      patientId: jorge.id,
      measuredAt: day(-6),
      payload: JSON.stringify({
        model: "HBF-514C",
        weightKg: 96.4,
        bodyFatPercent: 31.2,
        visceralFat: 16,
        skeletalMusclePercent: 30.1,
        restingMetabolism: 1850,
        bodyAge: 64,
        segmental: {},
      }),
    },
  });

  const lucia = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "Lucía Fernández",
      dni: "35111222",
      sex: "femenino",
      birthDate: "1990-03-21",
      phone: "3764-612344",
      diagnosis: "Celiaquía",
      heightCm: 165,
    },
  });
  const martin = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "Martín Sosa",
      dni: "40222333",
      sex: "masculino",
      birthDate: "1997-07-09",
      phone: "3764-334455",
      diagnosis: "Deportista, busca ganar masa muscular",
      heightCm: 181,
    },
  });
  const carla = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "Carla Benítez",
      dni: "33987654",
      sex: "femenino",
      birthDate: "1987-01-30",
      phone: "3764-589011",
      diagnosis: "Embarazo de 20 semanas",
      diabetesType: "gestacional",
      heightCm: 158,
    },
  });

  for (const [patientId, startsAt, durationMin, reason, status] of [
    [maria.id, day(-2, 10), 45, "Control mensual", "atendido"],
    [jorge.id, day(0, 9, 30), 45, "Control de glucemias", "programado"],
    [martin.id, day(0, 11), 60, "Primera consulta", "programado"],
    [maria.id, day(0, 16), 30, "Entrega de plan", "programado"],
    [carla.id, day(1, 10), 45, "Control de embarazo", "programado"],
    [lucia.id, day(3, 15), 45, "Control celiaquía", "programado"],
  ]) {
    await prisma.appointment.create({ data: { nutritionistId: user.id, patientId, startsAt, durationMin, reason, status } });
  }

  return { maria, user };
}

async function resolveBox(page, mark) {
  try {
    let locator = null;
    if (mark.role && mark.name) locator = page.getByRole(mark.role, { name: mark.name, exact: mark.exact === true });
    else if (mark.ariaLabel) locator = page.getByLabel(mark.ariaLabel);
    else if (mark.placeholder) locator = page.getByPlaceholder(mark.placeholder);
    else if (mark.text) locator = page.getByText(mark.text, { exact: Boolean(mark.exact) });
    else if (mark.selector) locator = page.locator(mark.selector);
    if (!locator) return null;
    const target = mark.nth != null ? locator.nth(mark.nth) : locator.first();
    await target.scrollIntoViewIfNeeded().catch(() => {});
    const box = await target.boundingBox();
    return box && box.width > 1 && box.height > 1 ? box : null;
  } catch {
    return null;
  }
}

async function annotate(page, marks) {
  const resolved = [];
  for (const mark of marks) {
    const box = await resolveBox(page, mark);
    if (box) resolved.push({ ...box, label: mark.callout || mark.label || "", side: mark.side || "right" });
  }
  await page.evaluate((items) => {
    document.querySelectorAll(".__manual_mark").forEach((el) => el.remove());
    const layer = document.createElement("div");
    layer.className = "__manual_mark";
    layer.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.cssText = "position:absolute;inset:0;overflow:visible;";
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML =
      '<marker id="arrowHead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#c2410c"/></marker>';
    svg.appendChild(defs);
    layer.appendChild(svg);

    for (const r of items) {
      const ring = document.createElement("div");
      ring.className = "__manual_mark";
      ring.style.cssText = `position:fixed;left:${r.x - 6}px;top:${r.y - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;border:3px solid #ea580c;border-radius:14px;box-shadow:0 0 0 4px rgba(234,88,12,.18);pointer-events:none;z-index:2147483646;`;
      document.documentElement.appendChild(ring);

      const side = r.side || "right";
      let tx = r.x + r.width + 18;
      let ty = r.y + r.height / 2 - 18;
      let ax1 = r.x + r.width + 4;
      let ay1 = r.y + r.height / 2;
      let ax2 = tx - 4;
      let ay2 = ty + 18;
      if (side === "left") {
        tx = Math.max(12, r.x - 280);
        ty = r.y + r.height / 2 - 18;
        ax1 = r.x - 4;
        ay1 = r.y + r.height / 2;
        ax2 = tx + 260;
        ay2 = ty + 18;
      } else if (side === "bottom") {
        tx = r.x + Math.min(r.width / 2 - 120, 40);
        ty = r.y + r.height + 16;
        ax1 = r.x + r.width / 2;
        ay1 = r.y + r.height + 4;
        ax2 = tx + 120;
        ay2 = ty - 2;
      } else if (side === "top") {
        tx = r.x + Math.min(r.width / 2 - 120, 40);
        ty = Math.max(12, r.y - 64);
        ax1 = r.x + r.width / 2;
        ay1 = r.y - 4;
        ax2 = tx + 120;
        ay2 = ty + 40;
      }

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(ax1));
      line.setAttribute("y1", String(ay1));
      line.setAttribute("x2", String(ax2));
      line.setAttribute("y2", String(ay2));
      line.setAttribute("stroke", "#c2410c");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("marker-end", "url(#arrowHead)");
      svg.appendChild(line);

      const bubble = document.createElement("div");
      bubble.className = "__manual_mark";
      bubble.style.cssText = `position:fixed;left:${tx}px;top:${ty}px;max-width:260px;padding:10px 12px;border-radius:12px;background:#9a3412;color:#fff;font:600 13px/1.35 "Segoe UI",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);pointer-events:none;z-index:2147483647;`;
      bubble.textContent = r.label;
      document.documentElement.appendChild(bubble);
    }
    document.documentElement.appendChild(layer);
  }, resolved);
  await sleep(200);
}

async function clearMarks(page) {
  await page.evaluate(() => document.querySelectorAll(".__manual_mark").forEach((el) => el.remove()));
}

async function shot(page, name, marks = []) {
  if (marks.length) await annotate(page, marks);
  else await clearMarks(page);
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await clearMarks(page);
  return `capturas/${name}.png`;
}

function buildHtml(pages) {
  const sections = pages
    .map(
      (p, i) => `
    <section class="page">
      <div class="meta">
        <span class="step">Paso ${String(i + 1).padStart(2, "0")}</span>
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        ${p.tips ? `<ul>${p.tips.map((t) => `<li>${t}</li>`).join("")}</ul>` : ""}
      </div>
      <figure>
        <img src="${p.img}" alt="${p.title}" />
        <figcaption>${p.caption || p.title}</figcaption>
      </figure>
    </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Manual NutriIPS · Personal</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: #14231c; background: #f7f4ef; }
  .cover {
    min-height: 100vh; padding: 48px 40px; display: flex; flex-direction: column; justify-content: space-between;
    background: radial-gradient(900px 500px at 90% -10%, rgba(52,161,114,.28), transparent 55%),
                linear-gradient(160deg, #0d1f18 0%, #16352b 55%, #1f4a3a 100%);
    color: #fff; page-break-after: always;
  }
  .cover h1 { font-size: 42px; margin: 18px 0 8px; letter-spacing: -0.02em; }
  .cover p { max-width: 560px; color: rgba(255,255,255,.78); font-size: 16px; line-height: 1.5; }
  .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:rgba(255,255,255,.12); font-size:12px; letter-spacing:.14em; text-transform:uppercase; }
  .toc { background:#fff; border-radius:18px; padding:18px 20px; color:#14231c; }
  .toc ol { margin: 8px 0 0; padding-left: 18px; columns: 2; gap: 24px; }
  .toc li { margin: 4px 0; font-size: 13px; }
  .page {
    background: #fff; margin: 18px; padding: 22px; border-radius: 18px; border: 1px solid rgba(20,35,28,.08);
    page-break-inside: avoid; break-inside: avoid;
  }
  .step { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #2f7a57; }
  h2 { margin: 6px 0 8px; font-size: 22px; }
  .meta p { margin: 0 0 10px; color: #40554a; font-size: 14px; line-height: 1.5; }
  .meta ul { margin: 0 0 12px; padding-left: 18px; color: #40554a; font-size: 13px; }
  figure { margin: 0; }
  img { width: 100%; border-radius: 14px; border: 1px solid rgba(20,35,28,.1); display: block; }
  figcaption { margin-top: 8px; font-size: 12px; color: #6b7c73; }
  .footer-note { text-align:center; color:#6b7c73; font-size:12px; padding: 8px 0 24px; }
</style>
</head>
<body>
  <section class="cover">
    <div>
      <span class="badge">IPS Misiones · Departamento de Nutrición</span>
      <h1>Manual de uso · NutriIPS</h1>
      <p>Guía práctica con capturas del panel real. Pensada para que cualquier nutricionista del equipo pueda ingresar, cargar pacientes, registrar la consulta y entregar el plan sin pedir ayuda.</p>
    </div>
    <div class="toc">
      <strong>Contenido</strong>
      <ol>
        ${pages.map((p) => `<li>${p.title}</li>`).join("")}
      </ol>
    </div>
  </section>
  ${sections}
  <p class="footer-note">NutriIPS · ${stamp} · Las capturas usan un consultorio de demostración; tus pacientes reales no se modifican en esta guía.</p>
</body>
</html>`;
}

async function login(page) {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByLabel("Buscar profesional").fill("Ana Pérez");
  await sleep(400);
  await page.getByRole("button", { name: /Lic\. Ana Pérez/ }).click();
  await page.getByLabel("Tu clave").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar al panel" }).click();
  await page.waitForURL("**/panel", { timeout: 25000 });
  await page.waitForLoadState("networkidle");
  await sleep(500);
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(desktopDir, { recursive: true });

  console.log("Base:", BASE);
  console.log("Preparando datos de demostración...");
  const { maria } = await seed();

  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args: [`--window-size=${WIDTH},${HEIGHT}`, "--lang=es-AR"],
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1.25,
    locale: "es-AR",
  });
  const page = await context.newPage();
  const pages = [];

  // 1. Login listado
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(600);
  pages.push({
    title: "Ingreso: elegí tu perfil",
    body: "En la pantalla de inicio tocá tu nombre. Podés filtrar escribiendo en el buscador. No hace falta tipear el email.",
    tips: ["Cada profesional solo ve sus propios pacientes.", "El bloque de soporte técnico queda al final del listado."],
    caption: "Listado de profesionales del departamento",
    img: await shot(page, "01-login-listado", [
      { ariaLabel: "Buscar profesional", callout: "Buscá tu nombre acá", side: "bottom" },
      { role: "button", name: /Valentina Vallejos|Lic\. Ana Pérez|Carolina/, callout: "Tocá tu tarjeta para continuar", side: "right" },
    ]),
  });

  // 2. Login clave
  await page.getByLabel("Buscar profesional").fill("Ana Pérez");
  await sleep(300);
  await page.getByRole("button", { name: /Lic\. Ana Pérez/ }).click();
  await sleep(400);
  pages.push({
    title: "Ingreso: escribí tu clave",
    body: "Después de elegir el perfil, ingresá la clave que te entregaron. En el primer acceso el sistema puede pedirte que la cambies por una personal.",
    tips: ["Si te equivocás, usá “Volver al listado”.", "Guardá tu clave en un lugar seguro del consultorio."],
    caption: "Pantalla de clave del perfil elegido",
    img: await shot(page, "02-login-clave", [
      { ariaLabel: "Tu clave", callout: "Escribí tu clave", side: "left" },
      { role: "button", name: "Ingresar al panel", callout: "Ingresar al panel", side: "bottom" },
    ]),
  });

  await page.getByLabel("Tu clave").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar al panel" }).click();
  await page.waitForURL("**/panel", { timeout: 25000 });
  await page.waitForLoadState("networkidle");
  await sleep(700);

  // 3. Inicio
  pages.push({
    title: "Inicio: el tablero del día",
    body: "Al entrar ves turnos de hoy, próximos turnos, alertas clínicas y pacientes sin control reciente. Es el punto de partida de cada jornada.",
    tips: ["Usá el menú de la izquierda para ir a Pacientes, Agenda o Ajustes.", "Ctrl + K abre el buscador rápido desde cualquier pantalla."],
    caption: "Panel de inicio",
    img: await shot(page, "03-inicio", [
      { role: "link", name: "Inicio", callout: "Inicio", side: "right" },
      { role: "link", name: "Pacientes", callout: "Pacientes", side: "right" },
      { role: "link", name: "Agenda", callout: "Agenda", side: "right" },
      { role: "button", name: /Buscar paciente/, callout: "Buscador rápido (Ctrl K)", side: "right" },
    ]),
  });

  // 4. Buscador
  await page.keyboard.press("Control+k");
  await sleep(500);
  await page.getByPlaceholder("Nombre, DNI o teléfono...").fill("María González");
  await sleep(900);
  pages.push({
    title: "Buscar un paciente (Ctrl + K)",
    body: "Desde cualquier pantalla abrí el buscador con Ctrl + K (o el botón Buscar paciente). Escribí nombre, DNI o teléfono y elegí el resultado.",
    tips: ["Ideal cuando la paciente ya está en el consultorio y necesitás abrir la ficha al instante."],
    caption: "Buscador global",
    img: await shot(page, "04-buscar", [
      { placeholder: "Nombre, DNI o teléfono...", callout: "Escribí nombre, DNI o teléfono", side: "bottom" },
    ]),
  });
  const result = page.getByRole("button", { name: /María González/ }).or(page.getByRole("link", { name: /María González/ }));
  if (await result.count()) {
    await result.first().click();
  } else {
    await page.goto(BASE + `/panel/pacientes/${maria.id}`, { waitUntil: "networkidle" });
  }
  await page.waitForURL(`**/panel/pacientes/${maria.id}`, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await sleep(600);

  // 5. Resumen
  pages.push({
    title: "Ficha del paciente · Resumen",
    body: "La pestaña Resumen muestra indicadores con el cambio respecto al control anterior, alertas clínicas y el requerimiento energético estimado.",
    tips: ["Los valores en verde suelen indicar mejora.", "Desde acá podés saltar a otras pestañas de la ficha."],
    caption: "Resumen clínico",
    img: await shot(page, "05-resumen", [
      { role: "button", name: "Resumen", exact: true, callout: "Pestaña Resumen", side: "bottom" },
    ]),
  });

  // 6. Evolución
  await page.getByRole("button", { name: "Evolución", exact: true }).click();
  await sleep(800);
  pages.push({
    title: "Evolución: gráficos en el tiempo",
    body: "Acá ves peso, IMC, grasa, cintura, glucemia y HbA1c a lo largo de los controles, con franjas de rango saludable cuando aplica.",
    tips: ["Útil para mostrar avances a la paciente en la consulta."],
    caption: "Gráficos de evolución",
    img: await shot(page, "06-evolucion", [
      { role: "button", name: "Evolución", exact: true, callout: "Pestaña Evolución", side: "bottom" },
    ]),
  });

  // 7. Consultas
  await page.getByRole("button", { name: "Consultas", exact: true }).click();
  await sleep(700);
  pages.push({
    title: "Consultas: notas de evolución",
    body: "Registrá cada visita con plantilla SOAP. Podés insertar mediciones en un clic y guardar acuerdos y próximo control.",
    tips: ["La historia queda ordenada por fecha.", "No borres notas sin necesidad: son parte de la historia clínica."],
    caption: "Notas de consulta",
    img: await shot(page, "07-consultas", [
      { role: "button", name: "Consultas", exact: true, callout: "Pestaña Consultas", side: "bottom" },
      { role: "button", name: "Insertar mediciones", callout: "Insertar mediciones actuales", side: "left" },
    ]),
  });

  // 8. Anamnesis
  await page.getByRole("button", { name: "Anamnesis", exact: true }).click();
  await sleep(700);
  pages.push({
    title: "Anamnesis alimentaria",
    body: "Completá o actualizá la anamnesis. Cada guardado genera una versión nueva: no se pierde lo anterior.",
    tips: ["Revisala en la primera consulta y actualizala cuando cambien hábitos o medicamentos."],
    caption: "Anamnesis versionada",
    img: await shot(page, "08-anamnesis", [
      { role: "button", name: "Anamnesis", exact: true, callout: "Pestaña Anamnesis", side: "bottom" },
    ]),
  });

  // 9. ISAK
  await page.getByRole("button", { name: "Antropometría", exact: true }).click();
  await sleep(700);
  pages.push({
    title: "Antropometría ISAK",
    body: "Cargá pliegues, perímetros y diámetros. El sistema calcula IMC, % de grasa y riesgo por cintura. “Copiar última” acelera el control siguiente.",
    tips: ["Usá la misma técnica de medición entre controles para comparar bien."],
    caption: "Carga ISAK",
    img: await shot(page, "09-isak", [
      { role: "button", name: "Antropometría", exact: true, callout: "Pestaña Antropometría", side: "bottom" },
      { role: "button", name: "Copiar última", callout: "Partir de la última medición", side: "left" },
    ]),
  });

  // 10. Omron
  await page.getByRole("button", { name: "Bioimpedancia", exact: true }).click();
  await sleep(700);
  pages.push({
    title: "Bioimpedancia (Omron)",
    body: "Registrá las lecturas de la balanza: peso, grasa, visceral, músculo y metabolismo. Quedan comparables en la evolución.",
    caption: "Lecturas Omron",
    img: await shot(page, "10-omron", [
      { role: "button", name: "Bioimpedancia", exact: true, callout: "Pestaña Bioimpedancia", side: "bottom" },
    ]),
  });

  // 11. Labs
  await page.getByRole("button", { name: "Glucosa y laboratorio", exact: true }).click();
  await sleep(700);
  pages.push({
    title: "Glucosa y laboratorio",
    body: "Cargá glucemias por momento del día y análisis (glucosa, HbA1c, lípidos, etc.). Los valores se marcan según rangos de referencia.",
    caption: "Laboratorio y glucemias",
    img: await shot(page, "11-labs", [
      { role: "button", name: "Glucosa y laboratorio", exact: true, callout: "Pestaña Glucosa y laboratorio", side: "bottom" },
    ]),
  });

  // 12. Plan
  await page.getByRole("button", { name: "Plan alimentario", exact: true }).click();
  await sleep(900);
  pages.push({
    title: "Plan alimentario",
    body: "Armá o ajustá el plan: meta calórica, macros, comidas del día, lista de compras y recomendaciones. Después guardalo.",
    tips: ["Podés enviarlo por email o abrirlo para imprimir / PDF."],
    caption: "Editor del plan",
    img: await shot(page, "12-plan", [
      { role: "button", name: "Plan alimentario", exact: true, callout: "Pestaña Plan alimentario", side: "bottom" },
    ]),
  });

  // 13. Impresión plan
  await page.goto(BASE + `/imprimir/${maria.id}/plan`, { waitUntil: "networkidle" });
  await sleep(600);
  pages.push({
    title: "Plan listo para imprimir o PDF",
    body: "Esta vista usa el membrete de tus datos profesionales. Imprimí o guardá como PDF desde el navegador (Ctrl + P).",
    caption: "Vista de impresión del plan",
    img: await shot(page, "13-imprimir-plan", []),
  });

  // 14. Informe
  await page.goto(BASE + `/imprimir/${maria.id}/informe`, { waitUntil: "networkidle" });
  await sleep(600);
  pages.push({
    title: "Informe nutricional",
    body: "Informe profesional para la historia o derivaciones: evolución, hallazgos, mediciones y laboratorio.",
    caption: "Vista de impresión del informe",
    img: await shot(page, "14-informe", []),
  });

  // 15. Pacientes
  await page.goto(BASE + "/panel/pacientes", { waitUntil: "networkidle" });
  await sleep(700);
  pages.push({
    title: "Listado de pacientes",
    body: "Desde acá ves todo tu padrón. Filtrá por alertas, buscá por texto y abrí “Nuevo paciente” para alta.",
    tips: ["Al crear un paciente cargá al menos nombre y sexo; el resto se completa en la consulta."],
    caption: "Pacientes",
    img: await shot(page, "15-pacientes", [
      { role: "link", name: /Nuevo paciente|Alta/, callout: "Alta de paciente", side: "left" },
      { role: "button", name: "Con alertas", callout: "Filtrar con alertas", side: "bottom" },
    ]),
  });

  // 16. Agenda
  await page.goto(BASE + "/panel/agenda", { waitUntil: "networkidle" });
  await sleep(700);
  pages.push({
    title: "Agenda semanal",
    body: "Gestioná turnos: programado, atendido, ausente o cancelado. “Nuevo turno” abre el formulario; el sistema avisa si se superpone.",
    tips: ["Marcá “Atendido” al terminar la consulta para llevar el control del día."],
    caption: "Agenda",
    img: await shot(page, "16-agenda", [
      { role: "button", name: "Nuevo turno", callout: "Agendar turno", side: "left" },
    ]),
  });

  await page.getByRole("button", { name: "Nuevo turno" }).click();
  await sleep(600);
  pages.push({
    title: "Agendar un turno",
    body: "Elegí paciente, fecha, hora y motivo. Confirmá con Agendar. Si hay solapamiento, NutriIPS te lo indica.",
    caption: "Formulario de nuevo turno",
    img: await shot(page, "17-nuevo-turno", [
      { ariaLabel: "Paciente", callout: "Elegí paciente", side: "right" },
      { role: "button", name: "Agendar", callout: "Confirmar", side: "left" },
    ]),
  });
  await page.keyboard.press("Escape");
  await sleep(300);

  // 18. Ajustes
  await page.goto(BASE + "/panel/ajustes", { waitUntil: "networkidle" });
  await sleep(700);
  pages.push({
    title: "Ajustes: membrete, clave y respaldo",
    body: "Completá nombre profesional, matrícula y datos del consultorio (salen en plan e informe). Cambiá tu clave y descargá un respaldo cuando lo necesites.",
    tips: ["Hacé un respaldo periódico, sobre todo antes de cambios grandes.", "No compartas tu clave con otras colegas: cada una tiene su cuenta."],
    caption: "Ajustes del perfil",
    img: await shot(page, "18-ajustes", [
      { role: "link", name: "Ajustes", callout: "Menú Ajustes", side: "right" },
    ]),
  });

  const htmlPath = join(OUT, "NutriIPS-manual-personal.html");
  writeFileSync(htmlPath, buildHtml(pages), "utf8");

  console.log("Generando PDF...");
  const pdfPage = await context.newPage();
  await pdfPage.goto("file:///" + htmlPath.replace(/\\/g, "/"), { waitUntil: "networkidle" });
  await sleep(800);
  const pdfPath = join(OUT, "NutriIPS-manual-personal.pdf");
  await pdfPage.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "12mm", left: "8mm", right: "8mm" },
  });

  // Copias al escritorio
  const deskPdf = join(desktopDir, "NutriIPS-manual-personal.pdf");
  const deskHtml = join(desktopDir, "NutriIPS-manual-personal.html");
  copyFileSync(pdfPath, deskPdf);
  copyFileSync(htmlPath, deskHtml);
  mkdirSync(join(desktopDir, "capturas"), { recursive: true });
  for (const p of pages) {
    const name = p.img.replace("capturas/", "");
    copyFileSync(join(SHOTS, name), join(desktopDir, "capturas", name));
  }

  await browser.close();
  console.log("Manual PDF:", deskPdf);
  console.log("Manual HTML:", deskHtml);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup();
  await prisma.$disconnect();
}
