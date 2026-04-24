import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { getApplicationById, getCampaignById } from '@/lib/campaigns/repository';
import { createClient } from '@/lib/supabase/server';
import {
  ensureApplicationCampaignThread,
  insertMessage,
  listMessagesForThread,
} from '@/lib/chat/service';
import type { StoredApplication, StoredCampaign } from '@/lib/campaigns/localCampaignStore';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Legacy endpoint — now a thin wrapper over the chat service. Application
 * messages and inbox share one source of truth (chat_threads/chat_messages).
 * The thread is created on demand (first message) rather than waiting for
 * approval, so brand and athlete can chat the moment the application exists.
 */

async function authorizeAndLoad(applicationId: string) {
  const user = await getAuthUser();
  if (!user) return { error: 'Unauthorized' as const, status: 401 };

  const app = await getApplicationById(applicationId);
  if (!app) return { error: 'Not found' as const, status: 404 };

  const campaign = await getCampaignById(String(app.campaignId));
  if (!campaign) return { error: 'Not found' as const, status: 404 };

  const isBrand = user.role === 'brand' && campaign.brandUserId === user.userId;
  const isAthlete = user.role === 'athlete' && app.athleteUserId === user.userId;
  if (!isBrand && !isAthlete) return { error: 'Forbidden' as const, status: 403 };

  return { user, app, campaign };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await authorizeAndLoad(id);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = await createClient();
    const thread = await ensureApplicationCampaignThread(
      supabase,
      id,
      auth.app as unknown as StoredApplication,
      auth.campaign as unknown as StoredCampaign
    );
    const rows = await listMessagesForThread(supabase, thread.id);
    return NextResponse.json({
      threadId: thread.id,
      messages: rows.map((r) => ({
        id: r.id,
        fromUserId: r.fromUserId,
        body: r.body,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await authorizeAndLoad(id);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return NextResponse.json({ error: 'Message body required' }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: 'Message too long' }, { status: 400 });

  try {
    const supabase = await createClient();
    const thread = await ensureApplicationCampaignThread(
      supabase,
      id,
      auth.app as unknown as StoredApplication,
      auth.campaign as unknown as StoredCampaign
    );
    const message = await insertMessage(supabase, thread.id, auth.user.userId, text);
    return NextResponse.json({
      threadId: thread.id,
      message: {
        id: message.id,
        fromUserId: message.fromUserId,
        body: message.body,
        createdAt: message.createdAt,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
