import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/jsonError';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { createClient } from '@/lib/supabase/server';
import { loadInboxItems } from '@/lib/chat/service';
import { listDealsForCurrentUser, type ApiDealRow } from '@/lib/campaigns/deals/supabaseRepository';

type AthleteDashboardDeal = {
  id: string;
  dealId: string;
  brand: string;
  type: string;
  value: string;
  deadline: string | null;
};

type AthleteOnboardingState = {
  basics?: { full_name?: string | null } | null;
  athletic?: { sports?: unknown[] | null } | null;
  academic?: { school?: string | null; school_email?: string | null } | null;
  compliance?: { school_email_verified?: boolean | null } | null;
  profile?: { bio?: string | null; avatar_url?: string | null } | null;
} | null;

const OPEN_DEAL_STATUSES = new Set([
  'created',
  'contract_pending',
  'active',
  'submission_in_progress',
  'under_review',
  'revision_requested',
  'approved_completed',
  'payment_pending',
]);

function pickRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function compensationAmountFromDealSnapshot(termsSnapshot: unknown): number {
  const root = pickRecord(termsSnapshot);
  const frozen = pickRecord(root.frozen);
  const comp = pickRecord(frozen.compensationSummary);
  const amount = comp.amount;
  return typeof amount === 'number' && Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function compensationLabelFromDealSnapshot(termsSnapshot: unknown): string {
  const root = pickRecord(termsSnapshot);
  const frozen = pickRecord(root.frozen);
  const comp = pickRecord(frozen.compensationSummary);
  const amountLabel = typeof comp.amountLabel === 'string' ? comp.amountLabel.trim() : '';
  if (amountLabel) return amountLabel;
  const amount = compensationAmountFromDealSnapshot(termsSnapshot);
  const currency = typeof comp.currency === 'string' && comp.currency.trim() ? comp.currency.trim() : 'USD';
  if (amount > 0) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return 'Compensation in deal terms';
}

function deadlineFromDealSnapshot(termsSnapshot: unknown): string | null {
  const root = pickRecord(termsSnapshot);
  const frozen = pickRecord(root.frozen);
  const deadlines = pickRecord(frozen.deadlines);
  const offerDueDate = typeof deadlines.offerDueDate === 'string' ? deadlines.offerDueDate.trim() : '';
  if (offerDueDate) return offerDueDate;

  const deliverables = Array.isArray(frozen.deliverables) ? frozen.deliverables : [];
  const dueTimes = deliverables
    .map((item) => {
      const record = pickRecord(item);
      const dueAt = typeof record.dueAt === 'string' ? record.dueAt.trim() : '';
      const time = dueAt ? new Date(dueAt).getTime() : Number.NaN;
      return Number.isFinite(time) ? { dueAt, time } : null;
    })
    .filter((item): item is { dueAt: string; time: number } => item !== null)
    .sort((a, b) => a.time - b.time);
  return dueTimes[0]?.dueAt ?? null;
}

function profileCompletionFromState(state: AthleteOnboardingState): number {
  const checks = [
    Boolean(state?.basics?.full_name?.trim()),
    (state?.athletic?.sports?.length ?? 0) > 0,
    Boolean(state?.academic?.school?.trim()) && Boolean(state?.academic?.school_email?.trim()),
    state?.compliance?.school_email_verified === true,
    Boolean(state?.profile?.bio?.trim()) || Boolean(state?.profile?.avatar_url?.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function toDashboardDeal(deal: ApiDealRow): AthleteDashboardDeal {
  return {
    id: deal.id,
    dealId: deal.id,
    brand: deal.brandName || 'Brand',
    type: deal.campaignName || 'Direct collaboration',
    value: compensationLabelFromDealSnapshot(deal.termsSnapshot),
    deadline: deadlineFromDealSnapshot(deal.termsSnapshot),
  };
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'athlete') return jsonError(403, 'Forbidden');

  const supabase = await createClient();

  try {
    const [deals, inboxItemsResult, onboardingResult] = await Promise.all([
      listDealsForCurrentUser(),
      loadInboxItems(supabase, user.userId).catch(() => []),
      supabase.rpc('get_athlete_onboarding_state'),
    ]);

    if (onboardingResult.error) throw new Error(onboardingResult.error.message);

    const activeDeals = deals.filter((deal) => OPEN_DEAL_STATUSES.has(deal.status));
    const totalEarnings = deals
      .filter((deal) => deal.status !== 'cancelled' && deal.status !== 'disputed')
      .reduce((sum, deal) => sum + compensationAmountFromDealSnapshot(deal.termsSnapshot), 0);
    const unreadMessages = inboxItemsResult.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
    const profileCompletion = profileCompletionFromState(
      (onboardingResult.data ?? null) as AthleteOnboardingState,
    );

    return NextResponse.json({
      stats: {
        totalEarnings,
        activeDeals: activeDeals.length,
        unreadMessages,
        profileCompletion,
      },
      activeDeals: activeDeals.slice(0, 5).map(toDashboardDeal),
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load athlete dashboard';
    return jsonError(500, msg);
  }
}

export const dynamic = 'force-dynamic';
