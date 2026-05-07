import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';

type RouteContext = { params: Promise<{ offerId: string }> };

const DECLINE_REASONS = new Set([
  'not_interested',
  'timing_conflict',
  'compensation_too_low',
  'does_not_fit_brand',
  'other',
]);

type OfferResponseRow = {
  id: string;
  athlete_id: string;
  application_id: string | null;
  status: string;
};

async function syncLinkedApplicationDeclined(applicationId: string | null) {
  if (!applicationId || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const service = createServiceClient();
  const { data: app } = await service
    .from('applications')
    .select('id, status')
    .eq('id', applicationId)
    .maybeSingle();

  if (!app || app.status !== 'offer_sent') return;

  const { error } = await service
    .from('applications')
    .update({ status: 'offer_declined' })
    .eq('id', applicationId)
    .eq('status', 'offer_sent');

  if (error) {
    console.warn('[declineOffer] could not sync application to offer_declined', error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'athlete') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { offerId } = await context.params;
  if (!offerId) {
    return NextResponse.json({ error: 'Missing offerId' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const declineReason = typeof body.declineReason === 'string' ? body.declineReason.trim() : '';
  const declineNote = typeof body.declineNote === 'string' ? body.declineNote.trim() : '';
  const reason = DECLINE_REASONS.has(declineReason) ? declineReason : 'other';

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from('offers')
    .select('id, athlete_id, application_id, status')
    .eq('id', offerId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }

  const offer = existing as OfferResponseRow;
  if (offer.athlete_id !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (offer.status === 'declined') {
    return NextResponse.json({ ok: true, offer: { id: offer.id, status: 'declined' } }, { status: 200 });
  }
  if (offer.status !== 'sent') {
    return NextResponse.json({ error: `Cannot decline offer in status '${offer.status}'` }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('offers')
    .update({
      status: 'declined',
      decline_reason: reason,
      decline_note: declineNote,
      declined_at: new Date().toISOString(),
    })
    .eq('id', offer.id)
    .eq('athlete_id', user.userId)
    .eq('status', 'sent')
    .select('id, status, declined_at, decline_reason, decline_note')
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Offer not found or already changed' }, { status: 404 });
  }

  await syncLinkedApplicationDeclined(offer.application_id);

  return NextResponse.json({ ok: true, offer: updated });
}
