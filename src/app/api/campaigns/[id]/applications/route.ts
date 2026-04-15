import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  createApplication,
  getCampaignById,
  listApplicationsForCampaign,
} from '@/lib/campaigns/repository';
import { applicationToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const user = { userId: session.id, role: session.role };
  if (user.role !== 'brand') {
    return jsonError(403, 'Forbidden');
  }

  const { id } = await context.params;
  const campaign = await getCampaignById(id);
  if (!campaign || campaign.brandUserId !== user.userId) {
    return jsonError(404, 'Not found');
  }

  const applications = await listApplicationsForCampaign(id);
  return NextResponse.json({ applications: applications.map(applicationToJSON) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return jsonError(401, 'Unauthorized');
  }
  const user = { userId: session.id, role: session.role };
  if (user.role !== 'athlete') {
    return jsonError(403, 'Forbidden');
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const athleteSnapshot = (body.athleteSnapshot as Record<string, string>) ?? {};
  const pitch = typeof body.pitch === 'string' ? body.pitch : '';

  try {
    const result = await createApplication({
      campaignId: id,
      athleteUserId: user.userId,
      source: 'regular',
      pitch,
      athleteSnapshot: {
        name: athleteSnapshot.name ?? '',
        sport: athleteSnapshot.sport ?? '',
        school: athleteSnapshot.school ?? '',
        image: athleteSnapshot.image ?? '',
        followers: athleteSnapshot.followers ?? '—',
        engagement: athleteSnapshot.engagement ?? '—',
      },
    });

    if (result.error === 'duplicate') {
      return jsonError(409, 'Already applied', {
        application: applicationToJSON(result.application),
      });
    }

    return NextResponse.json(
      { application: applicationToJSON(result.application) },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to apply';
    const status = msg === 'Campaign not found' ? 404 : 400;
    return jsonError(status, msg);
  }
}
