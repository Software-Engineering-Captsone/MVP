import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import { buildTermsSnapshotFromOffer } from '@/lib/campaigns/deals/termsSnapshot';
import type { StoredOffer } from '@/lib/campaigns/localCampaignStore';

interface DbOfferRow {
  id: string;
  brand_id: string;
  athlete_id: string;
  campaign_id: string | null;
  application_id: string | null;
  deal_id: string | null;
  offer_origin: string;
  status: string;
  structured_draft: Record<string, unknown> | null;
  notes: string | null;
}

function dbOfferToStored(row: DbOfferRow): StoredOffer {
  return {
    _id: row.id,
    brandUserId: row.brand_id,
    athleteUserId: row.athlete_id,
    campaignId: row.campaign_id,
    applicationId: row.application_id,
    dealId: row.deal_id,
    offerOrigin: row.offer_origin,
    status: row.status,
    structuredDraft: row.structured_draft ?? {},
    notes: row.notes ?? '',
  } as StoredOffer;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ offerId: string }> }
) {
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

  const supabase = await createClient();

  const { data: offerRow, error: offerErr } = await supabase
    .from('offers')
    .select('id, brand_id, athlete_id, campaign_id, application_id, deal_id, offer_origin, status, structured_draft, notes')
    .eq('id', offerId)
    .maybeSingle();
  if (offerErr) {
    return NextResponse.json({ error: offerErr.message }, { status: 500 });
  }
  if (!offerRow) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }
  const offer = offerRow as unknown as DbOfferRow;
  if (offer.athlete_id !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (offer.status !== 'sent') {
    return NextResponse.json(
      { error: `Cannot accept offer in status '${offer.status}'` },
      { status: 400 }
    );
  }
  if (offer.deal_id) {
    return NextResponse.json({ error: 'Offer already has a deal' }, { status: 409 });
  }

  const termsSnapshot = buildTermsSnapshotFromOffer(dbOfferToStored(offer));

  const { data: insertedDeal, error: insertErr } = await supabase
    .from('deals')
    .insert({
      offer_id: offer.id,
      brand_id: offer.brand_id,
      athlete_id: offer.athlete_id,
      campaign_id: offer.campaign_id,
      application_id: offer.application_id,
      terms_snapshot: termsSnapshot,
      status: 'created',
    })
    .select('id')
    .single();
  if (insertErr || !insertedDeal) {
    const msg = insertErr?.message ?? 'Could not create deal';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const dealId = insertedDeal.id as string;

  const acceptedAt = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('offers')
    .update({ status: 'accepted', deal_id: dealId, accepted_at: acceptedAt })
    .eq('id', offer.id);
  if (updateErr) {
    return NextResponse.json(
      {
        error: `Deal created but offer update failed: ${updateErr.message}`,
        dealId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, dealId }, { status: 201 });
}
