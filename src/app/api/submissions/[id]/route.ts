import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { submissionToJSON } from '@/lib/campaigns/serialization';
import { SUBMISSION_STATUSES, type SubmissionStatus } from '@/lib/campaigns/deals/types';
import { patchSubmissionForUser } from '@/lib/campaigns/deals/repository';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { insertMessage } from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set<string>(SUBMISSION_STATUSES);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!status || !ALLOWED.has(status)) {
    return jsonError(400, 'Invalid submission status');
  }

  const feedback = typeof body.feedback === 'string' ? body.feedback : undefined;
  const result = await patchSubmissionForUser(id, session.id, session.role, {
    status: status as SubmissionStatus,
    ...(feedback !== undefined ? { feedback } : {}),
  });
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  if (session.role === 'brand') {
    try {
      const snap = await readLocalCampaignStore();
      const deliverable = snap.deliverables.find(
        (d) => String(d._id) === String(result.submission.deliverableId)
      );
      const deal = deliverable
        ? snap.deals.find((d) => String(d._id) === String(deliverable.dealId))
        : null;
      if (deal?.chatThreadId) {
        let body = '';
        if (status === 'revision_requested') {
          body = 'Revision requested on your submission. Open Deals to review feedback and resubmit.';
        } else if (status === 'approved') {
          body = 'Great news - your submission was approved.';
        } else if (status === 'rejected') {
          body = 'Your submission was rejected. Please check feedback in Deals.';
        }
        if (body) {
          await insertMessage(supabase, deal.chatThreadId, session.id, body, { messageKind: 'system' });
        }
      }
    } catch (e) {
      console.error('Failed to post submission status notification', e);
    }
  }
  return NextResponse.json({ submission: submissionToJSON(result.submission) });
}
