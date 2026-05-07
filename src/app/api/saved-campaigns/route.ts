import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';

type SavedCampaignsBody = {
  campaignIds?: unknown;
};

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === 'string')) return null;
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'athlete') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('saved_campaigns')
    .select('campaign_id')
    .eq('athlete_id', user.userId)
    .order('saved_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    campaignIds: (data ?? []).map((row) => String(row.campaign_id)),
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'athlete') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: SavedCampaignsBody;
  try {
    body = (await request.json()) as SavedCampaignsBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const desiredIds = stringArray(body.campaignIds);
  if (!desiredIds) {
    return NextResponse.json({ error: 'campaignIds must be an array of strings' }, { status: 400 });
  }

  const { data: existing, error: existingErr } = await supabase
    .from('saved_campaigns')
    .select('campaign_id')
    .eq('athlete_id', user.userId);
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

  const desired = new Set(desiredIds);
  const current = new Set((existing ?? []).map((row) => String(row.campaign_id)));
  const toInsert = [...desired].filter((id) => !current.has(id));
  const toDelete = [...current].filter((id) => !desired.has(id));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('saved_campaigns').insert(
      toInsert.map((campaign_id) => ({
        athlete_id: user.userId,
        campaign_id,
      })),
    );
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (toDelete.length > 0) {
    const { error: deleteErr } = await supabase
      .from('saved_campaigns')
      .delete()
      .eq('athlete_id', user.userId)
      .in('campaign_id', toDelete);
    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ campaignIds: desiredIds });
}

export const dynamic = 'force-dynamic';
