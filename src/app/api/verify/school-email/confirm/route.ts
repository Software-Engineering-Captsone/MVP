import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: string; code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').trim();
  if (!email || !code) {
    return NextResponse.json({ error: 'email and code are required' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: rows } = await service
    .from('school_email_verifications')
    .select('id, code')
    .eq('athlete_id', user.id)
    .eq('email', email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Code not found or expired' }, { status: 400 });
  }

  if (rows[0].code !== code) {
    return NextResponse.json({ error: 'Incorrect code' }, { status: 400 });
  }

  // Mark as used
  await service
    .from('school_email_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', rows[0].id);

  // Mark verified in athlete_academics via the user's session (respects RLS)
  const { error: rpcErr } = await supabase.rpc('upsert_athlete_compliance', {
    payload: { school_email_verified: true },
  });
  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verifiedAt: new Date().toISOString() });
}
