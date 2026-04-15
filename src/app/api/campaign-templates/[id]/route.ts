import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  getCampaignTemplateById,
  patchCampaignTemplate,
  type PatchCampaignTemplateInput,
} from '@/lib/campaigns/repository';
import { campaignTemplateToJSON } from '@/lib/campaigns/campaignTemplateSerialization';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

function isSystemRow(orgId: unknown): boolean {
  return orgId == null || orgId === '';
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.status !== undefined && body.status !== 'archived') {
    return NextResponse.json({ error: 'Only status "archived" is supported' }, { status: 400 });
  }

  const hasStatus = body.status === 'archived';
  const hasName = body.name !== undefined;
  const hasDescription = body.description !== undefined;
  const hasLocked = body.lockedPaths !== undefined;
  const hasDefaults = body.defaults !== undefined;
  const bumpVersion = body.bumpVersion === true;

  if (!hasStatus && !hasName && !hasDescription && !hasLocked && !hasDefaults) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  if (bumpVersion && !hasDefaults) {
    return NextResponse.json({ error: 'bumpVersion requires defaults' }, { status: 400 });
  }

  const existing = await getCampaignTemplateById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (isSystemRow(existing.orgId)) {
    return NextResponse.json({ error: 'System templates are read-only' }, { status: 403 });
  }
  if (String(existing.orgId) !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const patch: PatchCampaignTemplateInput = {};
  if (hasStatus) patch.status = 'archived';
  if (typeof body.name === 'string') patch.name = body.name;
  if (body.description === null) patch.description = null;
  else if (typeof body.description === 'string') patch.description = body.description;
  if (Array.isArray(body.lockedPaths)) {
    patch.lockedPaths = (body.lockedPaths as unknown[]).map((p) => String(p));
  }
  if (hasDefaults) {
    patch.defaults = body.defaults;
    if (bumpVersion) patch.bumpVersion = true;
  }

  const updated = await patchCampaignTemplate(id, session.id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ template: campaignTemplateToJSON(updated) });
}
