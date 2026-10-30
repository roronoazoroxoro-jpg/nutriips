import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
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

const BASE = process.env.VIDEO_URL || "http://localhost:3010";
const OUT_DIR = join(root, "video");
const FRAMES = join(OUT_DIR, "frames");
const OUTPUT = join(OUT_DIR, "NutriIPS-recorrido.mp4");
const WIDTH = 1440;
const HEIGHT = 900;
const EMAIL = "recorrido.video@nutriips.local";
const PASSWORD = randomBytes(9).toString("base64url") + "a1";

const prisma = new PrismaClient();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findFfmpeg() {
  const bin = process.env.FFMPEG_PATH || "ffmpeg";
  const probe = spawnSync(bin, ["-version"], { stdio: "ignore" });
  if (probe.status === 0) return bin;
  throw new Error("No se encontró ffmpeg (instalalo o definí FFMPEG_PATH)");
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error("No se encontró Chrome ni Edge (definí CHROME_PATH)");
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
      phone: "11 4321-8765",
      clinicName: "Consultorio Nutrir",
      address: "Av. Rivadavia 4250, CABA",
    },
  });

  const maria = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "María González",
      dni: "30123456",
      sex: "femenino",
      birthDate: "1982-05-14",
      phone: "11 5555-1234",
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
  for (const [offset, value, slot] of [[-100, 118, "ayunas"], [-70, 112, "ayunas"], [-40, 106, "ayunas"], [-10, 101, "ayunas"], [-9, 152, "postprandial"]]) {
    await prisma.glucoseReading.create({ data: { patientId: maria.id, value, slot, measuredAt: day(offset, 8) } });
  }
  await prisma.labResult.create({ data: { patientId: maria.id, measuredAt: day(-118), glucose: 117, hba1c: 6.1, ldl: 148, triglycerides: 182, creatinine: 0.8 } });
  await prisma.labResult.create({ data: { patientId: maria.id, measuredAt: day(-5), glucose: 102, hba1c: 5.8, ldl: 131, triglycerides: 150, creatinine: 0.8 } });
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
        agreements: "Reemplazar gaseosa por agua saborizada natural. Sumar verduras en el almuerzo.",
        nextVisit: "En 30 días",
      }),
    },
  });
  const notes = [
    [-120, "Primera consulta. Se realiza anamnesis completa y medición ISAK. Refiere picoteo por la tarde.", "Dejar la gaseosa. Verduras en el almuerzo."],
    [-90, "Buena adherencia. Bajó 1,6 kg. Dejó la gaseosa de lunes a viernes.", "Sumar colación de media tarde planificada."],
    [-60, "Continúa descenso. Aumentó a 3 caminatas semanales.", "Incorporar legumbres 2 veces por semana."],
    [-30, "Semana con eventos sociales; igual mantuvo el descenso. Glucemias en ayunas mejorando.", "Planificar salidas: elegir plato con verduras."],
    [-2, "Control mensual: −6,1 kg desde el inicio, cintura −10 cm. HbA1c bajó a 5,8%.", "Mantener plan. Fuerza 2 veces por semana."],
  ];
  for (const [offset, summary, agreements] of notes) {
    await prisma.progressNote.create({ data: { patientId: maria.id, visitDate: day(offset), summary, agreements, nextVisit: "En 30 días" } });
  }

  const jorge = await prisma.patient.create({
    data: {
      nutritionistId: user.id,
      fullName: "Jorge Ramírez",
      dni: "22456789",
      sex: "masculino",
      birthDate: "1968-11-02",
      phone: "11 4789-2233",
      diagnosis: "Diabetes tipo 2, dislipemia",
      diabetesType: "tipo 2",
      heightCm: 175,
    },
  });
  await prisma.labResult.create({ data: { patientId: jorge.id, measuredAt: day(-6), glucose: 164, hba1c: 8.1, ldl: 172, triglycerides: 245, creatinine: 1.1 } });
  await prisma.omronReading.create({
    data: {
      patientId: jorge.id,
      measuredAt: day(-6),
      payload: JSON.stringify({ model: "HBF-514C", weightKg: 96.4, bodyFatPercent: 31.2, visceralFat: 16, skeletalMusclePercent: 30.1, restingMetabolism: 1850, bodyAge: 64, segmental: {} }),
    },
  });
  await prisma.progressNote.create({ data: { patientId: jorge.id, visitDate: day(-6), summary: "Primera consulta. Derivado por su médico clínico por mal control glucémico.", agreements: "Registro de glucemias en ayunas." } });

  const lucia = await prisma.patient.create({
    data: { nutritionistId: user.id, fullName: "Lucía Fernández", dni: "35111222", sex: "femenino", birthDate: "1990-03-21", phone: "11 6123-4455", diagnosis: "Celiaquía", heightCm: 165 },
  });
  await prisma.progressNote.create({ data: { patientId: lucia.id, visitDate: day(-78), summary: "Control. Buena adherencia a la dieta libre de gluten.", agreements: "Control en 2 meses." } });

  const martin = await prisma.patient.create({
    data: { nutritionistId: user.id, fullName: "Martín Sosa", dni: "40222333", sex: "masculino", birthDate: "1997-07-09", phone: "11 3344-5566", diagnosis: "Deportista, busca ganar masa muscular", heightCm: 181 },
  });
  const carla = await prisma.patient.create({
    data: { nutritionistId: user.id, fullName: "Carla Benítez", dni: "33987654", sex: "femenino", birthDate: "1987-01-30", phone: "11 5890-1122", diagnosis: "Embarazo de 20 semanas", diabetesType: "gestacional", heightCm: 158 },
  });
  await prisma.glucoseReading.create({ data: { patientId: carla.id, value: 97, slot: "ayunas", measuredAt: day(-3, 8) } });

  const appointments = [
    [maria.id, day(-2, 10), 45, "Control mensual", "atendido"],
    [jorge.id, day(0, 9, 30), 45, "Control de glucemias", "programado"],
    [martin.id, day(0, 11), 60, "Primera consulta", "programado"],
    [maria.id, day(0, 16), 30, "Entrega de plan", "programado"],
    [carla.id, day(1, 10), 45, "Control de embarazo", "programado"],
    [jorge.id, day(3, 15), 45, "Revisión de laboratorio", "programado"],
    [maria.id, day(28, 10), 45, "Control mensual", "programado"],
  ];
  for (const [patientId, startsAt, durationMin, reason, status] of appointments) {
    await prisma.appointment.create({ data: { nutritionistId: user.id, patientId, startsAt, durationMin, reason, status } });
  }
  return { maria };
}

const OVERLAY = () => {
  const install = () => {
    if (document.getElementById("__rec_cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #__rec_cursor{position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
        background:rgba(20,40,32,.28);border:2px solid rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:none;
        transition:transform .12s ease, background .12s ease}
      #__rec_cursor.down{transform:scale(.7);background:rgba(52,168,110,.55)}
      #__rec_caption{position:fixed;z-index:2147483646;left:50%;bottom:34px;transform:translateX(-50%) translateY(12px);opacity:0;
        max-width:980px;padding:16px 28px;border-radius:18px;background:rgba(12,30,24,.92);color:#fff;text-align:center;
        font:500 21px/1.4 "Segoe UI",system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(6px);
        transition:opacity .35s ease, transform .35s ease;pointer-events:none}
      #__rec_caption.show{opacity:1;transform:translateX(-50%) translateY(0)}
      #__rec_caption small{display:block;margin-bottom:4px;font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#7ed8a6}
      nextjs-portal{display:none!important}`;
    document.documentElement.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "__rec_cursor";
    cursor.style.transform = "";
    document.documentElement.appendChild(cursor);
    const saved = sessionStorage.getItem("__rec_pos");
    if (saved) {
      const [x, y] = saved.split(",");
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
    }
    addEventListener("mousemove", (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
      sessionStorage.setItem("__rec_pos", e.clientX + "," + e.clientY);
    }, true);
    addEventListener("mousedown", () => cursor.classList.add("down"), true);
    addEventListener("mouseup", () => cursor.classList.remove("down"), true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

async function main() {
  const ffmpeg = findFfmpeg();
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });

  console.log("Preparando consultorio de demostración...");
  const { maria } = await seed();

  const browser = await chromium.launch({ executablePath: findChrome(), headless: true, args: [`--window-size=${WIDTH},${HEIGHT}`, "--lang=es-AR"] });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale: "es-AR", timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();

  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = join(FRAMES, `${String(frames.length).padStart(6, "0")}.jpg`);
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, ts: metadata.timestamp ?? Date.now() / 1000 });
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId });
    } catch {}
  });

  let caption = null;
  async function say(title, text, hold = 0) {
    caption = { title, text };
    await page.evaluate(({ title, text }) => {
      let el = document.getElementById("__rec_caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "__rec_caption";
        document.documentElement.appendChild(el);
      }
      el.classList.remove("show");
      setTimeout(() => {
        el.innerHTML = (title ? `<small>${title}</small>` : "") + text;
        el.classList.add("show");
      }, 180);
    }, caption);
    await sleep(500 + hold);
  }
  async function restoreCaption() {
    if (!caption) return;
    await page.evaluate(({ title, text }) => {
      if (document.getElementById("__rec_caption")) return;
      const el = document.createElement("div");
      el.id = "__rec_caption";
      el.className = "show";
      el.innerHTML = (title ? `<small>${title}</small>` : "") + text;
      document.documentElement.appendChild(el);
    }, caption);
  }
  async function hideCaption() {
    caption = null;
    await page.evaluate(() => document.getElementById("__rec_caption")?.classList.remove("show"));
    await sleep(350);
  }

  let mouse = { x: WIDTH / 2, y: HEIGHT / 2 };
  async function moveTo(x, y, steps = 28) {
    const from = { ...mouse };
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      await page.mouse.move(from.x + (x - from.x) * ease, from.y + (y - from.y) * ease);
      await sleep(12);
    }
    mouse = { x, y };
  }
  async function pointAt(locator, pause = 250) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error("Elemento no visible");
    await moveTo(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(pause);
  }
  async function click(locator, pause = 700) {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await pointAt(locator);
    await page.mouse.down();
    await sleep(90);
    await page.mouse.up();
    await sleep(pause);
  }
  async function type(locator, text, delay = 55) {
    await click(locator, 200);
    await locator.pressSequentially(text, { delay });
    await sleep(300);
  }
  async function scrollBy(total, duration = 1400) {
    const steps = Math.max(10, Math.round(duration / 30));
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, total / steps);
      await sleep(duration / steps);
    }
    await sleep(250);
  }
  async function scrollTop() {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(700);
  }
  async function go(url) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    await page.mouse.move(mouse.x, mouse.y);
    await restoreCaption();
    await sleep(400);
  }
  async function tab(name) {
    await scrollTop();
    await click(page.getByRole("button", { name, exact: true }), 900);
  }

  async function card(title, subtitle, extra = "") {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;height:100%;font-family:"Segoe UI",system-ui,sans-serif}
      body{display:grid;place-items:center;background:radial-gradient(1200px 700px at 80% -10%,rgba(52,168,110,.35),transparent 60%),radial-gradient(900px 600px at -10% 110%,rgba(126,216,166,.18),transparent 60%),#0c1e18;color:#fff}
      .wrap{text-align:center;animation:in .9s ease both}
      .logo{width:84px;height:84px;margin:0 auto 26px;border-radius:24px;background:#34a86e;display:grid;place-items:center;box-shadow:0 20px 60px rgba(52,168,110,.45)}
      h1{margin:0;font-size:64px;font-weight:600;letter-spacing:-.02em}
      p{margin:14px 0 0;font-size:24px;color:rgba(255,255,255,.72)}
      .extra{margin-top:34px;font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:#7ed8a6}
      @keyframes in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    </style></head><body><div class="wrap">
      <div class="logo"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg></div>
      <h1>${title}</h1><p>${subtitle}</p>${extra ? `<div class="extra">${extra}</div>` : ""}
    </div></body></html>`);
  }

  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });

  console.log("Grabando...");
  await card("NutriIPS", "Toda la consulta nutricional, en un solo lugar.", "Recorrido por el sistema");
  await sleep(3800);

  await go("/");
  await say("Acceso seguro", "Cada profesional entra con su usuario y solo ve sus propios pacientes.");
  await type(page.getByLabel("Email"), EMAIL, 28);
  await type(page.getByLabel("Clave"), PASSWORD, 40);
  await click(page.getByRole("button", { name: "Ingresar" }), 300);
  await page.waitForURL("**/panel", { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await restoreCaption();

  await say("Inicio", "El tablero del día: turnos de hoy, próximos turnos y un resumen del consultorio.", 2600);
  await scrollBy(520, 1800);
  await say("Inicio", "Detecta solo a quién prestarle atención: alertas clínicas y pacientes sin control hace más de 60 días.", 3200);
  await scrollBy(600, 1800);
  await sleep(1200);
  await scrollTop();

  await say("Buscador", "Con Ctrl + K se busca cualquier paciente por nombre, DNI o teléfono, desde cualquier pantalla.");
  await page.keyboard.press("Control+k");
  await sleep(700);
  await page.getByPlaceholder("Nombre, DNI o teléfono...").pressSequentially("maría", { delay: 120 });
  await sleep(1100);
  await page.keyboard.press("Enter");
  await page.waitForURL(`**/panel/pacientes/${maria.id}`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await restoreCaption();
  await sleep(600);

  await say("Ficha del paciente · Resumen", "Cada indicador muestra cuánto cambió desde el control anterior, en verde si mejoró.", 2800);
  await scrollBy(430, 1600);
  await say("Ficha del paciente · Resumen", "Alertas automáticas con criterios ADA, OMS y ASPEN, y el requerimiento energético calculado.", 3200);
  await scrollBy(560, 1800);
  await sleep(1800);

  await tab("Evolución");
  await say("Evolución", "Gráficos de peso, IMC, grasa, cintura, glucemia y HbA1c, con la franja del rango saludable.", 1200);
  await scrollBy(300, 1000);
  const chart = page.locator("svg.h-auto.w-full").first();
  const box = await chart.boundingBox();
  if (box) {
    for (const f of [0.15, 0.4, 0.65, 0.95]) {
      await moveTo(box.x + box.width * f, box.y + box.height * 0.45, 18);
      await sleep(650);
    }
  }
  await scrollBy(1400, 3000);
  await sleep(1000);

  await tab("Consultas");
  await say("Consultas", "La nota de evolución de cada consulta, con plantilla SOAP y las mediciones insertadas en un clic.");
  await click(page.getByRole("button", { name: "Insertar mediciones" }), 900);
  await type(page.getByLabel("Acuerdos con el paciente"), "Sumar 2 días de fuerza. Mantener las cenas livianas.", 30);
  await type(page.getByLabel("Próximo control"), "En 30 días", 45);
  await click(page.getByRole("button", { name: "Guardar evolución" }), 1500);
  await say("Consultas", "Queda registrada en la historia clínica, ordenada por fecha.", 1000);
  await scrollBy(700, 1800);
  await sleep(1400);

  await tab("Anamnesis");
  await say("Anamnesis", "Anamnesis alimentaria completa y versionada: cada cambio guarda una versión nueva sin perder la anterior.", 1200);
  await scrollBy(1500, 3600);
  await sleep(1200);

  await tab("Antropometría");
  await say("Antropometría ISAK", "Perfil ISAK con pliegues, perímetros y diámetros. Se puede partir de la última medición.");
  await click(page.getByRole("button", { name: "Copiar última" }), 900);
  await say("Antropometría ISAK", "Los resultados se calculan en vivo: IMC, % de grasa Durnin-Siri, área muscular y riesgo por cintura.", 2600);
  await scrollBy(420, 1400);
  await sleep(1400);

  await tab("Bioimpedancia");
  await say("Bioimpedancia", "Lecturas de la balanza Omron con su interpretación y la comparación con Mifflin-St Jeor.", 2400);
  await scrollBy(600, 1800);
  await sleep(900);

  await tab("Glucosa y laboratorio");
  await say("Glucosa y laboratorio", "Glucemias por momento del día y análisis de laboratorio, marcados según los rangos de referencia.", 2400);
  await scrollBy(700, 2000);
  await sleep(900);

  await tab("Plan alimentario");
  await say("Plan alimentario", "El sistema arma una propuesta según el diagnóstico, los objetivos y las alergias del paciente.", 2800);
  await scrollBy(430, 1500);
  await say("Plan alimentario", "Meta calórica calculada y distribución de macronutrientes en gramos por día.", 2600);
  await scrollBy(700, 2200);
  await say("Plan alimentario", "Comidas del día totalmente editables, lista de compras y recomendaciones.", 2200);
  await scrollBy(700, 2000);
  const savePlan = page.getByRole("button", { name: "Guardar plan" });
  await click(savePlan, 1600);

  await go(`/imprimir/${maria.id}/plan`);
  await say("Plan para el paciente", "Listo para imprimir o enviar en PDF, con el membrete del consultorio.", 2800);
  await scrollBy(700, 2400);
  await sleep(1200);

  await go(`/imprimir/${maria.id}/informe`);
  await say("Informe nutricional", "Informe profesional para derivaciones: evolución, hallazgos, mediciones y laboratorio.", 2800);
  await scrollBy(900, 2600);
  await sleep(1000);
  await scrollBy(1100, 2600);
  await sleep(1200);

  await go("/panel/agenda");
  await say("Agenda", "Agenda semanal con el estado de cada turno: programado, atendido, ausente o cancelado.", 2600);
  await click(page.getByRole("button", { name: "Nuevo turno" }), 900);
  await say("Agenda", "Agendar un turno lleva segundos, y el sistema avisa si se superpone con otro.");
  const dialog = page.getByRole("dialog");
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 2, null, { timeout: 10000 });
  await pointAt(dialog.getByLabel("Paciente"));
  await dialog.getByLabel("Paciente").selectOption({ label: "Lucía Fernández" });
  await sleep(600);
  const tomorrow = day(1);
  const pad = (n) => String(n).padStart(2, "0");
  await pointAt(dialog.getByLabel("Fecha"));
  await dialog.getByLabel("Fecha").fill(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
  await pointAt(dialog.getByLabel("Hora"));
  await dialog.getByLabel("Hora").fill("12:30");
  await sleep(400);
  await type(dialog.getByLabel("Motivo"), "Control de celiaquía", 45);
  await click(dialog.getByRole("button", { name: "Agendar" }), 1400);
  const tomorrowButton = page.getByRole("button", { name: new RegExp(`^\\S+ ${tomorrow.getDate()}$`) });
  if (await tomorrowButton.count()) await click(tomorrowButton.first(), 1400);
  await sleep(1200);

  await go("/panel/pacientes");
  await say("Pacientes", "Listado con buscador, filtros por condición o alertas y orden por nombre o por última consulta.", 2400);
  await click(page.getByRole("button", { name: "Con alertas" }).first(), 1600);
  await click(page.getByRole("button", { name: "Todos" }).first(), 1200);

  await go("/panel/ajustes");
  await say("Ajustes", "Datos profesionales para el membrete, cambio de clave y respaldo de toda la información en un clic.", 3200);
  await scrollBy(500, 1600);
  await sleep(1600);
  await hideCaption();

  await card("NutriIPS", "Tu consultorio de nutrición, ordenado y profesional.", "Datos guardados en tu equipo · Informes en PDF · Agenda integrada");
  await sleep(4200);

  await cdp.send("Page.stopScreencast");
  await sleep(300);
  await browser.close();

  if (frames.length < 2) throw new Error("No se capturaron cuadros");
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1];
    const duration = next ? Math.max(0.001, next.ts - frames[i].ts) : 0.5;
    lines.push(`file '${frames[i].file.replace(/\\/g, "/")}'`, `duration ${duration.toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, "/")}'`);
  const list = join(FRAMES, "list.txt");
  writeFileSync(list, lines.join("\n"));

  console.log(`Codificando ${frames.length} cuadros...`);
  const encode = spawnSync(
    ffmpeg,
    ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", `fps=30,scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", OUTPUT],
    { stdio: "inherit" }
  );
  if (encode.status !== 0) throw new Error("ffmpeg no pudo generar el video");
  rmSync(FRAMES, { recursive: true, force: true });
  console.log("Video listo:", OUTPUT);
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
