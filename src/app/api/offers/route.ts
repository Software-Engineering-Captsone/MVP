import { NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { listOffersForAthlete } from '@/lib/campaigns/repository';
import { findUserById } from '@/lib/auth/localUserRepository';
import { offerToJSON } from '@/lib/campaigns/serialization';

type AthleteOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

function pickRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function basicsOf(offer: Record<string, unknown>): Record<string, unknown> | undefined {
  const sd = pickRecord(offer.structuredDraft);
  const wizard = pickRecord(sd?.wizard);
  return pickRecord(wizard?.basics);
}

function extractDeadline(offer: Record<string, unknown>): string | null {
  const basics = basicsOf(offer);
  const dueDate = typeof basics?.dueDate === 'string' ? basics.dueDate.trim() : '';
  return dueDate || null;
}

function computeAthleteStatus(offer: Record<string, unknown>, now: number): AthleteOfferStatus {
  const raw = String(offer.status ?? 'draft');
  if (raw === 'accepted') return 'accepted';
  if (raw === 'declined') return 'declined';
  const deadline = extractDeadline(offer);
  if (raw === 'sent' && deadline) {
    const t = new Date(deadline).getTime();
    if (!Number.isNaN(t) && t < now) return 'expired';
  }
  return 'pending';
}

function shortDescription(offer: Record<string, unknown>): string {
  const basics = basicsOf(offer);
  const details = typeof basics?.details === 'string' ? basics.details.trim() : '';
  const notes = typeof offer.notes === 'string' ? offer.notes.trim() : '';
  const src = details || notes;
  return src.length > 180 ? `${src.slice(0, 177)}...` : src;
}

function compensationSummary(offer: Record<string, unknown>): string {
  const basics = basicsOf(offer);
  const amount = typeof basics?.amount === 'string' ? basics.amount.trim() : '';
  if (amount) return amount;
  const notes = typeof offer.notes === 'string' ? offer.notes.trim() : '';
  return notes || 'Compensation shared in offer details';
}

export async function GET() {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'athlete') return jsonError(403, 'Forbidden');

  const offers = await listOffersForAthlete(session.id);
  const now = Date.now();

  const campaignIds = Array.from(
    new Set(
      offers
        .map((o) => o.campaignId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );
  const brandIds = Array.from(new Set(offers.map((o) => o.brandUserId).filter(Boolean)));

  const [campaignRes, brandRes] = await Promise.all([
    campaignIds.length
      ? supabase.from('campaigns').select('id, name, brand_id').in('id', campaignIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; brand_id: string }> }),
    brandIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', brandIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
  ]);

  const campaignsById = new Map<string, { name: string | null }>();
  for (const row of campaignRes.data ?? []) {
    campaignsById.set(row.id, { name: row.name ?? null });
  }
  const brandNameById = new Map<string, string>();
  for (const row of brandRes.data ?? []) {
    if (row.full_name && row.full_name.trim()) {
      brandNameById.set(row.id, row.full_name.trim());
    }
  }

  const rows = await Promise.all(
    offers.map(async (offer) => {
      const row = offer as unknown as Record<string, unknown>;
      const campaign = offer.campaignId ? campaignsById.get(offer.campaignId) ?? null : null;
      let brandName = brandNameById.get(offer.brandUserId) ?? '';
      if (!brandName) {
        const localUser = await findUserById(offer.brandUserId);
        brandName = (localUser?.name ?? '').trim();
      }
      const status = computeAthleteStatus(row, now);
      return {
        ...offerToJSON(offer),
        athleteOfferStatus: status,
        brandName: brandName || 'Brand',
        campaignName: campaign?.name ?? null,
        shortDescription: shortDescription(row),
        compensationSummary: compensationSummary(row),
        deadline: extractDeadline(row),
        createdAt: offer.createdAt,
      };
    }),
  );

  return NextResponse.json({ offers: rows });
}
