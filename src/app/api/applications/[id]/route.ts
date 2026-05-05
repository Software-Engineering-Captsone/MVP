import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
  getApplicationById,
  getCampaignById,
  updateApplicationPitchByAthlete,
  updateApplicationStatus,
  withdrawApplicationByAthlete,
} from '@/lib/campaigns/repository';
import { jsonError } from '@/lib/api/jsonError';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { createClient } from '@/lib/supabase/server';
import {
  ensureApplicationCampaignThread,
  insertApplicationApprovedNoticeOnce,
} from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

/** Inbound from brand UI; `rejected` is normalized to `declined` for the DB. */
const ALLOWED_INBOUND = new Set(['shortlisted', 'approved', 'declined', 'under_review', 'rejected']);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  // Athlete-side intents: edit pitch, withdraw application.
  // Kept separate from the brand status flow so each side validates against
  // its own RLS-permitted operations (status set ⊆ {pending, withdrawn}).
  if (user.role === 'athlete') {
    const intent = typeof body.intent === 'string' ? body.intent : '';
    if (intent === 'edit') {
      const pitch = typeof body.pitch === 'string' ? body.pitch : '';
      const result = await updateApplicationPitchByAthlete(id, user.userId, pitch);
      if (!result.ok) return jsonError(result.status, result.error);
      return NextResponse.json({ application: applicationToJSON(result.application) });
    }
    if (intent === 'withdraw') {
      const result = await withdrawApplicationByAthlete(id, user.userId);
      if (!result.ok) return jsonError(result.status, result.error);
      return NextResponse.json({ application: applicationToJSON(result.application) });
    }
    return jsonError(400, 'Invalid intent');
  }

  if (user.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const raw = body.status;
  if (typeof raw !== 'string' || !ALLOWED_INBOUND.has(raw)) {
    return jsonError(400, 'Invalid status');
  }
  const status: 'under_review' | 'shortlisted' | 'approved' | 'declined' =
    raw === 'rejected' ? 'declined' : (raw as 'under_review' | 'shortlisted' | 'approved' | 'declined');

  try {
    const updated = await updateApplicationStatus(id, user.userId, status);
    if (!updated) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    // On approval, spin up (or return) the application-linked chat thread
    // and drop a one-time system notice. Chat failure must not fail approval.
    if (status === 'approved') {
      try {
        const campaign = await getCampaignById(String(updated.campaignId));
        if (campaign) {
          const supabase = await createClient();
          // Repository types are structurally compatible with the chat
          // helper's StoredApplication/StoredCampaign (Record<string, unknown>
          // & { _id }); cast through unknown to bridge the nominal gap.
          const thread = await ensureApplicationCampaignThread(
            supabase,
            id,
            updated as unknown as import('@/lib/campaigns/localCampaignStore').StoredApplication,
            campaign as unknown as import('@/lib/campaigns/localCampaignStore').StoredCampaign
          );
          await insertApplicationApprovedNoticeOnce(supabase, thread.id, user.userId);
        }
      } catch (chatErr) {
        console.error('[approve] chat thread setup failed', chatErr);
      }
    }

    return NextResponse.json({ application: applicationToJSON(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
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

  const isBrand = user.role === 'brand' && campaign.brandUserId === user.userId;
  const isAthlete = user.role === 'athlete' && app.athleteUserId === user.userId;
  if (!isBrand && !isAthlete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ application: applicationToJSON(app) });
}
