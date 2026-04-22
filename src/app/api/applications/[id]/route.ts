import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  getApplicationById,
  getCampaignById,
  restorePreviousApplicationPitchByAthlete,
  updateApplicationPitchByAthlete,
  updateApplicationStatus,
  withdrawApplicationByAthlete,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';
import {
  ensureApplicationCampaignThread,
  insertApplicationApprovedNoticeOnce,
} from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

const BRAND_ALLOWED = new Set(['under_review', 'shortlisted', 'rejected', 'offer_sent']);
const BRAND_STATUS_ALIASES: Record<string, 'under_review' | 'shortlisted' | 'rejected'> = {
  approved: 'shortlisted',
  declined: 'rejected',
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const user = { userId: session.id, role: session.role };

  const { id } = await context.params;
  const appBefore = await getApplicationById(id);
  if (!appBefore) {
    return jsonError(404, 'Not found');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const campaign = await getCampaignById(String(appBefore.campaignId));
  if (!campaign) {
    return jsonError(404, 'Not found');
  }

  if (user.role === 'athlete') {
    if (String(appBefore.athleteUserId) !== user.userId) {
      return jsonError(403, 'Forbidden');
    }
    const intent = typeof body.intent === 'string' ? body.intent : '';
    if (intent === 'edit') {
      const pitch = typeof body.pitch === 'string' ? body.pitch : '';
      const result = await updateApplicationPitchByAthlete(id, user.userId, pitch);
      if (!result.ok) return jsonError(result.status, result.error);
      return NextResponse.json({ application: applicationToJSON(result.application) });
    }
    if (intent === 'restore_previous_pitch') {
      const result = await restorePreviousApplicationPitchByAthlete(id, user.userId);
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

  if (user.role !== 'brand' || String(campaign.brandUserId) !== user.userId) {
    return jsonError(403, 'Forbidden');
  }

  const statusInput = typeof body.status === 'string' ? body.status : '';
  const normalizedStatus =
    BRAND_STATUS_ALIASES[statusInput] ??
    (BRAND_ALLOWED.has(statusInput)
      ? (statusInput as 'under_review' | 'shortlisted' | 'rejected' | 'offer_sent')
      : null);
  if (!normalizedStatus) {
    return jsonError(400, 'Invalid status');
  }

  try {
    const result = await updateApplicationStatus(id, user.userId, normalizedStatus);
    if (!result.ok) {
      return jsonError(result.status, result.error, result.details);
    }
    const warnings: { code: string; message: string }[] = [];

    if (
      normalizedStatus === 'shortlisted' &&
      String(appBefore.status ?? '') !== 'shortlisted' &&
      result.application
    ) {
      try {
        const thread = await ensureApplicationCampaignThread(
          supabase,
          id,
          result.application,
          campaign
        );
        try {
          await insertApplicationApprovedNoticeOnce(
            supabase,
            thread.id,
            String(campaign.brandUserId ?? '')
          );
        } catch (noticeErr) {
          console.error('Failed to insert application approved chat notice', noticeErr);
          warnings.push({
            code: 'CHAT_NOTICE_FAILED',
            message:
              'The application moved to shortlisted, but we could not post the welcome notice in chat.',
          });
        }
      } catch (e) {
        console.error('Failed to provision application chat on shortlist', e);
        warnings.push({
          code: 'CHAT_THREAD_FAILED',
          message:
            'The application moved to shortlisted, but the conversation could not be created.',
        });
      }
    }

    return NextResponse.json({
      application: applicationToJSON(result.application),
      warnings,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return jsonError(400, msg);
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const user = { userId: session.id, role: session.role };

  const { id } = await context.params;
  const app = await getApplicationById(id);
  if (!app) {
    return jsonError(404, 'Not found');
  }

  const campaign = await getCampaignById(String(app.campaignId));
  if (!campaign) {
    return jsonError(404, 'Not found');
  }

  const isBrand = user.role === 'brand' && campaign.brandUserId === user.userId;
  const isAthlete = user.role === 'athlete' && app.athleteUserId === user.userId;
  if (!isBrand && !isAthlete) {
    return jsonError(403, 'Forbidden');
  }

  return NextResponse.json({ application: applicationToJSON(app) });
}
