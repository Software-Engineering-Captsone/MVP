// Server-only — do not import in 'use client' components.
import { Resend } from 'resend';

export async function sendSchoolVerificationEmail(
  to: string,
  code: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);
  // Use Resend's default verified sender for dev if a custom domain sender is not configured.
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';
  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Your NILINK school verification code',
    html: `
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
    `,
  });

  if (error) {
    throw new Error(error.message || 'Resend failed to send email');
  }
}
