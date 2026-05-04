import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { updateSubmission } from '@/lib/campaigns/deals/supabaseRepository';
import { SUBMISSION_STATUSES, type SubmissionStatus } from '@/lib/campaigns/deals/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ submissionId: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'brand') {
    return NextResponse.json({ error: 'Only the brand can update submission status' }, { status: 403 });
  }

  const { submissionId } = await context.params;
  if (!submissionId) {
    return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
  }

  let body: { status?: unknown; feedback?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? body.status : '';
  if (!SUBMISSION_STATUSES.includes(status as SubmissionStatus)) {
    return NextResponse.json({ error: `Invalid status '${status}'` }, { status: 400 });
  }

  try {
    const submission = await updateSubmission(
      submissionId,
      status as SubmissionStatus,
      typeof body.feedback === 'string' ? body.feedback : undefined,
      user.userId,
      { userId: user.userId, role: user.role },
    );
    return NextResponse.json({ submission });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const statusCode = msg === 'Submission not found' ? 404 : 400;
    return NextResponse.json({ error: msg }, { status: statusCode });
  }
}
