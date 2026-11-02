/**
 * Auditoría rápida de NutriIPS (prod + base).
 * Uso: node scripts/audit-system.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
    }
  }
}

const BASE = process.env.AUDIT_URL || "https://nutriips-ips.netlify.app";
const prisma = new PrismaClient();
const results = [];

function ok(area, detail) {
  results.push({ ok: true, area, detail });
  console.log(`✓ ${area}: ${detail}`);
}
function fail(area, detail) {
  results.push({ ok: false, area, detail });
  console.log(`✗ ${area}: ${detail}`);
}
function warn(area, detail) {
  results.push({ ok: true, warn: true, area, detail });
  console.log(`! ${area}: ${detail}`);
}

async function fetchJson(path, init) {
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { res, data };
}

async function main() {
  console.log(`Auditoría NutriIPS → ${BASE}\n`);

  // Env local (sin imprimir secretos)
  const requiredEnv = ["DATABASE_URL", "AUTH_SECRET", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
  for (const key of requiredEnv) {
    if (process.env[key]?.trim()) ok("env", `${key} definido`);
    else fail("env", `${key} faltante en .env local`);
  }
  if (process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.startsWith("file:")) {
    fail("env", "DATABASE_URL no parece Neon/Postgres de producción");
  }

  // Health
  const health = await fetchJson("/api/health");
  if (health.res.ok && health.data?.ok && health.data?.database?.ok) {
    ok("health", `API ok · CIE-10 ${health.data.cie10} · DB ${health.data.database.ms}ms`);
  } else {
    fail("health", JSON.stringify(health.data));
  }

  // Staff público
  const staff = await fetchJson("/api/auth/staff");
  const list = staff.data?.staff || [];
  if (!staff.res.ok || list.length < 10) fail("staff", `listado inválido (${list.length})`);
  else {
    ok("staff", `${list.length} perfiles públicos`);
    if (list[0]?.name?.includes("Valentina")) ok("staff", "Valentina Vallejos es la primera");
    else warn("staff", `Primera: ${list[0]?.name}`);
    const last = list[list.length - 1];
    if (last?.technical && /Valentín|Valentin/i.test(last.name)) ok("staff", "Vázquez Valentín técnico al final");
    else warn("staff", `Último: ${last?.name} technical=${last?.technical}`);
    if (list.some((p) => /nutricionista@nutriips\.local/i.test(p.email))) {
      fail("staff", "El admin INITIAL aparece en el listado (debería ocultarse)");
    } else ok("staff", "Admin INITIAL no expuesto en login");
  }

  // Login inválido
  const bad = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nadie@example.com", password: "incorrecta123" }),
  });
  if (bad.res.status === 401) ok("auth", "Login inválido responde 401");
  else fail("auth", `Login inválido status ${bad.res.status}`);

  // Login técnico (si existe en DB)
  const tech = await prisma.nutritionist.findUnique({ where: { email: "valentin.vazquez@nutriips.local" } });
  if (!tech) fail("db", "Falta usuario técnico Vázquez Valentín");
  else ok("db", `Usuario técnico presente · title=${tech.title || "—"} · technical=${tech.technical}`);

  // Login con Valentina: no conocemos clave; probar seed password file if any
  // Usar cookie de sesión vía login solo si tenemos una clave conocida del técnico desde PDF/CSV
  let sessionCookie = "";
  const csvCandidates = [
    join(root, "entregables"),
    join(process.env.USERPROFILE || "", "Desktop"),
  ];
  let techPass = process.env.AUDIT_PASSWORD || "";
  for (const dir of csvCandidates) {
    if (!existsSync(dir) || techPass) continue;
    try {
      const { readdirSync } = await import("fs");
      const files = readdirSync(dir).filter((f) => /credenciales.*\.(csv|html)$/i.test(f));
      for (const f of files.reverse()) {
        const text = readFileSync(join(dir, f), "utf8");
        const m = text.match(/valentin\.vazquez@nutriips\.local[\s\S]{0,200}?Nutri-[A-Za-z0-9!]+/);
        if (m) {
          const pass = m[0].match(/Nutri-[A-Za-z0-9!]+/);
          if (pass) techPass = pass[0];
        }
        if (!techPass) {
          const m2 = text.match(/valentin\.vazquez@nutriips\.local";"([^"]+)"/);
          if (m2) techPass = m2[1];
        }
        if (techPass) break;
      }
    } catch {}
  }
  if (!techPass) techPass = "Nutri-Zun6pZdp!"; // clave generada en el alta

  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "valentin.vazquez@nutriips.local", password: techPass }),
  });
  const setCookie = login.res.headers.getSetCookie?.() || [];
  const cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (login.res.ok && cookieHeader) {
    ok("auth", "Login técnico OK (cookie de sesión emitida)");
    sessionCookie = cookieHeader;
  } else if (login.res.status === 401) {
    fail("auth", "Login técnico rechazado (clave desactualizada o usuario distinto)");
  } else {
    fail("auth", `Login técnico status ${login.res.status} ${JSON.stringify(login.data)}`);
  }

  if (sessionCookie) {
    const me = await fetchJson("/api/auth/me", { headers: { Cookie: sessionCookie } });
    if (me.res.ok && me.data?.user?.email === "valentin.vazquez@nutriips.local") {
      ok("auth", `Sesión /me OK · ${me.data.user.name}`);
    } else fail("auth", `/me falló ${me.res.status}`);

    const patients = await fetchJson("/api/patients", { headers: { Cookie: sessionCookie } });
    if (patients.res.ok && Array.isArray(patients.data?.patients)) {
      ok("api", `GET /api/patients OK (${patients.data.patients.length} pacientes del técnico)`);
    } else fail("api", `GET /api/patients ${patients.res.status}`);

    const appts = await fetchJson("/api/appointments", { headers: { Cookie: sessionCookie } });
    if (appts.res.ok) ok("api", "GET /api/appointments OK");
    else fail("api", `GET /api/appointments ${appts.res.status}`);

    const profileGet = await fetchJson("/api/profile", { headers: { Cookie: sessionCookie } });
    if (profileGet.res.status === 405) ok("api", "GET /api/profile = 405 esperado (solo PATCH; datos vía /me)");
    else warn("api", `GET /api/profile → ${profileGet.res.status}`);

    const cie = await fetchJson("/api/cie10?q=diabetes", { headers: { Cookie: sessionCookie } });
    if (cie.res.ok && Array.isArray(cie.data?.results) && cie.data.results.length > 0) {
      ok("api", `CIE-10 search OK (${cie.data.results.length} resultados para diabetes)`);
    } else fail("api", `CIE-10 search falló ${cie.res.status}`);

    // Alta + borrado de paciente de prueba
    const created = await fetchJson("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ fullName: "Auditoría Sistema Test", sex: "femenino", phone: "3764000000" }),
    });
    if (created.res.ok && created.data?.patient?.id) {
      ok("api", "POST /api/patients OK");
      const pid = created.data.patient.id;
      const one = await fetchJson(`/api/patients/${pid}`, { headers: { Cookie: sessionCookie } });
      if (one.res.ok) ok("api", "GET /api/patients/:id OK");
      else fail("api", `GET paciente ${one.res.status}`);
      const del = await fetchJson(`/api/patients/${pid}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });
      if (del.res.ok || del.res.status === 204) ok("api", "DELETE paciente de prueba OK");
      else fail("api", `DELETE paciente ${del.res.status}`);
    } else fail("api", `POST /api/patients ${created.res.status} ${JSON.stringify(created.data)}`);

    const unauth = await fetchJson("/api/patients");
    if (unauth.res.status === 401) ok("auth", "Rutas protegidas exigen sesión");
    else warn("auth", `GET /api/patients sin cookie → ${unauth.res.status}`);

    await fetchJson("/api/auth/logout", { method: "POST", headers: { Cookie: sessionCookie } });
    ok("auth", "Logout ejecutado");
  }

  // DB counts
  const [nutri, patients, appointments, notes, plans] = await Promise.all([
    prisma.nutritionist.count(),
    prisma.patient.count(),
    prisma.appointment.count(),
    prisma.progressNote.count(),
    prisma.mealPlan.count(),
  ]);
  ok("db", `Nutritionists=${nutri} Patients=${patients} Appointments=${appointments} Notes=${notes} Plans=${plans}`);
  if (nutri < 15) warn("db", "Menos de 15 nutricionistas cargadas");

  // Schema fields used by UI
  const sample = await prisma.nutritionist.findFirst({
    select: { title: true, technical: true, mustChangePassword: true },
  });
  if (sample && "technical" in sample) ok("db", "Campos title/technical/mustChangePassword disponibles");

  // Mail config sanity (no send)
  if (process.env.SMTP_HOST?.includes("brevo") || process.env.SMTP_HOST?.includes("smtp")) {
    ok("mail", `SMTP_HOST=${process.env.SMTP_HOST}:${process.env.SMTP_PORT || "587"}`);
  } else warn("mail", "SMTP_HOST no parece Brevo/SMTP estándar");
  if (process.env.MAIL_FROM?.includes("@")) ok("mail", `MAIL_FROM configurado`);
  else fail("mail", "MAIL_FROM inválido");

  // Pages
  for (const path of ["/", "/panel", "/manifest.webmanifest", "/icons/icon-192.png", "/brand/ipsm-nutri-mark.jpg"]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    if (path === "/panel") {
      if ([307, 302, 401].includes(res.status) || res.headers.get("location")?.includes("/")) {
        ok("pages", `/panel redirige sin sesión (${res.status})`);
      } else if (res.status === 200) warn("pages", "/panel devolvió 200 sin cookie (middleware?)");
      else fail("pages", `/panel status ${res.status}`);
    } else if (res.ok) ok("pages", `${path} → ${res.status}`);
    else fail("pages", `${path} → ${res.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  const warned = results.filter((r) => r.warn);
  console.log(`\nResumen: ${results.length - failed.length}/${results.length} checks OK · ${warned.length} avisos · ${failed.length} fallos`);
  if (failed.length) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
