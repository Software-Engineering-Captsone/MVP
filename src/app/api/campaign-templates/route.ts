import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import {
  createOrgCampaignTemplate,
  listCampaignTemplates,
} from '@/lib/campaigns/repository';
import { campaignTemplateToJSON } from '@/lib/campaigns/campaignTemplateSerialization';
import { createClient } from '@/lib/supabase/server';

function parseScope(raw: string | null): 'system' | 'org' | 'all' | null {
  if (raw === 'system' || raw === 'org' || raw === 'all') return raw;
  return null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = parseScope(request.nextUrl.searchParams.get('scope'));
  if (!scope) {
    return NextResponse.json(
      { error: 'Invalid or missing scope (use system, org, or all)' },
      { status: 400 }
    );
  }

  if (session.role === 'athlete' && scope !== 'system') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await listCampaignTemplates(scope, session.id, session.role);
    return NextResponse.json({ templates: rows.map(campaignTemplateToJSON) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'brand') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const lockedPaths = Array.isArray(body.lockedPaths)
    ? (body.lockedPaths as unknown[]).map((p) => String(p))
    : undefined;

  try {
    const row = await createOrgCampaignTemplate(session.id, {
      name,
      description: description || undefined,
      defaults: body.defaults,
      lockedPaths,
    });
    return NextResponse.json({ template: campaignTemplateToJSON(row) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
