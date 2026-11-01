import nodemailer from "nodemailer";

export function mailConfigured() {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

export function mailFrom() {
  const user = process.env.SMTP_USER?.trim() || "";
  const name = process.env.MAIL_FROM_NAME?.trim() || process.env.CLINIC_NAME?.trim() || "NutriIPS";
  return process.env.MAIL_FROM?.trim() || `"${name}" <${user}>`;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}) {
  if (!mailConfigured()) {
    throw new Error("Falta configurar el correo (SMTP_USER y SMTP_PASS).");
  }

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
  });

  await transporter.sendMail({
    from: mailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || undefined,
  });
}
