import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  if (!transporter) {
    const missing = [
      !SMTP_HOST ? "SMTP_HOST" : null,
      !SMTP_PORT ? "SMTP_PORT" : null,
      !SMTP_USER ? "SMTP_USER" : null,
      !SMTP_PASS ? "SMTP_PASS" : null,
    ].filter(Boolean);
    console.warn("Mail transport not configured: missing", missing.join(", "));
  }
  return transporter;
}

export async function sendMail(to, subject, text, html) {
  try {
    const tx = getTransporter();
    if (!tx) {
      console.warn("Mail transport not configured; skipping email to", to);
      return { skipped: true };
    }
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const info = await tx.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return { messageId: info.messageId };
  } catch (err) {
    console.error("Email send error:", err.message);
    return { error: err.message };
  }
}

export async function verifyMailTransport() {
  try {
    const tx = getTransporter();
    if (!tx) {
      console.warn("Mail transport not configured");
      return false;
    }
    await tx.verify();
    console.log("Mail transport verified: SMTP connection OK");
    return true;
  } catch (err) {
    console.error("Mail transport verify failed:", err.message);
    return false;
  }
}
