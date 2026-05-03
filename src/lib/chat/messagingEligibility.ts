import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoredApplication, StoredOffer } from '@/lib/campaigns/repository';
import { getApplicationById, getCampaignById, listOffersForAthlete } from '@/lib/campaigns/repository';
import { threadHasUserMessageFromParticipant } from '@/lib/chat/service';
import type { ChatInboxItem, ChatSessionUser } from '@/lib/chat/types';

function idStr(doc: { _id?: unknown }): string {
  return doc._id != null ? String(doc._id) : '';
}

const OFFER_STATUSES_ALLOWING_ATHLETE_SEND = new Set(['draft', 'sent', 'accepted']);

/** Athlete may send on application thread after brand review, or when an offer exists. */
export function athleteMaySendOnApplication(app: StoredApplication, offers: StoredOffer[]): boolean {
  const appStatus = String(app.status ?? '');
  if (appStatus === 'under_review' || appStatus === 'shortlisted' || appStatus === 'offer_sent') {
    return true;
  }
  // Legacy compatibility.
  if (appStatus === 'approved') return true;
  const appId = idStr(app);
  const athleteUserId = String(app.athleteUserId ?? '');
  if (!appId || !athleteUserId) return false;
  return offers.some((o) => {
    if (String(o.athleteUserId ?? '') !== athleteUserId) return false;
    if (String(o.applicationId ?? '') !== appId) return false;
    const st = String(o.status ?? 'draft');
    return OFFER_STATUSES_ALLOWING_ATHLETE_SEND.has(st);
  });
}

export function athleteHasChatLaneOfferForOutreachThread(
  threadId: string,
  athleteUserId: string,
  brandUserId: string,
  offers: StoredOffer[]
): boolean {
  const tid = String(threadId ?? '').trim();
  const ath = String(athleteUserId ?? '').trim();
  const br = String(brandUserId ?? '').trim();
  if (!tid || !ath || !br) return false;
  return offers.some((o) => {
    if (String(o.offerOrigin ?? '') !== 'chat_negotiated') return false;
    if (String(o.athleteUserId ?? '') !== ath) return false;
    if (String(o.brandUserId ?? '') !== br) return false;
    const st = String(o.status ?? 'draft');
    if (!OFFER_STATUSES_ALLOWING_ATHLETE_SEND.has(st)) return false;
    const sd = o.structuredDraft as Record<string, unknown> | undefined;
    const oc =
      sd && typeof sd === 'object' && !Array.isArray(sd)
        ? (sd.originContext as Record<string, unknown> | undefined)
        : undefined;
    const ct = oc && typeof oc.chatThreadId === 'string' ? oc.chatThreadId.trim() : '';
    return ct === tid;
  });
}

export async function athleteMayAccessBrandOutreachThread(
  supabase: SupabaseClient,
  threadId: string,
  athleteUserId: string,
  brandUserId: string,
  offers: StoredOffer[]
): Promise<boolean> {
  if (athleteHasChatLaneOfferForOutreachThread(threadId, athleteUserId, brandUserId, offers)) {
    return true;
  }
  return threadHasUserMessageFromParticipant(supabase, threadId, brandUserId);
}

export async function athleteMayViewApplicationThread(
  supabase: SupabaseClient,
  app: StoredApplication,
  campaignBrandUserId: string,
  offers: StoredOffer[],
  existingThreadId: string | null
): Promise<boolean> {
  if (athleteMaySendOnApplication(app, offers)) return true;
  if (!existingThreadId) return false;
  return threadHasUserMessageFromParticipant(supabase, existingThreadId, campaignBrandUserId);
}

/**
 * Athlete inbox: hide threads they cannot read yet (no brand contact and no approval/offer path).
 */
export async function filterAthleteInboxItems(
  supabase: SupabaseClient,
  session: ChatSessionUser,
  items: ChatInboxItem[]
): Promise<ChatInboxItem[]> {
  if (session.role !== 'athlete') return items;
  const offers = await listOffersForAthlete(session.id);
  const out: ChatInboxItem[] = [];

  for (const item of items) {
    if (item.threadKind === 'brand_outreach') {
      const ok = await athleteMayAccessBrandOutreachThread(
        supabase,
        item.threadId,
        session.id,
        item.counterpart.userId,
        offers
      );
      if (ok) out.push(item);
      continue;
    }

    if (!item.applicationId) {
      continue;
    }
    const app = await getApplicationById(item.applicationId);
    if (!app || String(app.athleteUserId) !== session.id) continue;
    const campaign = await getCampaignById(String(app.campaignId));
    if (!campaign) continue;
    const brandId = String(campaign.brandUserId ?? '');
    const canView = await athleteMayViewApplicationThread(
      supabase,
      app,
      brandId,
      offers,
      item.threadId
    );
    if (canView) out.push(item);
  }

  return out;
}
