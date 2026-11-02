/**
 * Genera un PDF visual con las credenciales del staff a partir del CSV.
 * Uso: node scripts/credenciales-pdf.mjs [ruta-csv]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entregables = join(root, "entregables");
const desktop = process.env.USERPROFILE ? join(process.env.USERPROFILE, "Desktop") : root;
const stamp = new Date().toISOString().slice(0, 10);

function findCsv(explicit) {
  if (explicit && existsSync(explicit)) return explicit;
  const candidates = [
    ...readdirSync(entregables)
      .filter((name) => /^credenciales-nutricionistas-.*\.csv$/i.test(name))
      .map((name) => join(entregables, name)),
    ...readdirSync(desktop)
      .filter((name) => /^NutriIPS-credenciales-.*\.csv$/i.test(name))
      .map((name) => join(desktop, name)),
  ].sort();
  if (!candidates.length) throw new Error("No encontré CSV de credenciales. Corré: npm run db:staff");
  return candidates[candidates.length - 1];
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1);
  return lines
    .map((line) => {
      const cols = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = !inQ;
        } else if (ch === ";" && !inQ) {
          cols.push(cur);
          cur = "";
        } else cur += ch;
      }
      cols.push(cur);
      const [nombre, email, telefono, clave] = cols;
      if (!nombre || !email || !clave || clave === "(sin cambios)") return null;
      return { nombre, email, telefono: telefono || "—", clave };
    })
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(rows) {
  const cards = rows
    .map(
      (row, index) => `
      <article class="card">
        <div class="num">${String(index + 1).padStart(2, "0")}</div>
        <h2>${escapeHtml(row.nombre)}</h2>
        <dl>
          <div><dt>Usuario (email)</dt><dd>${escapeHtml(row.email)}</dd></div>
          <div><dt>Clave</dt><dd class="clave">${escapeHtml(row.clave)}</dd></div>
          <div><dt>Teléfono</dt><dd>${escapeHtml(row.telefono)}</dd></div>
        </dl>
      </article>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Credenciales NutriIPS</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #16352b;
      background: #faf8f4;
    }
    .sheet {
      background:
        radial-gradient(ellipse at top left, rgba(52,161,114,0.14), transparent 42%),
        radial-gradient(ellipse at bottom right, rgba(22,53,43,0.08), transparent 40%),
        #faf8f4;
      min-height: 100%;
      padding: 8px 4px 20px;
    }
    header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 2px solid #34a172;
      margin-bottom: 18px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 42px; height: 42px; border-radius: 12px; background: #34a172;
      display: grid; place-items: center; color: #e3f5ea; font-weight: 700; font-size: 18px;
    }
    h1 { margin: 0; font-size: 22px; letter-spacing: -0.02em; color: #0d1f18; }
    .sub { margin: 2px 0 0; font-size: 12px; color: #4a7a6a; }
    .meta { text-align: right; font-size: 11px; color: #4a7a6a; line-height: 1.45; }
    .banner {
      background: #16352b; color: #e3f5ea; border-radius: 12px;
      padding: 10px 14px; font-size: 12px; margin-bottom: 16px;
    }
    .banner strong { color: #96d6b3; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .card {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(13,31,24,0.08);
      border-radius: 14px;
      padding: 12px 12px 10px;
      break-inside: avoid;
      page-break-inside: avoid;
      position: relative;
    }
    .num {
      position: absolute; top: 10px; right: 12px;
      font-size: 11px; font-weight: 700; color: #96d6b3;
    }
    .card h2 {
      margin: 0 0 8px; font-size: 13.5px; color: #0d1f18;
      padding-right: 28px; line-height: 1.25;
    }
    dl { margin: 0; display: grid; gap: 6px; }
    dt {
      font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em;
      color: #6f9587; font-weight: 600;
    }
    dd {
      margin: 1px 0 0; font-size: 11.5px; color: #16352b;
      word-break: break-all;
    }
    dd.clave {
      font-family: Consolas, "Courier New", monospace;
      font-size: 12.5px; font-weight: 700;
      color: #157453; background: #f3faf6;
      border-radius: 6px; padding: 4px 6px; display: inline-block;
    }
    footer {
      margin-top: 18px; padding-top: 10px;
      border-top: 1px solid rgba(13,31,24,0.1);
      font-size: 10px; color: #6f9587; display: flex; justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">
        <div class="mark">N</div>
        <div>
          <h1>Credenciales NutriIPS</h1>
          <p class="sub">Departamento de Nutrición · IPS</p>
        </div>
      </div>
      <div class="meta">
        Documento interno · confidencial<br/>
        Generado: ${stamp}<br/>
        ${rows.length} profesionales
      </div>
    </header>
    <div class="banner">
      Ingreso: abrí <strong>https://nutriips-ips.netlify.app</strong>, tocá tu nombre e ingresá la clave
      (formato fácil: <strong>Nombre + 4 números</strong>, ej. Valentina4821).
      Podés cambiarla después en <strong>Ajustes</strong>.
    </div>
    <div class="grid">
      ${cards}
    </div>
    <footer>
      <span>NutriIPS · uso exclusivo del equipo de nutrición</span>
      <span>No reenviar fuera del departamento</span>
    </footer>
  </div>
</body>
</html>`;
}

async function findBrowser() {
  const local = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (local && existsSync(local)) return local;
  const candidates = [
    join(process.env.LOCALAPPDATA || "", "ms-playwright"),
    join(process.env.USERPROFILE || "", "AppData", "Local", "ms-playwright"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const path of candidates) {
    if (!path) continue;
    if (path.endsWith(".exe") && existsSync(path)) return path;
    if (!existsSync(path)) continue;
    try {
      const dirs = readdirSync(path).filter((name) => name.startsWith("chromium-"));
      for (const dir of dirs.sort().reverse()) {
        const exe = join(path, dir, "chrome-win64", "chrome.exe");
        if (existsSync(exe)) return exe;
        const exe2 = join(path, dir, "chrome-win", "chrome.exe");
        if (existsSync(exe2)) return exe2;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

const csvPath = findCsv(process.argv[2]);
const rows = parseCsv(readFileSync(csvPath, "utf8"));
if (!rows.length) throw new Error(`El CSV no tiene claves utilizables: ${csvPath}`);

mkdirSync(entregables, { recursive: true });
const htmlPath = join(entregables, `credenciales-nutricionistas-${stamp}.html`);
const pdfName = `NutriIPS-credenciales-${stamp}.pdf`;
const pdfEntregables = join(entregables, `credenciales-nutricionistas-${stamp}.pdf`);
const pdfDesktop = join(desktop, pdfName);
writeFileSync(htmlPath, buildHtml(rows), "utf8");

const executablePath = await findBrowser();
if (!executablePath) {
  console.log("HTML listo (sin Chromium para PDF):", htmlPath);
  console.log("Abrilo en el navegador → Imprimir → Guardar como PDF.");
  process.exit(0);
}

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfEntregables,
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", bottom: "10mm", left: "8mm", right: "8mm" },
});
await browser.close();
writeFileSync(pdfDesktop, readFileSync(pdfEntregables));

console.log("CSV:", csvPath);
console.log("PDF:", pdfEntregables);
console.log("Escritorio:", pdfDesktop);
console.log(`Filas: ${rows.length}`);
