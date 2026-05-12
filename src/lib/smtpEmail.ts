// Server-only — do not import in 'use client' components.
//
// School-email verification code sender.
//
// Uses SMTP (for example Gmail with an App Password) so the MVP can send
// .edu OTP emails without a verified transactional email domain.
import nodemailer from 'nodemailer';

const VERIFICATION_SUBJECT = 'Your NILINK school verification code';

function buildHtml(code: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">Verify your school email</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b">
        Enter the code below in the NILINK onboarding wizard to confirm your .edu address.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center">
        <span style="font-size:36px;font-weight:700;letter-spacing:0.15em;color:#0f172a">
          ${code}
        </span>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
        This code expires in 10&nbsp;minutes. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

async function sendViaSmtp(to: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM?.trim() || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // implicit TLS on 465, STARTTLS on 587
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: VERIFICATION_SUBJECT,
    html: buildHtml(code),
  });
}

export async function sendSchoolVerificationEmail(
  to: string,
  code: string,
): Promise<void> {
  try {
    await sendViaSmtp(to, code);
  } catch (err) {
    console.warn('[smtpEmail] SMTP failed:', err instanceof Error ? err.message : err);
    throw err;
  }
}
