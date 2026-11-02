import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
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

const prisma = new PrismaClient();
const CLINIC = process.env.CLINIC_NAME || "Departamento de Nutrición · IPS";
const RESET = process.argv.includes("--reset-passwords");

/** Clave fácil de recordar: Nombre + 4 números (ej. Valentina4821). */
function easyFirstName(fullName) {
  const particles = new Set(["de", "del", "da", "das", "do", "dos", "la", "las", "los", "y", "e"]);
  const parts = String(fullName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const pick = parts.find((part) => part.length >= 4 && !particles.has(part.toLowerCase())) || parts[0] || "Nutri";
  return pick.charAt(0).toUpperCase() + pick.slice(1).toLowerCase().replace(/[^a-zA-Z]/g, "");
}

function makePassword(fullName) {
  const name = easyFirstName(fullName);
  const digits = String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
  return `${name}${digits}`;
}

const staffPath = join(root, "prisma", "staff.json");
const staff = JSON.parse(readFileSync(staffPath, "utf8"));

const rows = [];
let created = 0;
let updated = 0;
let unchanged = 0;

for (const person of staff) {
  const email = String(person.email || "")
    .trim()
    .toLowerCase();
  const name = String(person.name || "").trim();
  const phone = String(person.phone || "").replace(/[^\d]/g, "") || null;
  const title = String(person.title || "").trim() || null;
  const area = String(person.area || "").trim() || null;
  const manager = String(person.manager || "").trim() || null;
  const license = String(person.license || "").trim() || null;
  const technical = Boolean(person.technical) || person.role === "technical";
  const role = String(person.role || (technical ? "technical" : "nutritionist")).trim() || "nutritionist";
  if (!email || !name) {
    console.warn("Omitido (falta email o nombre):", person);
    continue;
  }

  const profile = {
    name,
    phone,
    title,
    area,
    manager,
    license,
    technical,
    role,
  };

  const existing = await prisma.nutritionist.findUnique({ where: { email } });
  if (!existing) {
    const password = makePassword(name);
    await prisma.nutritionist.create({
      data: {
        email,
        ...profile,
        clinicName: CLINIC,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: false,
      },
    });
    rows.push({ nombre: name, email, telefono: phone || "", clave: password, cargo: title || "", estado: "creado" });
    created++;
    console.log("Creado:", email);
  } else if (RESET) {
    const password = makePassword(name);
    await prisma.nutritionist.update({
      where: { id: existing.id },
      data: {
        ...profile,
        clinicName: existing.clinicName || CLINIC,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: false,
      },
    });
    rows.push({ nombre: name, email, telefono: phone || "", clave: password, cargo: title || "", estado: "clave_reiniciada" });
    updated++;
    console.log("Clave reiniciada:", email);
  } else {
    await prisma.nutritionist.update({
      where: { id: existing.id },
      data: {
        name,
        phone: phone || existing.phone,
        title,
        area,
        manager,
        license: license || existing.license,
        technical,
        role,
        clinicName: existing.clinicName || CLINIC,
      },
    });
    rows.push({ nombre: name, email, telefono: phone || existing.phone || "", clave: "(sin cambios)", cargo: title || "", estado: "ya_existia" });
    unchanged++;
    console.log("Actualizado perfil (clave intacta):", email);
  }
}

// Admin / responsable de puesta en marcha (solo si no existe)
const adminEmail = (process.env.INITIAL_EMAIL || "nutricionista@nutriips.local").toLowerCase();
const adminPassword = process.env.INITIAL_PASSWORD || "NutriIPS2026!";
const adminName = process.env.INITIAL_NAME || "Administración NutriIPS";
let admin = await prisma.nutritionist.findUnique({ where: { email: adminEmail } });
if (!admin) {
  admin = await prisma.nutritionist.create({
    data: {
      email: adminEmail,
      name: adminName,
      clinicName: CLINIC,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      mustChangePassword: true,
    },
  });
  rows.push({ nombre: adminName, email: adminEmail, telefono: "", clave: adminPassword, estado: "admin_creado" });
  console.log("Admin creado:", adminEmail);
} else {
  console.log("Admin existente:", adminEmail);
}

const orphans = await prisma.patient.updateMany({
  where: { nutritionistId: null },
  data: { nutritionistId: admin.id },
});
if (orphans.count) console.log(`Pacientes huérfanos asignados a ${adminEmail}:`, orphans.count);

const outDir = join(root, "entregables");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const csvPath = join(outDir, `credenciales-nutricionistas-${stamp}.csv`);
const header = "nombre;email;telefono;clave;cargo;estado";
const body = rows
  .map((r) => [r.nombre, r.email, r.telefono, r.clave, r.cargo || "", r.estado].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
  .join("\n");
writeFileSync(csvPath, "\uFEFF" + header + "\n" + body, "utf8");

const desktopCopy = join(process.env.USERPROFILE || root, "Desktop", `NutriIPS-credenciales-${stamp}.csv`);
try {
  writeFileSync(desktopCopy, "\uFEFF" + header + "\n" + body, "utf8");
  console.log("Credenciales en Escritorio:", desktopCopy);
} catch {
  console.log("No se pudo copiar al Escritorio");
}

console.log("---");
console.log(`Staff: ${created} creados, ${updated} reiniciados, ${unchanged} existentes`);
console.log("CSV:", csvPath);
if (!RESET && unchanged) {
  console.log("Tip: para regenerar claves de todos usá: npm run db:seed -- --reset-passwords");
}

await prisma.$disconnect();
