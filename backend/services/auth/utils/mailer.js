import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

const renderHtml = (code, minutes) => `
<div style="background:#05050a;padding:40px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#12121a;border:1px solid #26263a;border-radius:16px;padding:32px;">
    <p style="margin:0 0 24px;color:#a5b4fc;font-size:13px;font-weight:600;letter-spacing:4px;">ANTRAL</p>
    <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;">Your sign-in code</h1>
    <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.5;">
      Enter this code on the Antral sign-in page. It expires in ${minutes} minutes.
    </p>
    <p style="margin:0 0 24px;padding:16px;background:#05050a;border:1px solid #2e2e48;border-radius:12px;text-align:center;color:#ffffff;font-family:Consolas,Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:8px;">
      ${code}
    </p>
    <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
      If you didn't try to sign in, you can ignore this email.
    </p>
  </div>
</div>`;

export const sendVerificationEmail = async (email, code, minutes) => {
  const mailer = getTransporter();

  if (!mailer) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured. Set SMTP_HOST in the auth service .env.");
    }
    console.warn(`[dev] SMTP is not configured. Sign-in code for ${email}: ${code}`);
    return;
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: `${code} is your Antral sign-in code`,
    text: `Your Antral sign-in code is ${code}. It expires in ${minutes} minutes.\n\nIf you didn't try to sign in, you can ignore this email.`,
    html: renderHtml(code, minutes),
  });
};
