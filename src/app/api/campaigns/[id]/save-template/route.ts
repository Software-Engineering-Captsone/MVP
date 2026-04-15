import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createCampaignTemplateFromCampaign, getCampaignById } from '@/lib/campaigns/repository';
import { campaignTemplateToJSON } from '@/lib/campaigns/campaignTemplateSerialization';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: campaignId } = await context.params;

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  if (campaign.brandUserId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nameFromBody = typeof body.name === 'string' ? body.name.trim() : '';
  const name =
    nameFromBody ||
    (typeof campaign.name === 'string' && campaign.name.trim() ? campaign.name.trim() : '');
  if (!name) {
    return NextResponse.json({ error: 'name is required (or set campaign name)' }, { status: 400 });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const lockedPaths = Array.isArray(body.lockedPaths)
    ? (body.lockedPaths as unknown[]).map((p) => String(p))
    : undefined;

  try {
    const row = await createCampaignTemplateFromCampaign(campaignId, session.id, {
      name,
      description: description || undefined,
      lockedPaths,
    });
    if (!row) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ template: campaignTemplateToJSON(row) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
