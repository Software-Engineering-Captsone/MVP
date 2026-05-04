import { createClient } from '@/lib/supabase/server';
import { computeDealNextAction } from './nextAction';
import type { DealNextActor, DealStatus, StoredDeal } from './types';

/**
 * Phase-1 Supabase-backed read API for deals.
 *
 * The legacy repository.ts in this directory is the in-memory localCampaignStore
 * implementation kept as a spec while we migrate. New code reads through here.
 * RLS scopes results to the calling user (brand or athlete on the deal), so the
 * caller does not need to pass a role.
 *
 * Phase 1 returns deal rows only. Deliverables, contracts, payments, and
 * activities ride in as their own tables in later phases; for now the detail
 * endpoint shape is satisfied with empty arrays / null children so the UI can
 * load against real deal data.
 */

interface DbDealRow {
  id: string;
  offer_id: string;
  brand_id: string;
  athlete_id: string;
  campaign_id: string | null;
  application_id: string | null;
  chat_thread_id: string | null;
  terms_snapshot: unknown;
  status: string;
  contract_id: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiDealRow {
  id: string;
  offerId: string;
  brandUserId: string;
  athleteUserId: string;
  campaignId: string | null;
  applicationId: string | null;
  chatThreadId: string | null;
  termsSnapshot: unknown;
  status: string;
  contractId: string;
  paymentId: string;
  nextActionOwner: DealNextActor | null;
  nextActionLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDealDetail {
  deal: ApiDealRow;
  contract: null;
  payment: null;
  deliverables: [];
  activities: [];
}

const DEAL_SELECT =
  'id, offer_id, brand_id, athlete_id, campaign_id, application_id, ' +
  'chat_thread_id, terms_snapshot, status, contract_id, payment_id, ' +
  'created_at, updated_at';

function dbDealToApi(row: DbDealRow): ApiDealRow {
  // computeDealNextAction expects a StoredDeal-shaped object plus the related
  // child rows. In Phase 1 there are no children yet, so the contract/payment
  // branches in the computer return their unconfigured-state defaults — which
  // is exactly what we want for a freshly created deal.
  const dealStub: StoredDeal = {
    _id: row.id,
    offerId: row.offer_id,
    brandUserId: row.brand_id,
    athleteUserId: row.athlete_id,
    campaignId: row.campaign_id,
    applicationId: row.application_id,
    chatThreadId: row.chat_thread_id,
    termsSnapshot:
      row.terms_snapshot && typeof row.terms_snapshot === 'object'
        ? (row.terms_snapshot as Record<string, unknown>)
        : {},
    status: row.status as DealStatus,
    contractId: row.contract_id ?? '',
    paymentId: row.payment_id ?? '',
    nextActionOwner: null,
    nextActionLabel: '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  const next = computeDealNextAction({
    deal: dealStub,
    contract: null,
    payment: null,
    deliverables: [],
  });
  return {
    id: row.id,
    offerId: row.offer_id,
    brandUserId: row.brand_id,
    athleteUserId: row.athlete_id,
    campaignId: row.campaign_id,
    applicationId: row.application_id,
    chatThreadId: row.chat_thread_id,
    termsSnapshot: row.terms_snapshot ?? {},
    status: row.status,
    contractId: row.contract_id ?? '',
    paymentId: row.payment_id ?? '',
    nextActionOwner: next.nextActionOwner,
    nextActionLabel: next.nextActionLabel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List deals visible to the current user. RLS scopes the result to deals
 * where the user is the brand or the athlete; no client-side role hinting
 * is needed. Optional status filter is validated by the route handler.
 */
export async function listDealsForCurrentUser(status?: string): Promise<ApiDealRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('deals')
    .select(DEAL_SELECT)
    .order('updated_at', { ascending: false });
  const trimmed = typeof status === 'string' ? status.trim() : '';
  if (trimmed) {
    query = query.eq('status', trimmed);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbDealToApi(r as unknown as DbDealRow));
}

/**
 * Fetch a single deal + Phase-1 placeholder children. RLS rejects access
 * for non-participants, so a missing row is reported to the caller as
 * "not found" without us having to check brand/athlete membership ourselves.
 */
export async function getDealDetailForCurrentUser(
  dealId: string,
): Promise<ApiDealDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deals')
    .select(DEAL_SELECT)
    .eq('id', dealId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    deal: dbDealToApi(data as unknown as DbDealRow),
    contract: null,
    payment: null,
    deliverables: [],
    activities: [],
  };
}
