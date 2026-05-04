import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { sendSchoolVerificationEmail } from '@/lib/resendEmail';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email.endsWith('.edu')) {
    return NextResponse.json({ error: 'Email must be a .edu address' }, { status: 400 });
  }

  const service = createServiceClient();

  // Rate limit: one request per 60 seconds
  const { data: recent } = await service
    .from('school_email_verifications')
    .select('id')
    .eq('athlete_id', user.id)
    .eq('email', email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .gt('created_at', new Date(Date.now() - 60_000).toISOString())
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: 'Please wait before requesting another code' },
      { status: 429 },
    );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await service
    .from('school_email_verifications')
    .insert({ athlete_id: user.id, email, code, expires_at: expiresAt });

  if (insertErr) {
    return NextResponse.json({ error: 'Failed to create verification code' }, { status: 500 });
  }

  try {
    await sendSchoolVerificationEmail(email, code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email send failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
