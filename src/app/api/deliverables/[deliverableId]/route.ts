import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { updateDeliverable } from '@/lib/campaigns/deals/supabaseRepository';
import { DELIVERABLE_STATUSES, type DeliverableStatus } from '@/lib/campaigns/deals/types';

export async function PATCH(
  request: NextRequest,
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

  let body: { status?: unknown; title?: unknown; description?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? body.status : undefined;
  if (status !== undefined && !DELIVERABLE_STATUSES.includes(status as DeliverableStatus)) {
    return NextResponse.json({ error: `Invalid status '${status}'` }, { status: 400 });
  }

  try {
    const deliverable = await updateDeliverable(
      deliverableId,
      {
        status: status as DeliverableStatus | undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
      },
      { userId: user.userId, role: user.role },
    );
    return NextResponse.json({ deliverable });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const statusCode = msg === 'Deliverable not found' ? 404 : 400;
    return NextResponse.json({ error: msg }, { status: statusCode });
  }
}
