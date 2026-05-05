import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import {
  buildTermsSnapshotFromOffer,
  getFrozenDeliverableSpecs,
  type OfferTermsSource,
} from '@/lib/campaigns/deals/termsSnapshot';
import { recordDealActivity } from '@/lib/campaigns/deals/supabaseRepository';
import { notifyDealPlaceholder } from '@/lib/campaigns/deals/notifications';

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

interface PaymentDefaults {
  amount: number;
  currency: string;
}

function paymentDefaultsFromTermsSnapshot(snapshot: unknown): PaymentDefaults {
  if (!snapshot || typeof snapshot !== 'object') {
    return { amount: 0, currency: 'USD' };
  }

  const root = snapshot as Record<string, unknown>;
  const frozen = root.frozen;
  if (!frozen || typeof frozen !== 'object') {
    return { amount: 0, currency: 'USD' };
  }

  const compensationSummary = (frozen as Record<string, unknown>).compensationSummary;
  if (!compensationSummary || typeof compensationSummary !== 'object') {
    return { amount: 0, currency: 'USD' };
  }

  const amountRaw = (compensationSummary as Record<string, unknown>).amount;
  const currencyRaw = (compensationSummary as Record<string, unknown>).currency;
  const amount = typeof amountRaw === 'number' && Number.isFinite(amountRaw) ? Math.max(0, Math.floor(amountRaw)) : 0;
  const currency =
    typeof currencyRaw === 'string' && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : 'USD';

  return { amount, currency };
}

function dbOfferToTermsSource(row: DbOfferRow): OfferTermsSource {
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
  };
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

  const termsSnapshot = buildTermsSnapshotFromOffer(dbOfferToTermsSource(offer));
  const frozenDeliverables = getFrozenDeliverableSpecs(termsSnapshot);
  const { amount, currency } = paymentDefaultsFromTermsSnapshot(termsSnapshot);

  /** Idempotent success when the athlete retries after a partial accept. */
  if (offer.status === 'accepted') {
    const { data: existingForOffer, error: exErr } = await supabase
      .from('deals')
      .select('id, payment_id')
      .eq('offer_id', offer.id)
      .maybeSingle();
    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }
    const dealId = (existingForOffer as { id?: string } | null)?.id ?? offer.deal_id;
    if (!dealId) {
      return NextResponse.json(
        { error: 'Offer is accepted but no deal is linked. Contact support.' },
        { status: 500 },
      );
    }
    const payRow = await supabase.from('deals').select('payment_id').eq('id', dealId).maybeSingle();
    const paymentId =
      (existingForOffer as { payment_id?: string | null } | null)?.payment_id ??
      (payRow.data as { payment_id?: string | null } | null)?.payment_id ??
      null;
    return NextResponse.json(
      {
        ok: true,
        dealId,
        paymentId: paymentId ?? undefined,
        deal: { id: dealId },
        alreadyAccepted: true,
      },
      { status: 200 },
    );
  }

  if (offer.status !== 'sent') {
    return NextResponse.json(
      { error: `Cannot accept offer in status '${offer.status}'` },
      { status: 400 },
    );
  }

  const { data: dealByOffer, error: dealLookupErr } = await supabase
    .from('deals')
    .select('id, payment_id')
    .eq('offer_id', offer.id)
    .maybeSingle();
  if (dealLookupErr) {
    return NextResponse.json({ error: dealLookupErr.message }, { status: 500 });
  }

  let dealId: string;
  if (dealByOffer?.id) {
    dealId = dealByOffer.id as string;
  } else {
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
    if (insertErr?.message?.includes('deals_offer_id_key') || insertErr?.code === '23505') {
      const { data: raced } = await supabase.from('deals').select('id').eq('offer_id', offer.id).maybeSingle();
      if (!raced?.id) {
        return NextResponse.json({ error: insertErr.message ?? 'Could not create deal' }, { status: 500 });
      }
      dealId = raced.id as string;
    } else if (insertErr || !insertedDeal) {
      const msg = insertErr?.message ?? 'Could not create deal';
      return NextResponse.json({ error: msg }, { status: 500 });
    } else {
      dealId = insertedDeal.id as string;
    }
  }

  let paymentId: string | undefined =
    (dealByOffer as { payment_id?: string | null } | null)?.payment_id ?? undefined;
  if (!paymentId) {
    const { data: dealPayRow } = await supabase.from('deals').select('payment_id').eq('id', dealId).maybeSingle();
    paymentId = (dealPayRow as { payment_id?: string | null } | undefined)?.payment_id ?? undefined;
  }
  if (!paymentId) {
    const { data: orphanPayment } = await supabase
      .from('deal_payments')
      .select('id')
      .eq('deal_id', dealId)
      .maybeSingle();
    if (orphanPayment?.id) {
      paymentId = orphanPayment.id as string;
      const { error: linkOrphanErr } = await supabase
        .from('deals')
        .update({ payment_id: paymentId })
        .eq('id', dealId);
      if (linkOrphanErr) {
        return NextResponse.json(
          { error: `Deal exists but payment link failed: ${linkOrphanErr.message}`, dealId, paymentId },
          { status: 500 },
        );
      }
    }
  }

  if (!paymentId) {
    const { data: insertedPayment, error: paymentErr } = await supabase
      .from('deal_payments')
      .insert({
        deal_id: dealId,
        amount,
        currency,
        status: 'not_configured',
        provider: '',
        provider_reference: '',
        release_condition: 'on_completion',
      })
      .select('id')
      .single();
    if (paymentErr || !insertedPayment) {
      const msg = paymentErr?.message ?? 'Could not create deal payment';
      return NextResponse.json({ error: `Deal exists but payment insert failed: ${msg}`, dealId }, { status: 500 });
    }
    paymentId = insertedPayment.id as string;

    const { error: linkPaymentErr } = await supabase
      .from('deals')
      .update({ payment_id: paymentId })
      .eq('id', dealId);
    if (linkPaymentErr) {
      return NextResponse.json(
        { error: `Deal exists but payment link failed: ${linkPaymentErr.message}`, dealId, paymentId },
        { status: 500 },
      );
    }
  }

  if (frozenDeliverables.length > 0) {
    const { count: deliverableCount, error: countErr } = await supabase
      .from('deal_deliverables')
      .select('id', { count: 'exact', head: true })
      .eq('deal_id', dealId);
    if (countErr) {
      return NextResponse.json(
        { error: `Could not verify deliverables: ${countErr.message}`, dealId, paymentId },
        { status: 500 },
      );
    }
    if ((deliverableCount ?? 0) === 0) {
      const deliverableRows = frozenDeliverables.map((spec, index) => ({
        deal_id: dealId,
        title: spec.title,
        order_index: index,
        type: spec.type,
        instructions: spec.instructions,
        status: 'not_started',
        due_at: spec.dueAt,
        draft_required: spec.draftRequired,
        publish_required: spec.publishRequired,
        proof_required: spec.proofRequired,
        disclosure_required: spec.disclosureRequired,
        revision_limit: spec.revisionLimit,
        revision_count_used: 0,
      }));

      const { error: deliverablesErr } = await supabase.from('deal_deliverables').insert(deliverableRows);
      if (deliverablesErr) {
        return NextResponse.json(
          { error: `Deliverables seed failed: ${deliverablesErr.message}`, dealId, paymentId },
          { status: 500 },
        );
      }
    }
  }

  const acceptedAt = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('offers')
    .update({ status: 'accepted', deal_id: dealId, accepted_at: acceptedAt })
    .eq('id', offer.id);
  if (updateErr) {
    return NextResponse.json(
      {
        error: `Offer update failed: ${updateErr.message}`,
        dealId,
      },
      { status: 500 },
    );
  }

  try {
    await recordDealActivity({
      dealId,
      entityType: 'deal',
      entityId: dealId,
      eventType: 'deal_created',
      actorType: 'athlete',
      actorId: user.userId,
      metadata: { offerId: offer.id, paymentId },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Activity log failed';
    return NextResponse.json(
      { error: `Deal ready but activity log failed: ${msg}`, dealId, paymentId },
      { status: 500 },
    );
  }

  notifyDealPlaceholder('deal_opened', { dealId, offerId: offer.id, paymentId });

  const httpStatus = dealByOffer?.id ? 200 : 201;
  return NextResponse.json(
    {
      ok: true,
      dealId,
      paymentId,
      deal: { id: dealId },
      resumed: Boolean(dealByOffer?.id),
    },
    { status: httpStatus },
  );
}
