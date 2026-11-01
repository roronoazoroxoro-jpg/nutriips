# Puesta en marcha: Neon (base) + Netlify (web)

## 1. Cuenta Gmail nueva (lo hacés vos)

Google no permite crear Gmail por script. Creá una cuenta en:

https://accounts.google.com/signup

Ejemplo sugerido: `nutriips.departamento@gmail.com` (o el que prefieras).

Con esa cuenta vas a entrar a Neon y a Netlify.

## 2. Base PostgreSQL en Neon (gratis)

1. Entrá a https://console.neon.tech con el Gmail nuevo.
2. Create project → nombre `nutriips`.
3. En **Connection details** copiá:
   - **Pooled connection** → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`
4. Pegá ambas en el archivo `.env` del proyecto (reemplazando el SQLite).

Luego en la PC del proyecto:

```bash
npx prisma generate
npx prisma db push
node scripts/import-export.mjs
# o, si preferís solo recrear usuarios:
npm run db:staff
```

## 3. Netlify (hosting)

1. Entrá a https://app.netlify.com con el mismo Gmail.
2. Add new site → Import from Git → elegí `roronoazoroxoro-jpg/nutriips`.
3. Build settings (ya están en `netlify.toml`):
   - Build command: lo define el toml
   - Publish: `.next` (plugin Next)
4. Site settings → Environment variables:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | pooled de Neon |
| `DIRECT_URL` | direct de Neon |
| `AUTH_SECRET` | cadena larga aleatoria |
| `COOKIE_SECURE` | `true` |
| `CLINIC_NAME` | `Departamento de Nutrición · IPS` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | Gmail del departamento |
| `SMTP_PASS` | Contraseña de aplicación de Gmail |
| `MAIL_FROM_NAME` | `Departamento de Nutrición · IPS` |

5. Deploy.

## 3b. Correo a pacientes (Gmail)

1. En la cuenta Gmail del departamento activá **verificación en 2 pasos**.
2. Creá una **contraseña de aplicaciones**: https://myaccount.google.com/apppasswords  
   Nombre: `NutriIPS`.
3. Pegá esa clave en `SMTP_PASS` (local `.env` y Netlify).
4. En la ficha del paciente → **Plan alimentario** → **Enviar por Gmail**.

## 4. Datos en la PC de cada nutricionista

- La **nube (Neon)** guarda todo sincronizado al trabajar online.
- En **Ajustes → Guardar en esta PC** cada profesional descarga **solo sus pacientes** (JSON).
- Recomendado: 1 vez por semana.

## 5. Comprobar

Abrí `https://nutriips-ips.netlify.app/api/health`  
Debe responder `"ok": true` y `database.ok: true`.
