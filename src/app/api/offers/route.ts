import { NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { readLocalCampaignStore } from '@/lib/campaigns/localCampaignStore';
import { listOffersForAthlete } from '@/lib/campaigns/repository';
import { findUserById } from '@/lib/auth/localUserRepository';
import { offerToJSON } from '@/lib/campaigns/serialization';

type AthleteOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

function extractDeadline(offer: Record<string, unknown>): string | null {
  const sd = offer.structuredDraft as Record<string, unknown> | undefined;
  const wizard =
    sd && typeof sd.wizard === 'object' && !Array.isArray(sd.wizard)
      ? (sd.wizard as Record<string, unknown>)
      : undefined;
  const basics =
    wizard && typeof wizard.basics === 'object' && !Array.isArray(wizard.basics)
      ? (wizard.basics as Record<string, unknown>)
      : undefined;
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
  return raw === 'sent' ? 'pending' : 'pending';
}

function shortDescription(offer: Record<string, unknown>): string {
  const sd = offer.structuredDraft as Record<string, unknown> | undefined;
  const wizard =
    sd && typeof sd.wizard === 'object' && !Array.isArray(sd.wizard)
      ? (sd.wizard as Record<string, unknown>)
      : undefined;
  const basics =
    wizard && typeof wizard.basics === 'object' && !Array.isArray(wizard.basics)
      ? (wizard.basics as Record<string, unknown>)
      : undefined;
  const details = typeof basics?.details === 'string' ? basics.details.trim() : '';
  const notes = typeof offer.notes === 'string' ? offer.notes.trim() : '';
  const src = details || notes;
  return src.length > 180 ? `${src.slice(0, 177)}...` : src;
}

function compensationSummary(offer: Record<string, unknown>): string {
  const sd = offer.structuredDraft as Record<string, unknown> | undefined;
  const wizard =
    sd && typeof sd.wizard === 'object' && !Array.isArray(sd.wizard)
      ? (sd.wizard as Record<string, unknown>)
      : undefined;
  const basics =
    wizard && typeof wizard.basics === 'object' && !Array.isArray(wizard.basics)
      ? (wizard.basics as Record<string, unknown>)
      : undefined;
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
  const snapshot = await readLocalCampaignStore();
  const now = Date.now();

  const rows = await Promise.all(
    offers.map(async (offer) => {
      const row = offer as Record<string, unknown>;
      const campaignId = row.campaignId != null && String(row.campaignId).trim() ? String(row.campaignId) : null;
      const campaign = campaignId
        ? snapshot.campaigns.find((c) => String(c._id) === campaignId) ?? null
        : null;
      const brandId = String(row.brandUserId ?? '');
      const brandUser = brandId ? await findUserById(brandId) : null;
      const status = computeAthleteStatus(row, now);
      return {
        ...offerToJSON(offer, snapshot.campaigns),
        athleteOfferStatus: status,
        brandName:
          (brandUser && typeof brandUser.name === 'string' && brandUser.name.trim()) ||
          (campaign && typeof campaign.brandDisplayName === 'string' && campaign.brandDisplayName.trim()) ||
          'Brand',
        campaignName: campaign && typeof campaign.name === 'string' ? campaign.name : null,
        shortDescription: shortDescription(row),
        compensationSummary: compensationSummary(row),
        deadline: extractDeadline(row),
        createdAt: row.createdAt ?? null,
      };
    })
  );

  return NextResponse.json({ offers: rows });
}

