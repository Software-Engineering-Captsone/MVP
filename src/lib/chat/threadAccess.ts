// @ts-nocheck
import type { SupabaseClient } from '@supabase/supabase-js';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { getApplicationById, getCampaignById } from '@/lib/campaigns/repository';
import { canAccessApplicationChat } from '@/lib/chat/access';
import {
  athleteHasChatLaneOfferForOutreachThread,
  athleteMaySendOnApplication,
  athleteMayViewApplicationThread,
} from '@/lib/chat/messagingEligibility';
import type { ChatSessionUser } from './types';
import { getThreadById, threadHasUserMessageFromParticipant } from '@/lib/chat/service';

export type ThreadMessagingIntent = 'read' | 'write';

export type ThreadAccessResult =
  | { error: 'not_found' }
  | { error: 'forbidden' }
  | { error: null };

export async function assertThreadMessagingAccess(
  supabase: SupabaseClient,
  threadId: string,
  session: ChatSessionUser,
  intent: ThreadMessagingIntent = 'write'
): Promise<ThreadAccessResult> {
  const thread = await getThreadById(supabase, threadId);
  if (!thread) {
    return { error: 'not_found' };
  }

  if (thread.thread_kind === 'brand_outreach') {
    if (session.id !== thread.brand_user_id && session.id !== thread.athlete_user_id) {
      return { error: 'forbidden' };
    }
    if (session.id === thread.brand_user_id) {
      return { error: null };
    }
    const snap = await readLocalCampaignStore();
    const offers = snap.offers ?? [];
    const fromBrand = await threadHasUserMessageFromParticipant(
      supabase,
      threadId,
      thread.brand_user_id
    );
    const hasOffer = athleteHasChatLaneOfferForOutreachThread(
      threadId,
      thread.athlete_user_id,
      thread.brand_user_id,
      offers
    );
    if (fromBrand || hasOffer) {
      return { error: null };
    }
    return { error: 'forbidden' };
  }

  const appId = thread.application_id;
  if (!appId) {
    return { error: 'not_found' };
  }
  const app = await getApplicationById(appId);
  if (!app) {
    return { error: 'not_found' };
  }
  const campaign = await getCampaignById(String(app.campaignId));
  if (!campaign) {
    return { error: 'not_found' };
  }
  if (!canAccessApplicationChat(session, app, campaign)) {
    return { error: 'forbidden' };
  }

  if (String(app.status ?? '') === 'declined') {
    return { error: 'forbidden' };
  }

  const isBrand = session.role === 'brand' && String(campaign.brandUserId) === session.id;
  const isAthlete = session.role === 'athlete' && String(app.athleteUserId) === session.id;

  if (isBrand) {
    return { error: null };
  }

  if (!isAthlete) {
    return { error: 'forbidden' };
  }

  const snap = await readLocalCampaignStore();
  const offers = snap.offers ?? [];
  const brandId = String(campaign.brandUserId ?? '');

  if (intent === 'write') {
    if (!athleteMaySendOnApplication(app, offers)) {
      return { error: 'forbidden' };
    }
    return { error: null };
  }

  const canView = await athleteMayViewApplicationThread(supabase, app, brandId, offers, threadId);
  if (!canView) {
    return { error: 'forbidden' };
  }
  return { error: null };
}
