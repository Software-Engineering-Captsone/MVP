import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import {
  createSubmissionForDeliverable,
  listSubmissionsForDeliverable,
} from '@/lib/campaigns/deals/supabaseRepository';
import type { SubmissionArtifact } from '@/lib/campaigns/deals/types';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ deliverableId: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { deliverableId } = await context.params;
  if (!deliverableId) {
    return NextResponse.json({ error: 'Missing deliverableId' }, { status: 400 });
  }

  try {
    const submissions = await listSubmissionsForDeliverable(deliverableId);
    return NextResponse.json({ submissions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status =
      msg === 'Deliverable not found' ? 404 : msg.startsWith('Only the athlete') ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deliverableId: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'athlete') {
    return NextResponse.json({ error: 'Only athletes can submit deliverable work' }, { status: 403 });
  }

  const { deliverableId } = await context.params;
  if (!deliverableId) {
    return NextResponse.json({ error: 'Missing deliverableId' }, { status: 400 });
  }

  let body: { notes?: unknown; body?: unknown; submissionType?: unknown; artifacts?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* allow empty */
  }

  try {
    const artifacts: SubmissionArtifact[] | undefined = Array.isArray(body.artifacts)
      ? (body.artifacts.filter(
          (a): a is SubmissionArtifact =>
            a != null &&
            typeof a === 'object' &&
            !Array.isArray(a) &&
            ((a as { kind?: unknown }).kind === 'file' ||
              (a as { kind?: unknown }).kind === 'url' ||
              (a as { kind?: unknown }).kind === 'text'),
        ) as SubmissionArtifact[])
      : undefined;

    const submission = await createSubmissionForDeliverable(deliverableId, user.userId, {
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      body: typeof body.body === 'string' ? body.body : undefined,
      submissionType: typeof body.submissionType === 'string' ? body.submissionType : undefined,
      artifacts,
    });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status =
      msg === 'Deliverable not found' ? 404 : msg.startsWith('Only the athlete') ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
