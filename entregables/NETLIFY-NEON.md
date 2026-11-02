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
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | login SMTP de Brevo (`…@smtp-brevo.com`) |
| `SMTP_PASS` | SMTP key de Brevo |
| `MAIL_FROM` | `Departamento de Nutrición · IPS <ipsnutricionnutricion@gmail.com>` |
| `MAIL_FROM_NAME` | `Departamento de Nutrición · IPS` |

5. Deploy.

## 3b. Correo a pacientes (Brevo → From Gmail)

Gmail no deja crear contraseñas de aplicación sin teléfono/2FA. Usamos **Brevo** como SMTP; el remitente visible sigue siendo el Gmail del departamento.

1. Cuenta Brevo con `ipsnutricionnutricion@gmail.com` (ya creada).
2. Verificá el celular en Brevo (obligatorio para generar claves).
3. En https://app.brevo.com/settings/keys/smtp generá una **SMTP key**.
4. Pegá esa clave en `SMTP_PASS` (local `.env` y Netlify). Login SMTP: el que muestra Brevo.
5. En la ficha del paciente → **Plan alimentario** → **Enviar por Gmail**.

## 4. Datos en la PC de cada nutricionista

- La **nube (Neon)** guarda todo sincronizado al trabajar online.
- En **Ajustes → Guardar en esta PC** cada profesional descarga **solo sus pacientes** (JSON).
- Recomendado: 1 vez por semana.

## 5. Comprobar

Abrí `https://nutriips-ips.netlify.app/api/health`  
Debe responder `"ok": true` y `database.ok: true`.
