import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidSavedSnapshot } from '@/lib/saved/types';
import type { SavedSnapshot } from '@/lib/saved/types';

/**
 * GET  → `{ athleteIds, brandIds }` for the current user.
 *        Brand role: athleteIds populated from saved_athletes; brandIds=[].
 *        Athlete role: brandIds populated from saved_brands;   athleteIds=[].
 * PUT  → Replace the relevant side. Diffs against DB and applies inserts/deletes.
 *        The non-applicable side is ignored (e.g. an athlete cannot write athleteIds).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = user.user_metadata?.role === 'brand' ? 'brand' : 'athlete';

  if (role === 'brand') {
    const { data, error: qErr } = await supabase
      .from('saved_athletes')
      .select('athlete_id')
      .eq('brand_id', user.id);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    const snapshot: SavedSnapshot = {
      athleteIds: (data ?? []).map((r) => String(r.athlete_id)),
      brandIds: [],
    };
    return NextResponse.json(snapshot);
  }

  const { data, error: qErr } = await supabase
    .from('saved_brands')
    .select('brand_id')
    .eq('athlete_id', user.id);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  const snapshot: SavedSnapshot = {
    athleteIds: [],
    brandIds: (data ?? []).map((r) => String(r.brand_id)),
  };
  return NextResponse.json(snapshot);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isValidSavedSnapshot(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const role = user.user_metadata?.role === 'brand' ? 'brand' : 'athlete';

  if (role === 'brand') {
    const desired = new Set(body.athleteIds);
    const { data: existing, error: qErr } = await supabase
      .from('saved_athletes')
      .select('athlete_id')
      .eq('brand_id', user.id);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    const current = new Set((existing ?? []).map((r) => String(r.athlete_id)));

    const toInsert = [...desired].filter((id) => !current.has(id));
    const toDelete = [...current].filter((id) => !desired.has(id));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('saved_athletes')
        .insert(toInsert.map((athlete_id) => ({ brand_id: user.id, athlete_id })));
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('saved_athletes')
        .delete()
        .eq('brand_id', user.id)
        .in('athlete_id', toDelete);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const snapshot: SavedSnapshot = { athleteIds: [...desired], brandIds: [] };
    return NextResponse.json(snapshot);
  }

  const desired = new Set(body.brandIds);
  const { data: existing, error: qErr } = await supabase
    .from('saved_brands')
    .select('brand_id')
    .eq('athlete_id', user.id);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  const current = new Set((existing ?? []).map((r) => String(r.brand_id)));

  const toInsert = [...desired].filter((id) => !current.has(id));
  const toDelete = [...current].filter((id) => !desired.has(id));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from('saved_brands')
      .insert(toInsert.map((brand_id) => ({ athlete_id: user.id, brand_id })));
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('saved_brands')
      .delete()
      .eq('athlete_id', user.id)
      .in('brand_id', toDelete);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const snapshot: SavedSnapshot = { athleteIds: [], brandIds: [...desired] };
  return NextResponse.json(snapshot);
}

export const dynamic = 'force-dynamic';
