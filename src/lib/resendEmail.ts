// Server-only — do not import in 'use client' components.
//
// School-email verification code sender. Falls back through providers in
// order of preference so the onboarding flow never breaks if one is
// misconfigured:
//
//   1. SMTP (e.g. Gmail with an App Password) — works to any recipient,
//      no domain verification required. Recommended for production demos.
//   2. Resend — only works to the account owner unless a domain is
//      verified at resend.com/domains.
//   3. Console log — last-resort dev fallback so the code is always at
//      least retrievable from the Vercel logs.
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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

async function sendViaSmtp(to: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return false;

  const port = Number(process.env.SMTP_PORT || 465);
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
  return true;
}

async function sendViaResend(to: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';
  const { error } = await resend.emails.send({
    from,
    to,
    subject: VERIFICATION_SUBJECT,
    html: buildHtml(code),
  });
  if (error) {
    // Resend sandbox restriction will land here when sending to a non-owner.
    // Don't throw — let the caller fall through to other providers/logs.
    console.warn('[resendEmail] Resend rejected:', error.message);
    return false;
  }
  return true;
}

export async function sendSchoolVerificationEmail(
  to: string,
  code: string,
): Promise<void> {
  // Try SMTP first (works to any recipient with Gmail App Password).
  try {
    if (await sendViaSmtp(to, code)) return;
  } catch (err) {
    console.warn('[resendEmail] SMTP failed:', err instanceof Error ? err.message : err);
  }

  // Fall back to Resend (limited to account owner unless a domain is verified).
  try {
    if (await sendViaResend(to, code)) return;
  } catch (err) {
    console.warn('[resendEmail] Resend failed:', err instanceof Error ? err.message : err);
  }

  // Last resort: surface the code in the server log so onboarding isn't
  // blocked in dev / sandbox environments. NEVER reach this branch in real
  // production — both providers above should succeed.
  console.warn(
    `[resendEmail] No email provider succeeded. Verification code for ${to}: ${code}`,
  );
  throw new Error(
    'Email delivery is not configured. Set SMTP_* or verify a domain on Resend.',
  );
}
