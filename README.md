# NutriIPS · Departamento de Nutrición IPS

Consultorio digital para nutricionistas: fichas, anamnesis, ISAK, Omron, laboratorio, plan alimentario, agenda e informes PDF. Cada profesional solo ve sus propios pacientes.

## Enlaces

- **Código:** se publica en GitHub al desplegar (ver sección Deploy).
- **App en el escritorio:** doble clic en `Instalar NutriIPS.bat` (también en el Escritorio). Abre NutriIPS como ventana de aplicación (Edge/Chrome).
- **Instalar como app (PWA):** en Edge/Chrome → menú ⋮ → *Instalar aplicación* / *Aplicaciones → Instalar esta página*.

## Personal cargado

Las nutricionistas del archivo `DATOS DEPARTAMENTO DE NUTRICION.docx` están en `prisma/staff.json`.

```bash
npm run db:seed -- --reset-passwords
```

Eso crea o reinicia las cuentas y genera un CSV con las claves en el **Escritorio** (`NutriIPS-credenciales-….csv`) y en `entregables/` (no se sube a Git).

**Pendiente:** María Laura Melgarejo (tel. 3764538520) no tenía correo en el Word. Ver `entregables/PENDIENTES.md`.

En el primer ingreso el sistema **obliga a cambiar la clave**.

## Requisitos

- Node.js 20+

## Instalación local

```bash
npm install
copy .env.example .env
npm run setup
npm run db:seed -- --reset-passwords
npm run build
npm start
```

Abrir [http://localhost:3010](http://localhost:3010).

Desarrollo: `npm run dev`.

## Base de datos

- **Local:** SQLite (`prisma/dev.db`) — ideal para el consultorio sin internet.
- **Producción (Vercel):** PostgreSQL (Neon). Pasos:

  1. Creá un proyecto gratis en [neon.tech](https://neon.tech) (login con GitHub).
  2. Copiá el *connection string* (pooled / Prisma).
  3. En el proyecto:

```bash
node scripts/switch-to-postgres.mjs
```

  4. En `.env` y en Vercel → *Settings → Environment Variables*:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=<generá uno largo>
COOKIE_SECURE=true
CLINIC_NAME=Departamento de Nutrición · IPS
```

  5. `npx prisma db push` y `npm run db:seed -- --reset-passwords`
  6. Redeploy en Vercel.

## Deploy (GitHub + Vercel)

```bash
# ya está preparado el repo; si hace falta:
git add -A
git commit -m "NutriIPS listo para entrega"
git push -u origin main
vercel --prod
```

Variables obligatorias en Vercel: `DATABASE_URL`, `AUTH_SECRET`.

Tras el primer deploy, ejecutá el seed contra la base de producción (con `DATABASE_URL` apuntando a Neon).

## Qué incluye el sistema

Inicio con alertas y turnos · Pacientes (Ctrl+K) · Resumen, evolución, consultas SOAP, anamnesis versionada, ISAK, Omron, laboratorio · Plan alimentario · Agenda · Informes imprimibles · Ajustes (membrete, clave, respaldo) · PWA instalable.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run setup` | Crea/actualiza la base |
| `npm run db:seed -- --reset-passwords` | Crea el staff y regenera claves |
| `npm run dev` / `npm start` | Desarrollo / producción local |
| `npm run backup` | Copia la base a `respaldos/` |
| `npm run demo` | Paciente de ejemplo |

## Aviso

Los cálculos y alertas son apoyo clínico. La indicación final es del profesional.
