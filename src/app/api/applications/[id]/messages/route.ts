import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApplicationById, getCampaignById } from '@/lib/campaigns/repository';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { canAccessApplicationChat } from '@/lib/chat/access';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  athleteMaySendOnApplication,
  athleteMayViewApplicationThread,
} from '@/lib/chat/messagingEligibility';
import {
  ensureApplicationCampaignThread,
  getThreadByApplicationId,
  insertMessage,
  listMessagesForThread,
} from '@/lib/chat/service';
import { mapChatInfraError } from '@/lib/chat/apiError';

type RouteContext = { params: Promise<{ id: string }> };

const ATHLETE_SEND_BLOCKED =
  'You can message this brand after your application is approved or once they send you an offer for this campaign.';

const ATHLETE_VIEW_BLOCKED =
  'Conversation unlocks when your application is approved, you receive an offer, or the brand messages you here first.';

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const app = await getApplicationById(id);
  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const campaign = await getCampaignById(String(app.campaignId));
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!canAccessApplicationChat(session, app, campaign)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (String(app.status ?? '') === 'declined') {
    return NextResponse.json({ error: 'Messaging is not available for declined applications' }, { status: 403 });
  }

  const isBrand = session.role === 'brand' && String(campaign.brandUserId) === session.id;
  const isAthlete = session.role === 'athlete' && String(app.athleteUserId) === session.id;
  if (!isBrand && !isAthlete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let thread;
    if (isBrand) {
      thread = await ensureApplicationCampaignThread(supabase, id, app, campaign);
    } else {
      const snap = await readLocalCampaignStore();
      const offers = snap.offers ?? [];
      const brandId = String(campaign.brandUserId ?? '');
      const existing = await getThreadByApplicationId(supabase, id);
      const canView = await athleteMayViewApplicationThread(
        supabase,
        app,
        brandId,
        offers,
        existing?.id ?? null
      );
      if (!canView) {
        return NextResponse.json({ error: ATHLETE_VIEW_BLOCKED }, { status: 403 });
      }
      const canSend = athleteMaySendOnApplication(app, offers);
      thread =
        existing ?? (canSend ? await ensureApplicationCampaignThread(supabase, id, app, campaign) : existing);
      if (!thread) {
        return NextResponse.json({ error: ATHLETE_VIEW_BLOCKED }, { status: 403 });
      }
    }

    const rows = await listMessagesForThread(supabase, thread.id);
    const messages = rows.map((m) => ({
      id: m.id,
      fromUserId: m.fromUserId,
      body: m.body,
      createdAt: m.createdAt,
      messageKind: m.messageKind,
      offerId: m.offerId,
    }));
    return NextResponse.json({ threadId: thread.id, messages });
  } catch (e) {
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to load messages';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 });
  }

  const app = await getApplicationById(id);
  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const campaign = await getCampaignById(String(app.campaignId));
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!canAccessApplicationChat(session, app, campaign)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (String(app.status ?? '') === 'declined') {
    return NextResponse.json({ error: 'Messaging is not available for declined applications' }, { status: 403 });
  }

  const isBrand = session.role === 'brand' && String(campaign.brandUserId) === session.id;
  const isAthlete = session.role === 'athlete' && String(app.athleteUserId) === session.id;
  if (!isBrand && !isAthlete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let thread;
    if (isBrand) {
      thread = await ensureApplicationCampaignThread(supabase, id, app, campaign);
    } else {
      const snap = await readLocalCampaignStore();
      const offers = snap.offers ?? [];
      if (!athleteMaySendOnApplication(app, offers)) {
        return NextResponse.json({ error: ATHLETE_SEND_BLOCKED }, { status: 403 });
      }
      thread = await ensureApplicationCampaignThread(supabase, id, app, campaign);
    }

    await insertMessage(supabase, thread.id, session.id, text);
    const chatMessages = await listMessagesForThread(supabase, thread.id);
    const json = applicationToJSON(app);
    return NextResponse.json({
      threadId: thread.id,
      application: {
        ...json,
        messages: chatMessages.map((m) => ({
          id: m.id,
          fromUserId: m.fromUserId,
          body: m.body,
          createdAt: m.createdAt,
          messageKind: m.messageKind,
          offerId: m.offerId,
        })),
      },
    });
  } catch (e) {
    const infra = mapChatInfraError(e);
    if (infra) {
      return NextResponse.json(infra.body, { status: infra.status });
    }
    const msg = e instanceof Error ? e.message : 'Failed to send';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
