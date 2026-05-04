import { createClient } from '@/lib/supabase/server';
import { resolveContractFileUrlForDownload } from '@/lib/campaigns/deals/contractStorage';
import { notifyDealPlaceholder } from '@/lib/campaigns/deals/notifications';
import { computeDealNextAction, refineNextActionWithDeliverables } from './nextAction';
import {
  assertContractStatusTransition,
  assertDealStatusTransition,
  dealTransitionRequiresSignedContract,
} from './dealTransitions';
import { assertDeliverableStatusTransition } from './deliverableTransitions';
import { assertPaymentStatusTransition } from './paymentTransitions';
import { assertSubmissionStatusTransition } from './submissionTransitions';
import type {
  ActivityActorType,
  ActivityEntityType,
  ContractStatus,
  DealActivityEventType,
  DealNextActor,
  DealStatus,
  DeliverableStatus,
  DeliverableType,
  PaymentStatus,
  StoredDeal,
  StoredDealContract,
  StoredDealPayment,
  StoredDeliverable,
  SubmissionArtifact,
  SubmissionStatus,
  SubmissionType,
} from './types';

/**
 * Phase-1 Supabase-backed read API for deals.
 *
 * Deal reads and mutations for the Supabase-backed API. Legacy in-memory deal
 * flows were removed; campaigns/applications may still use local JSON separately.
 * RLS scopes results to the calling user (brand or athlete on the deal), so the
 * caller does not need to pass a role.
 *
 * Phase 1 returns deal rows only. Deliverables, contracts, payments, and
 * deliverables and activities are loaded from their tables for detail reads.
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

export interface ApiActivityRow {
  id: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ApiDealDetail {
  deal: ApiDealRow;
  contract: ApiContractRow | null;
  payment: ApiPaymentRow | null;
  deliverables: ApiDeliverableRow[];
  activities: ApiActivityRow[];
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

interface DbDeliverableRow {
  id: string;
  deal_id: string;
  title: string;
  order_index: number;
  type: string;
  instructions: string;
  status: string;
  due_at: string | null;
  draft_required: boolean;
  publish_required: boolean;
  proof_required: boolean;
  disclosure_required: boolean;
  revision_limit: number;
  revision_count_used: number;
}

interface DbSubmissionRow {
  id: string;
  deliverable_id: string;
  deal_id: string;
  version: number;
  submitted_by_profile_id: string;
  submitted_at: string;
  submission_type: string;
  artifacts: SubmissionArtifact[];
  notes: string;
  status: string;
  reviewed_by_profile_id: string | null;
  reviewed_at: string | null;
  feedback: string | null;
}

interface DbActivityRow {
  id: string;
  deal_id: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  actor_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiDeliverableRow {
  id: string;
  dealId: string;
  title: string;
  type: string;
  instructions: string;
  status: string;
  dueAt: string | null;
  draftRequired: boolean;
  publishRequired: boolean;
  proofRequired: boolean;
  disclosureRequired: boolean;
  revisionLimit: number;
  revisionCountUsed: number;
}

export interface ApiSubmissionRow {
  id: string;
  deliverableId: string;
  version: number;
  submittedBy: string;
  submittedAt: string;
  submissionType: string;
  artifacts: SubmissionArtifact[];
  notes: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  feedback: string | null;
}

const CONTRACT_SELECT = 'id, deal_id, file_url, status, signed_at';
const PAYMENT_SELECT =
  'id, deal_id, amount, currency, status, provider, provider_reference, release_condition, paid_at';
const DELIVERABLE_SELECT =
  'id, deal_id, title, order_index, type, instructions, status, due_at, draft_required, publish_required, proof_required, disclosure_required, revision_limit, revision_count_used';
const SUBMISSION_SELECT =
  'id, deliverable_id, deal_id, version, submitted_by_profile_id, submitted_at, submission_type, artifacts, notes, status, reviewed_by_profile_id, reviewed_at, feedback';
const ACTIVITY_SELECT =
  'id, deal_id, entity_type, entity_id, actor_type, actor_id, event_type, metadata, created_at';

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

function dbDeliverableToApi(row: DbDeliverableRow): ApiDeliverableRow {
  return {
    id: row.id,
    dealId: row.deal_id,
    title: row.title,
    type: row.type,
    instructions: row.instructions,
    status: row.status,
    dueAt: row.due_at,
    draftRequired: row.draft_required,
    publishRequired: row.publish_required,
    proofRequired: row.proof_required,
    disclosureRequired: row.disclosure_required,
    revisionLimit: row.revision_limit,
    revisionCountUsed: row.revision_count_used,
  };
}

function dbSubmissionToApi(row: DbSubmissionRow): ApiSubmissionRow {
  return {
    id: row.id,
    deliverableId: row.deliverable_id,
    version: row.version,
    submittedBy: row.submitted_by_profile_id,
    submittedAt: row.submitted_at,
    submissionType: row.submission_type,
    artifacts: Array.isArray(row.artifacts) ? row.artifacts : [],
    notes: row.notes,
    status: row.status,
    reviewedBy: row.reviewed_by_profile_id,
    reviewedAt: row.reviewed_at,
    feedback: row.feedback,
  };
}

function dbActivityToApi(row: DbActivityRow): ApiActivityRow {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    eventType: row.event_type,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function roleToActorType(role: 'brand' | 'athlete'): ActivityActorType {
  return role === 'brand' ? 'business' : 'athlete';
}

function deliverableDbToStored(row: DbDeliverableRow, dealRow: DbDealRow): StoredDeliverable {
  return {
    _id: row.id,
    dealId: row.deal_id,
    title: row.title,
    order: row.order_index,
    type: row.type as DeliverableType,
    instructions: row.instructions,
    status: row.status as DeliverableStatus,
    dueAt: row.due_at,
    draftRequired: row.draft_required,
    publishRequired: row.publish_required,
    proofRequired: row.proof_required,
    disclosureRequired: row.disclosure_required,
    revisionLimit: row.revision_limit,
    revisionCountUsed: row.revision_count_used,
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
  };
}

function contractApiToStored(c: ApiContractRow, dealRow: DbDealRow): StoredDealContract {
  return {
    _id: c.id,
    dealId: c.dealId,
    fileUrl: c.fileUrl,
    status: c.status as ContractStatus,
    signedAt: c.signedAt,
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
  };
}

function paymentApiToStored(p: ApiPaymentRow, dealRow: DbDealRow): StoredDealPayment {
  return {
    _id: p.id,
    dealId: p.dealId,
    amount: typeof p.amount === 'number' ? p.amount : Number(p.amount),
    currency: p.currency,
    status: p.status as PaymentStatus,
    provider: p.provider,
    providerReference: p.providerReference,
    releaseCondition: p.releaseCondition,
    paidAt: p.paidAt,
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
  };
}

function buildApiDealRowForDetail(
  dealRow: DbDealRow,
  contract: ApiContractRow | null,
  payment: ApiPaymentRow | null,
  deliverableRows: DbDeliverableRow[],
): ApiDealRow {
  const dealStub: StoredDeal = {
    _id: dealRow.id,
    offerId: dealRow.offer_id,
    brandUserId: dealRow.brand_id,
    athleteUserId: dealRow.athlete_id,
    campaignId: dealRow.campaign_id,
    applicationId: dealRow.application_id,
    chatThreadId: dealRow.chat_thread_id,
    termsSnapshot:
      dealRow.terms_snapshot && typeof dealRow.terms_snapshot === 'object'
        ? (dealRow.terms_snapshot as Record<string, unknown>)
        : {},
    status: dealRow.status as DealStatus,
    contractId: dealRow.contract_id ?? '',
    paymentId: dealRow.payment_id ?? '',
    nextActionOwner: null,
    nextActionLabel: '',
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
  };
  const deliverablesStored = deliverableRows.map((d) => deliverableDbToStored(d, dealRow));
  const contractStored = contract ? contractApiToStored(contract, dealRow) : null;
  const paymentStored = payment ? paymentApiToStored(payment, dealRow) : null;
  const base = computeDealNextAction({
    deal: dealStub,
    contract: contractStored,
    payment: paymentStored,
    deliverables: deliverablesStored,
  });
  const refined = refineNextActionWithDeliverables(base, dealStub, deliverablesStored);
  return {
    id: dealRow.id,
    offerId: dealRow.offer_id,
    brandUserId: dealRow.brand_id,
    athleteUserId: dealRow.athlete_id,
    campaignId: dealRow.campaign_id,
    applicationId: dealRow.application_id,
    chatThreadId: dealRow.chat_thread_id,
    termsSnapshot: dealRow.terms_snapshot ?? {},
    status: dealRow.status,
    contractId: dealRow.contract_id ?? '',
    paymentId: dealRow.payment_id ?? '',
    nextActionOwner: refined.nextActionOwner,
    nextActionLabel: refined.nextActionLabel,
    createdAt: dealRow.created_at,
    updatedAt: dealRow.updated_at,
  };
}

/** Call from API routes after successful mutations (e.g. offer accept). */
export async function recordDealActivity(input: {
  dealId: string;
  entityType: ActivityEntityType;
  entityId: string;
  eventType: DealActivityEventType;
  actorType: ActivityActorType;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('deal_activities').insert({
    deal_id: input.dealId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    event_type: input.eventType,
    actor_type: input.actorType,
    actor_id: input.actorId,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

export type DealMutationActor = { userId: string; role: 'brand' | 'athlete' };

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

  const { data: deliverables, error: deliverablesErr } = await supabase
    .from('deal_deliverables')
    .select(DELIVERABLE_SELECT)
    .eq('deal_id', dealRow.id)
    .order('order_index', { ascending: true });
  if (deliverablesErr) throw new Error(deliverablesErr.message);

  const deliverableRows = (deliverables ?? []) as unknown as DbDeliverableRow[];
  let contractApi = contractRes.data ? dbContractToApi(contractRes.data as unknown as DbContractRow) : null;
  const paymentApi = paymentRes.data ? dbPaymentToApi(paymentRes.data as unknown as DbPaymentRow) : null;

  if (contractApi?.fileUrl != null && contractApi.fileUrl.trim() !== '') {
    const resolved = await resolveContractFileUrlForDownload(supabase, contractApi.fileUrl);
    contractApi = { ...contractApi, fileUrl: resolved };
  }

  const { data: activityRows, error: activitiesErr } = await supabase
    .from('deal_activities')
    .select(ACTIVITY_SELECT)
    .eq('deal_id', dealRow.id)
    .order('created_at', { ascending: true });
  if (activitiesErr) throw new Error(activitiesErr.message);

  return {
    deal: buildApiDealRowForDetail(dealRow, contractApi, paymentApi, deliverableRows),
    contract: contractApi,
    payment: paymentApi,
    deliverables: deliverableRows.map((d) => dbDeliverableToApi(d)),
    activities: (activityRows ?? []).map((a) => dbActivityToApi(a as unknown as DbActivityRow)),
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
  actor: DealMutationActor,
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
    const out = dbContractToApi(updated as unknown as DbContractRow);
    await recordDealActivity({
      dealId,
      entityType: 'deal',
      entityId: dealId,
      eventType: 'contract_uploaded',
      actorType: roleToActorType(actor.role),
      actorId: actor.userId,
      metadata: { contractId: out.id },
    });
    notifyDealPlaceholder('contract_uploaded', { dealId, contractId: out.id });
    return out;
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

  await recordDealActivity({
    dealId,
    entityType: 'deal',
    entityId: dealId,
    eventType: 'contract_uploaded',
    actorType: roleToActorType(actor.role),
    actorId: actor.userId,
    metadata: { contractId: contract.id },
  });
  notifyDealPlaceholder('contract_uploaded', { dealId, contractId: contract.id });

  return contract;
}

export async function updateContractStatus(
  contractId: string,
  to: ContractStatus,
  actor: DealMutationActor,
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
  const out = dbContractToApi(updated as unknown as DbContractRow);
  if (to === 'signed') {
    await recordDealActivity({
      dealId: currentRow.deal_id,
      entityType: 'deal',
      entityId: currentRow.deal_id,
      eventType: 'contract_signed',
      actorType: roleToActorType(actor.role),
      actorId: actor.userId,
      metadata: { contractId },
    });
    notifyDealPlaceholder('contract_signed', { dealId: currentRow.deal_id, contractId });
  }
  return out;
}

export async function updatePaymentStatus(
  paymentId: string,
  to: PaymentStatus,
  actor: DealMutationActor,
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
  const fromStatus = currentRow.status as PaymentStatus;
  assertPaymentStatusTransition(fromStatus, to);

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
  const out = dbPaymentToApi(updated as unknown as DbPaymentRow);
  const eventType: DealActivityEventType = to === 'paid' ? 'payment_paid' : 'payment_status_changed';
  await recordDealActivity({
    dealId: currentRow.deal_id,
    entityType: 'deal',
    entityId: currentRow.deal_id,
    eventType,
    actorType: roleToActorType(actor.role),
    actorId: actor.userId,
    metadata: { paymentId, from: fromStatus, to },
  });
  if (to === 'paid') {
    notifyDealPlaceholder('payment_paid', { dealId: currentRow.deal_id, paymentId });
  } else {
    notifyDealPlaceholder('payment_status_changed', {
      dealId: currentRow.deal_id,
      paymentId,
      from: fromStatus,
      to,
    });
  }
  return out;
}

export async function updateDealStatus(
  dealId: string,
  to: DealStatus,
  actor: DealMutationActor,
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
  const outRow = updated as unknown as DbDealRow;
  const evt =
    to === 'approved_completed'
      ? ('deal_completed' as const)
      : to === 'payment_pending'
        ? ('payment_pending' as const)
        : to === 'paid'
          ? ('payment_paid' as const)
          : null;
  if (evt) {
    await recordDealActivity({
      dealId,
      entityType: 'deal',
      entityId: dealId,
      eventType: evt,
      actorType: roleToActorType(actor.role),
      actorId: actor.userId,
      metadata: { from: currentRow.status, to },
    });
    if (evt === 'deal_completed') {
      notifyDealPlaceholder('deal_completed', { dealId });
      notifyDealPlaceholder('payment_pending', { dealId, reason: 'deal_status' });
    } else if (evt === 'payment_pending') {
      notifyDealPlaceholder('payment_pending', { dealId, reason: 'deal_status' });
    } else if (evt === 'payment_paid') {
      notifyDealPlaceholder('payment_paid', { dealId });
    }
  }
  return dbDealToApi(outRow);
}

export async function listSubmissionsForDeliverable(
  deliverableId: string,
): Promise<ApiSubmissionRow[]> {
  const supabase = await createClient();

  const { data: deliverable, error: deliverableErr } = await supabase
    .from('deal_deliverables')
    .select('id')
    .eq('id', deliverableId)
    .maybeSingle();
  if (deliverableErr) throw new Error(deliverableErr.message);
  if (!deliverable) throw new Error('Deliverable not found');

  const { data: submissions, error: submissionsErr } = await supabase
    .from('deliverable_submissions')
    .select(SUBMISSION_SELECT)
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: true });
  if (submissionsErr) throw new Error(submissionsErr.message);

  return (submissions ?? []).map((s) => dbSubmissionToApi(s as unknown as DbSubmissionRow));
}

export async function createSubmissionForDeliverable(
  deliverableId: string,
  submittedByProfileId: string,
  body: { notes?: string; body?: string; submissionType?: string; artifacts?: SubmissionArtifact[] },
): Promise<ApiSubmissionRow> {
  const supabase = await createClient();

  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const legacyBody = typeof body.body === 'string' ? body.body.trim() : '';
  const artifacts: SubmissionArtifact[] = Array.isArray(body.artifacts)
    ? body.artifacts
    : legacyBody
      ? [{ kind: 'text', text: legacyBody }]
      : [];
  if (!notes && artifacts.length === 0) {
    throw new Error('Provide notes and/or artifacts (or legacy body)');
  }

  const { data: deliverable, error: deliverableErr } = await supabase
    .from('deal_deliverables')
    .select(DELIVERABLE_SELECT)
    .eq('id', deliverableId)
    .maybeSingle();
  if (deliverableErr) throw new Error(deliverableErr.message);
  if (!deliverable) throw new Error('Deliverable not found');
  const deliverableRow = deliverable as unknown as DbDeliverableRow;

  assertDeliverableStatusTransition(deliverableRow.status as DeliverableStatus, 'draft_submitted');

  const { data: latestSubmission, error: latestErr } = await supabase
    .from('deliverable_submissions')
    .select('version')
    .eq('deliverable_id', deliverableId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) throw new Error(latestErr.message);
  const nextVersion = ((latestSubmission as { version?: number } | null)?.version ?? 0) + 1;

  const hasFile = artifacts.some((a) => a.kind === 'file');
  const hasUrl = artifacts.some((a) => a.kind === 'url');
  const hasText = artifacts.some((a) => a.kind === 'text');
  const requestedType = typeof body.submissionType === 'string' ? body.submissionType : '';
  const submissionType = ((): SubmissionType => {
    if (requestedType === 'file' || requestedType === 'url' || requestedType === 'text' || requestedType === 'mixed') {
      return requestedType;
    }
    const count = (hasFile ? 1 : 0) + (hasUrl ? 1 : 0) + (hasText ? 1 : 0);
    if (count > 1) return 'mixed';
    if (hasFile) return 'file';
    if (hasUrl) return 'url';
    return 'text';
  })();

  const now = new Date().toISOString();
  const { data: inserted, error: insertErr } = await supabase
    .from('deliverable_submissions')
    .insert({
      deliverable_id: deliverableId,
      deal_id: deliverableRow.deal_id,
      version: nextVersion,
      submitted_by_profile_id: submittedByProfileId,
      submitted_at: now,
      submission_type: submissionType,
      artifacts,
      notes,
      status: 'submitted',
      reviewed_by_profile_id: null,
      reviewed_at: null,
      feedback: null,
    })
    .select(SUBMISSION_SELECT)
    .single();
  if (insertErr || !inserted) {
    throw new Error(insertErr?.message ?? 'Could not create submission');
  }

  const { error: deliverableUpdateErr } = await supabase
    .from('deal_deliverables')
    .update({ status: 'draft_submitted' })
    .eq('id', deliverableId);
  if (deliverableUpdateErr) throw new Error(deliverableUpdateErr.message);

  const apiSub = dbSubmissionToApi(inserted as unknown as DbSubmissionRow);
  await recordDealActivity({
    dealId: deliverableRow.deal_id,
    entityType: 'submission',
    entityId: apiSub.id,
    eventType: 'submission_submitted',
    actorType: 'athlete',
    actorId: submittedByProfileId,
    metadata: { deliverableId, version: apiSub.version },
  });
  notifyDealPlaceholder('submission_submitted', {
    dealId: deliverableRow.deal_id,
    submissionId: apiSub.id,
    deliverableId,
  });

  return apiSub;
}

export async function updateDeliverable(
  deliverableId: string,
  patch: { status?: DeliverableStatus; title?: string; description?: string },
  actor: DealMutationActor,
): Promise<ApiDeliverableRow> {
  const supabase = await createClient();

  const { data: current, error: currentErr } = await supabase
    .from('deal_deliverables')
    .select(DELIVERABLE_SELECT)
    .eq('id', deliverableId)
    .maybeSingle();
  if (currentErr) throw new Error(currentErr.message);
  if (!current) throw new Error('Deliverable not found');

  const row = current as unknown as DbDeliverableRow;
  const updatePatch: Record<string, unknown> = {};
  if (typeof patch.title === 'string') {
    const t = patch.title.trim();
    updatePatch.title = t || row.title;
  }
  if (typeof patch.description === 'string') {
    updatePatch.instructions = patch.description;
  }
  if (patch.status) {
    assertDeliverableStatusTransition(row.status as DeliverableStatus, patch.status);
    updatePatch.status = patch.status;
  }
  if (Object.keys(updatePatch).length === 0) {
    return dbDeliverableToApi(row);
  }

  const { data: updated, error: updateErr } = await supabase
    .from('deal_deliverables')
    .update(updatePatch)
    .eq('id', deliverableId)
    .select(DELIVERABLE_SELECT)
    .single();
  if (updateErr || !updated) {
    throw new Error(updateErr?.message ?? 'Could not update deliverable');
  }
  const api = dbDeliverableToApi(updated as unknown as DbDeliverableRow);
  if (patch.status === 'completed') {
    await recordDealActivity({
      dealId: row.deal_id,
      entityType: 'deliverable',
      entityId: deliverableId,
      eventType: 'deliverable_completed',
      actorType: roleToActorType(actor.role),
      actorId: actor.userId,
      metadata: {},
    });
    notifyDealPlaceholder('deliverable_completed', { dealId: row.deal_id, deliverableId });
  }
  return api;
}

export async function updateSubmission(
  submissionId: string,
  to: SubmissionStatus,
  feedback: string | undefined,
  reviewerProfileId: string | undefined,
  actor: DealMutationActor,
): Promise<ApiSubmissionRow> {
  const supabase = await createClient();

  const { data: current, error: getErr } = await supabase
    .from('deliverable_submissions')
    .select(SUBMISSION_SELECT)
    .eq('id', submissionId)
    .maybeSingle();
  if (getErr) throw new Error(getErr.message);
  if (!current) throw new Error('Submission not found');
  const currentRow = current as unknown as DbSubmissionRow;

  assertSubmissionStatusTransition(currentRow.status as SubmissionStatus, to);

  const patch: Record<string, unknown> = {
    status: to,
    feedback: feedback ?? currentRow.feedback,
  };
  if (to === 'viewed' || to === 'approved' || to === 'revision_requested' || to === 'rejected') {
    patch.reviewed_by_profile_id = reviewerProfileId ?? currentRow.reviewed_by_profile_id;
    patch.reviewed_at = new Date().toISOString();
  }

  const { data: updatedSubmission, error: updateErr } = await supabase
    .from('deliverable_submissions')
    .update(patch)
    .eq('id', submissionId)
    .select(SUBMISSION_SELECT)
    .single();
  if (updateErr || !updatedSubmission) {
    throw new Error(updateErr?.message ?? 'Could not update submission');
  }

  const { data: deliverable, error: deliverableErr } = await supabase
    .from('deal_deliverables')
    .select(DELIVERABLE_SELECT)
    .eq('id', currentRow.deliverable_id)
    .maybeSingle();
  if (deliverableErr) throw new Error(deliverableErr.message);
  if (deliverable) {
    const d = deliverable as unknown as DbDeliverableRow;
    const deliverablePatch: Record<string, unknown> = {};
    if (to === 'viewed') {
      try {
        assertDeliverableStatusTransition(d.status as DeliverableStatus, 'under_review');
        deliverablePatch.status = 'under_review';
      } catch {
        /* no-op */
      }
    } else if (to === 'revision_requested') {
      if (d.revision_count_used >= d.revision_limit) {
        notifyDealPlaceholder('deal_revision_blocked', {
          dealId: currentRow.deal_id,
          deliverableId: currentRow.deliverable_id,
          submissionId,
        });
        throw new Error('Revision limit reached for this deliverable');
      }
      assertDeliverableStatusTransition(d.status as DeliverableStatus, 'revision_requested');
      deliverablePatch.status = 'revision_requested';
      deliverablePatch.revision_count_used = d.revision_count_used + 1;
    } else if (to === 'rejected') {
      try {
        assertDeliverableStatusTransition(d.status as DeliverableStatus, 'revision_requested');
        deliverablePatch.status = 'revision_requested';
      } catch {
        /* no-op */
      }
    } else if (to === 'approved') {
      if (d.publish_required) {
        assertDeliverableStatusTransition(d.status as DeliverableStatus, 'approved');
        deliverablePatch.status = 'approved';
      } else {
        assertDeliverableStatusTransition(d.status as DeliverableStatus, 'approved');
        assertDeliverableStatusTransition('approved', 'completed');
        deliverablePatch.status = 'completed';
      }
    }

    if (Object.keys(deliverablePatch).length > 0) {
      const { error: deliverableUpdateErr } = await supabase
        .from('deal_deliverables')
        .update(deliverablePatch)
        .eq('id', d.id);
      if (deliverableUpdateErr) throw new Error(deliverableUpdateErr.message);
    }
  }

  const apiOut = dbSubmissionToApi(updatedSubmission as unknown as DbSubmissionRow);
  if (to === 'revision_requested') {
    await recordDealActivity({
      dealId: currentRow.deal_id,
      entityType: 'submission',
      entityId: submissionId,
      eventType: 'revision_requested',
      actorType: roleToActorType(actor.role),
      actorId: actor.userId,
      metadata: { deliverableId: currentRow.deliverable_id, feedback: feedback ?? null },
    });
    notifyDealPlaceholder('revision_requested', {
      dealId: currentRow.deal_id,
      submissionId,
      deliverableId: currentRow.deliverable_id,
    });
  } else if (to === 'approved') {
    await recordDealActivity({
      dealId: currentRow.deal_id,
      entityType: 'submission',
      entityId: submissionId,
      eventType: 'submission_approved',
      actorType: roleToActorType(actor.role),
      actorId: actor.userId,
      metadata: { deliverableId: currentRow.deliverable_id },
    });
    notifyDealPlaceholder('submission_approved', {
      dealId: currentRow.deal_id,
      submissionId,
      deliverableId: currentRow.deliverable_id,
    });
  }

  return apiOut;
}
