import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import {
  buildDealContractStoragePath,
  DEAL_CONTRACTS_BUCKET,
  sanitizeContractFilename,
} from '@/lib/campaigns/deals/contractStorage';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { dealId } = await context.params;
  if (!dealId) {
    return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });
  }

  let body: { filename?: unknown; contentType?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawName = typeof body.filename === 'string' ? body.filename : '';
  const filename = sanitizeContractFilename(rawName || 'contract.pdf');
  if (!filename) {
    return NextResponse.json({ error: 'filename required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, brand_id')
    .eq('id', dealId)
    .maybeSingle();
  if (dealErr) {
    return NextResponse.json({ error: dealErr.message }, { status: 500 });
  }
  if (!deal || (deal as { brand_id: string }).brand_id !== user.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const path = buildDealContractStoragePath(dealId, filename);

  const { data, error } = await supabase.storage.from(DEAL_CONTRACTS_BUCKET).createSignedUploadUrl(path, {
    upsert: true,
  });
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not create upload URL' }, { status: 500 });
  }

  return NextResponse.json({
    path: data.path,
    signedUrl: data.signedUrl,
    token: data.token,
    contentTypeHint: typeof body.contentType === 'string' ? body.contentType : undefined,
  });
}
