import { createClient } from '@/lib/supabase/server';
import { computeDealNextAction } from './nextAction';
import {
  assertContractStatusTransition,
  assertDealStatusTransition,
  dealTransitionRequiresSignedContract,
} from './dealTransitions';
import { assertPaymentStatusTransition } from './paymentTransitions';
import type {
  ContractStatus,
  DealNextActor,
  DealStatus,
  PaymentStatus,
  StoredDeal,
} from './types';

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

export interface ApiContractRow {
  id: string;
  dealId: string;
  fileUrl: string | null;
  status: string;
  signedAt: string | null;
}

export interface ApiPaymentRow {
  id: string;
  dealId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerReference: string;
  releaseCondition: string;
  paidAt: string | null;
}

export interface ApiDealDetail {
  deal: ApiDealRow;
  contract: ApiContractRow | null;
  payment: ApiPaymentRow | null;
  deliverables: [];
  activities: [];
}

interface DbContractRow {
  id: string;
  deal_id: string;
  file_url: string | null;
  status: string;
  signed_at: string | null;
}

interface DbPaymentRow {
  id: string;
  deal_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_reference: string;
  release_condition: string;
  paid_at: string | null;
}

const CONTRACT_SELECT = 'id, deal_id, file_url, status, signed_at';
const PAYMENT_SELECT =
  'id, deal_id, amount, currency, status, provider, provider_reference, release_condition, paid_at';

function dbContractToApi(row: DbContractRow): ApiContractRow {
  return {
    id: row.id,
    dealId: row.deal_id,
    fileUrl: row.file_url,
    status: row.status,
    signedAt: row.signed_at,
  };
}

function dbPaymentToApi(row: DbPaymentRow): ApiPaymentRow {
  return {
    id: row.id,
    dealId: row.deal_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    releaseCondition: row.release_condition,
    paidAt: row.paid_at,
  };
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
  const dealRow = data as unknown as DbDealRow;

  const [contractRes, paymentRes] = await Promise.all([
    supabase.from('deal_contracts').select(CONTRACT_SELECT).eq('deal_id', dealRow.id).maybeSingle(),
    supabase.from('deal_payments').select(PAYMENT_SELECT).eq('deal_id', dealRow.id).maybeSingle(),
  ]);
  if (contractRes.error) throw new Error(contractRes.error.message);
  if (paymentRes.error) throw new Error(paymentRes.error.message);

  return {
    deal: dbDealToApi(dealRow),
    contract: contractRes.data ? dbContractToApi(contractRes.data as unknown as DbContractRow) : null,
    payment: paymentRes.data ? dbPaymentToApi(paymentRes.data as unknown as DbPaymentRow) : null,
    deliverables: [],
    activities: [],
  };
}

/* ─────────────────────────────────────────────────────────────────
 * Phase 3 mutation helpers
 *
 * RLS gates *who* can write; the transition validators below gate
 * *which* writes are legal moves in the lifecycle.
 * ───────────────────────────────────────────────────────────────── */

/**
 * Idempotently create the contract row for a deal and link it back.
 * Brand drives this; if a contract already exists we just update it
 * instead of erroring, so the UI can re-upload a replacement file.
 */
export async function createDealContract(
  dealId: string,
  fileUrl: string | null,
): Promise<ApiContractRow> {
  const supabase = await createClient();

  const { data: existing, error: existingErr } = await supabase
    .from('deal_contracts')
    .select(CONTRACT_SELECT)
    .eq('deal_id', dealId)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);

  if (existing) {
    const { data: updated, error: updateErr } = await supabase
      .from('deal_contracts')
      .update({ file_url: fileUrl, status: 'uploaded' })
      .eq('id', (existing as unknown as DbContractRow).id)
      .select(CONTRACT_SELECT)
      .single();
    if (updateErr || !updated) {
      throw new Error(updateErr?.message ?? 'Could not update contract');
    }
    return dbContractToApi(updated as unknown as DbContractRow);
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('deal_contracts')
    .insert({ deal_id: dealId, file_url: fileUrl, status: 'uploaded' })
    .select(CONTRACT_SELECT)
    .single();
  if (insertErr || !inserted) {
    throw new Error(insertErr?.message ?? 'Could not create contract');
  }
  const contract = dbContractToApi(inserted as unknown as DbContractRow);

  const { error: linkErr } = await supabase
    .from('deals')
    .update({ contract_id: contract.id })
    .eq('id', dealId);
  if (linkErr) throw new Error(linkErr.message);

  return contract;
}

export async function updateContractStatus(
  contractId: string,
  to: ContractStatus,
): Promise<ApiContractRow> {
  const supabase = await createClient();

  const { data: current, error: getErr } = await supabase
    .from('deal_contracts')
    .select(CONTRACT_SELECT)
    .eq('id', contractId)
    .maybeSingle();
  if (getErr) throw new Error(getErr.message);
  if (!current) throw new Error('Contract not found');

  const currentRow = current as unknown as DbContractRow;
  assertContractStatusTransition(currentRow.status as ContractStatus, to);

  const patch: Record<string, unknown> = { status: to };
  if (to === 'signed' && !currentRow.signed_at) {
    patch.signed_at = new Date().toISOString();
  }

  const { data: updated, error: updateErr } = await supabase
    .from('deal_contracts')
    .update(patch)
    .eq('id', contractId)
    .select(CONTRACT_SELECT)
    .single();
  if (updateErr || !updated) {
    throw new Error(updateErr?.message ?? 'Could not update contract');
  }
  return dbContractToApi(updated as unknown as DbContractRow);
}

export async function updatePaymentStatus(
  paymentId: string,
  to: PaymentStatus,
): Promise<ApiPaymentRow> {
  const supabase = await createClient();

  const { data: current, error: getErr } = await supabase
    .from('deal_payments')
    .select(PAYMENT_SELECT)
    .eq('id', paymentId)
    .maybeSingle();
  if (getErr) throw new Error(getErr.message);
  if (!current) throw new Error('Payment not found');

  const currentRow = current as unknown as DbPaymentRow;
  assertPaymentStatusTransition(currentRow.status as PaymentStatus, to);

  const patch: Record<string, unknown> = { status: to };
  if (to === 'paid' && !currentRow.paid_at) {
    patch.paid_at = new Date().toISOString();
  }

  const { data: updated, error: updateErr } = await supabase
    .from('deal_payments')
    .update(patch)
    .eq('id', paymentId)
    .select(PAYMENT_SELECT)
    .single();
  if (updateErr || !updated) {
    throw new Error(updateErr?.message ?? 'Could not update payment');
  }
  return dbPaymentToApi(updated as unknown as DbPaymentRow);
}

export async function updateDealStatus(
  dealId: string,
  to: DealStatus,
): Promise<ApiDealRow> {
  const supabase = await createClient();

  const { data: current, error: getErr } = await supabase
    .from('deals')
    .select(DEAL_SELECT)
    .eq('id', dealId)
    .maybeSingle();
  if (getErr) throw new Error(getErr.message);
  if (!current) throw new Error('Deal not found');

  const currentRow = current as unknown as DbDealRow;
  const from = currentRow.status as DealStatus;
  assertDealStatusTransition(from, to);

  if (dealTransitionRequiresSignedContract(from, to)) {
    const { data: contract, error: contractErr } = await supabase
      .from('deal_contracts')
      .select('status')
      .eq('deal_id', dealId)
      .maybeSingle();
    if (contractErr) throw new Error(contractErr.message);
    if (!contract || (contract as { status: string }).status !== 'signed') {
      throw new Error('Contract must be signed before activating the deal');
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('deals')
    .update({ status: to })
    .eq('id', dealId)
    .select(DEAL_SELECT)
    .single();
  if (updateErr || !updated) {
    throw new Error(updateErr?.message ?? 'Could not update deal');
  }
  return dbDealToApi(updated as unknown as DbDealRow);
}
