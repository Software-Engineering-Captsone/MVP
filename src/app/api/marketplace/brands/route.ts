import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Brand } from '@/lib/mockData';

/**
 * GET /api/marketplace/brands
 * Returns brand_profiles joined to profiles (for logo/verified), mapped to the
 * legacy `Brand` shape used by the discovery UI.
 *
 * RLS: brand_profiles allows public select; profiles allows public select
 * when onboarding_completed_at is not null.
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('brand_profiles')
    .select(`
      brand_id, company_name, industry, tagline, about, hq_city, hq_state,
      profiles!inner(avatar_url, verified)
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const brands: Brand[] = (data ?? []).map((row) => mapRowToBrand(row as unknown as Row));
  return NextResponse.json(brands);
}

export const dynamic = 'force-dynamic';

type Row = {
  brand_id: string;
  company_name: string | null;
  industry: string | null;
  tagline: string | null;
  about: string | null;
  hq_city: string | null;
  hq_state: string | null;
  profiles: { avatar_url: string | null; verified: boolean | null } | null;
};

function mapRowToBrand(row: Row): Brand {
  const city = (row.hq_city || '').trim();
  const state = (row.hq_state || '').trim();
  const location = [city, state].filter(Boolean).join(', ');
  const profile = row.profiles ?? null;

  return {
    id: row.brand_id,
    name: row.company_name || 'Brand',
    industry: row.industry || 'Other',
    location,
    image: profile?.avatar_url || '',
    verified: !!profile?.verified,
    stats: { instagram: '0', tiktok: '0', twitter: '0' },
    bio: row.tagline || row.about || '',
    contentImages: [],
  };
}
