import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { submissionToJSON } from '@/lib/campaigns/serialization';
import {
  createSubmissionForDeliverable,
  listSubmissionsForDeliverableForUser,
} from '@/lib/campaigns/deals/repository';
import type { SubmissionArtifact } from '@/lib/campaigns/deals/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id: deliverableId } = await context.params;
  const result = await listSubmissionsForDeliverableForUser(deliverableId, session.id, session.role);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  return NextResponse.json({ submissions: result.submissions.map(submissionToJSON) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id: deliverableId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const text = typeof body.body === 'string' ? body.body : '';
  const notes = typeof body.notes === 'string' ? body.notes : '';
  const submissionType =
    body.submissionType === 'file' ||
    body.submissionType === 'url' ||
    body.submissionType === 'text' ||
    body.submissionType === 'mixed'
      ? body.submissionType
      : undefined;
  const artifacts = Array.isArray(body.artifacts) ? (body.artifacts as SubmissionArtifact[]) : undefined;
  const result = await createSubmissionForDeliverable(deliverableId, session.id, session.role, {
    body: text,
    notes,
    submissionType,
    artifacts,
  });
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  return NextResponse.json({ submission: submissionToJSON(result.submission) }, { status: 201 });
}
