import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createDealContract } from '@/lib/campaigns/deals/supabaseRepository';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> }
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

  let body: { fileUrl?: unknown; fileRef?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* body optional */
  }

  const fileUrl =
    typeof body.fileUrl === 'string' && body.fileUrl.trim()
      ? body.fileUrl.trim()
      : typeof body.fileRef === 'string' && body.fileRef.trim()
        ? body.fileRef.trim()
        : null;

  try {
    const contract = await createDealContract(dealId, fileUrl);
    return NextResponse.json({ contract }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
