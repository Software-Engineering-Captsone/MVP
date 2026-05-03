import { createClient } from '@/lib/supabase/server';

/* ─────────────────────────────────────────────────────────────────
 * API shape types
 * These intentionally match the legacy Mongoose/local-JSON shape so
 * serialization.ts and the 5 route handlers don't change. Column-name
 * translation happens inside the DB row mappers below.
 * ───────────────────────────────────────────────────────────────── */

export interface StoredCampaign {
  _id: string;
  brandUserId: string;
  brandDisplayName?: string;
  name: string;
  subtitle?: string;
  packageName?: string;
  packageId?: string;
  goal?: string;
  brief?: string;
  budget?: string;
  duration?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  visibility: 'Public' | 'Private';
  acceptApplications: boolean;
  sport?: string;
  genderFilter?: string;
  followerMin?: number;
  packageDetails?: string[];
  platforms?: string[];
  image?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredApplicationMessage {
  _id: string;
  fromUserId: string;
  body: string;
  createdAt: string;
}

export interface StoredApplication {
  _id: string;
  campaignId: string;
  athleteUserId: string;
  status: string;
  pitch?: string;
  athleteSnapshot?: Record<string, string>;
  messages?: StoredApplicationMessage[];
  createdAt: string;
  updatedAt: string;
}

export type OfferOrigin = 'direct_profile' | 'campaign_handoff' | 'chat_negotiated';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'withdrawn';

export interface StoredOffer {
  _id: string;
  brandUserId: string;
  athleteUserId: string;
  campaignId: string | null;
  applicationId: string | null;
  dealId: string | null;
  offerOrigin: OfferOrigin;
  status: OfferStatus;
  structuredDraft: Record<string, unknown>;
  notes: string;
  declineReason: string;
  declineNote: string;
  sentAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────────────────────────────────────────
 * DB row shapes (raw Supabase response)
 * ───────────────────────────────────────────────────────────────── */

interface DbCampaignRow {
  id: string;
  brand_id: string;
  name: string;
  subtitle: string;
  goal: string;
  brief: string;
  image_url: string;
  status: string;
  visibility: string;
  accept_applications: boolean;
  package_id: string;
  package_name: string;
  package_details: string[] | null;
  platforms: string[] | null;
  budget_label: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_label: string;
  target_sport: string;
  target_gender: string;
  target_follower_min: number;
  target_location: string;
  created_at: string;
  updated_at: string;
  brand?: { company_name: string | null } | null;
}

interface DbApplicationRow {
  id: string;
  campaign_id: string;
  athlete_id: string;
  status: string;
  pitch: string;
  athlete_snapshot: unknown;
  messages: unknown;
  created_at: string;
  updated_at: string;
}

interface DbOfferRow {
  id: string;
  brand_id: string;
  athlete_id: string;
  campaign_id: string | null;
  application_id: string | null;
  deal_id: string | null;
  offer_origin: OfferOrigin;
  status: OfferStatus;
  structured_draft: unknown;
  notes: string | null;
  decline_reason: string | null;
  decline_note: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────────
 * Shape translators
 * ───────────────────────────────────────────────────────────────── */

function fromDbGender(v: string): string {
  if (v === 'male') return 'Male';
  if (v === 'female') return 'Female';
  if (v === 'nonbinary') return 'Nonbinary';
  return 'Any';
}

/**
 * Accept both ISO (YYYY-MM-DD) and human-formatted ("May 1, 2026")
 * date strings. The CreateCampaignOverlay currently emits human format
 * via its display helper, but the DB column is `date`, which rejects
 * anything but ISO. Normalize here so older UI code keeps working.
 */
function parseDateForDb(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length === 0) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDbGender(v: unknown): string {
  const s = String(v ?? '').toLowerCase();
  if (s === 'male' || s === 'female' || s === 'nonbinary') return s;
  return 'any';
}

function dbCampaignToStored(row: DbCampaignRow): StoredCampaign {
  return {
    _id: row.id,
    brandUserId: row.brand_id,
    brandDisplayName: row.brand?.company_name ?? '',
    name: row.name,
    subtitle: row.subtitle ?? '',
    packageName: row.package_name ?? '',
    packageId: row.package_id ?? '',
    goal: row.goal ?? '',
    brief: row.brief ?? '',
    budget: row.budget_label ?? '',
    duration: row.duration_label ?? '',
    location: row.target_location ?? '',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    visibility: row.visibility === 'Private' ? 'Private' : 'Public',
    acceptApplications: !!row.accept_applications,
    sport: row.target_sport ?? '',
    genderFilter: fromDbGender(row.target_gender),
    followerMin: row.target_follower_min ?? 0,
    packageDetails: row.package_details ?? [],
    platforms: row.platforms ?? [],
    image: row.image_url ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeMessages(raw: unknown): StoredApplicationMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => ({
      _id: String(m._id ?? ''),
      fromUserId: String(m.fromUserId ?? ''),
      body: String(m.body ?? ''),
      createdAt: String(m.createdAt ?? ''),
    }));
}

function dbOfferToStored(row: DbOfferRow): StoredOffer {
  const draft =
    row.structured_draft && typeof row.structured_draft === 'object' && !Array.isArray(row.structured_draft)
      ? (row.structured_draft as Record<string, unknown>)
      : {};
  return {
    _id: row.id,
    brandUserId: row.brand_id,
    athleteUserId: row.athlete_id,
    campaignId: row.campaign_id,
    applicationId: row.application_id,
    dealId: row.deal_id,
    offerOrigin: row.offer_origin,
    status: row.status,
    structuredDraft: draft,
    notes: row.notes ?? '',
    declineReason: row.decline_reason ?? '',
    declineNote: row.decline_note ?? '',
    sentAt: row.sent_at,
    acceptedAt: row.accepted_at,
    declinedAt: row.declined_at,
    withdrawnAt: row.withdrawn_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbApplicationToStored(row: DbApplicationRow): StoredApplication {
  const snapshot =
    row.athlete_snapshot && typeof row.athlete_snapshot === 'object'
      ? (row.athlete_snapshot as Record<string, string>)
      : {};
  return {
    _id: row.id,
    campaignId: row.campaign_id,
    athleteUserId: row.athlete_id,
    status: row.status,
    pitch: row.pitch ?? '',
    athleteSnapshot: snapshot,
    messages: normalizeMessages(row.messages),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ─────────────────────────────────────────────────────────────────
 * Embedded select — every campaign read joins brand_profiles so the
 * returned StoredCampaign carries brandDisplayName without a separate
 * round-trip. The FK campaigns.brand_id → brand_profiles.brand_id is
 * what PostgREST uses to resolve the embed.
 * ───────────────────────────────────────────────────────────────── */
const CAMPAIGN_SELECT = '*, brand:brand_profiles(company_name)';

/* ─────────────────────────────────────────────────────────────────
 * Exported repository API — identical to the pre-Supabase version.
 * ───────────────────────────────────────────────────────────────── */

/**
 * Compatibility shim for legacy local-store seed bootstrap paths.
 * Supabase-backed environments do not require synthetic seed insertion.
 */
export async function ensureSeedCampaignsPresent(): Promise<void> {}

/**
 * Compatibility shim for legacy seed-ownership claim flow.
 * Campaign ownership is already sourced from persisted Supabase rows.
 */
export async function claimSeedBusinessOwnershipForBrandUser(_brandUserId: string): Promise<void> {
  void _brandUserId;
}

export async function listCampaignsForBrand(brandUserId: string): Promise<StoredCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT)
    .eq('brand_id', brandUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbCampaignToStored(r as unknown as DbCampaignRow));
}

export async function listOpenCampaignsForAthlete(): Promise<StoredCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT)
    .eq('visibility', 'Public')
    .eq('accept_applications', true)
    .in('status', ['Open for Applications', 'Reviewing Candidates'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbCampaignToStored(r as unknown as DbCampaignRow));
}

export async function getCampaignById(campaignId: string): Promise<StoredCampaign | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT)
    .eq('id', campaignId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbCampaignToStored(data as unknown as DbCampaignRow) : null;
}

export async function createCampaign(input: Record<string, unknown>): Promise<StoredCampaign> {
  const supabase = await createClient();
  const supabaseRow = {
    brand_id: String(input.brandUserId ?? ''),
    name: String(input.name ?? ''),
    subtitle: String(input.subtitle ?? ''),
    goal: String(input.goal ?? ''),
    brief: String(input.brief ?? ''),
    image_url: String(input.image ?? ''),
    status: String(input.status ?? 'Draft'),
    visibility: input.visibility === 'Private' ? 'Private' : 'Public',
    accept_applications: input.acceptApplications !== false,
    package_id: String(input.packageId ?? ''),
    package_name: String(input.packageName ?? ''),
    package_details: Array.isArray(input.packageDetails) ? (input.packageDetails as string[]) : [],
    platforms: Array.isArray(input.platforms) ? (input.platforms as string[]) : [],
    budget_label: String(input.budget ?? ''),
    start_date: parseDateForDb(input.startDate),
    end_date:   parseDateForDb(input.endDate),
    duration_label: String(input.duration ?? ''),
    target_sport: String(input.sport ?? 'All Sports'),
    target_gender: toDbGender(input.genderFilter),
    target_follower_min:
      typeof input.followerMin === 'number'
        ? input.followerMin
        : Number(input.followerMin) || 0,
    target_location: String(input.location ?? ''),
  };

  const { data, error } = await supabase
    .from('campaigns')
    .insert(supabaseRow)
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return dbCampaignToStored(data as unknown as DbCampaignRow);
}

export async function updateCampaign(
  campaignId: string,
  brandUserId: string,
  patch: Partial<Pick<StoredCampaign, 'status' | 'acceptApplications'>>,
): Promise<StoredCampaign | null> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.acceptApplications !== undefined) update.accept_applications = patch.acceptApplications;
  if (Object.keys(update).length === 0) return getCampaignById(campaignId);

  const { data, error } = await supabase
    .from('campaigns')
    .update(update)
    .eq('id', campaignId)
    .eq('brand_id', brandUserId)
    .select(CAMPAIGN_SELECT)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbCampaignToStored(data as unknown as DbCampaignRow) : null;
}

export async function listApplicationsForCampaign(campaignId: string): Promise<StoredApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbApplicationToStored(r as unknown as DbApplicationRow));
}

export async function getApplicationById(applicationId: string): Promise<StoredApplication | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbApplicationToStored(data as unknown as DbApplicationRow) : null;
}

export async function createApplication(
  input: Record<string, unknown>,
): Promise<{ application: StoredApplication; error?: 'duplicate' }> {
  const supabase = await createClient();
  const campaignId = String(input.campaignId ?? '');
  const athleteUserId = String(input.athleteUserId ?? '');

  // Fail fast on missing campaign so the route handler returns 404 with
  // a useful message. The BEFORE-INSERT trigger would also reject, but
  // with a less specific error.
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Duplicate-application check. Cheaper than catching the unique-
  // constraint violation on INSERT because it avoids a round-trip when
  // duplicate is expected.
  const { data: existing, error: existingErr } = await supabase
    .from('applications')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('athlete_id', athleteUserId)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);
  if (existing) {
    return {
      error: 'duplicate',
      application: dbApplicationToStored(existing as unknown as DbApplicationRow),
    };
  }

  const snapshot =
    input.athleteSnapshot && typeof input.athleteSnapshot === 'object'
      ? (input.athleteSnapshot as Record<string, string>)
      : {};

  const { data, error } = await supabase
    .from('applications')
    .insert({
      campaign_id: campaignId,
      athlete_id: athleteUserId,
      status: 'pending',
      pitch: String(input.pitch ?? ''),
      athlete_snapshot: snapshot,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { application: dbApplicationToStored(data as unknown as DbApplicationRow) };
}

/**
 * Brand-initiated referral invite — creates a `pending` application on
 * the brand's own campaign for the given athlete. Idempotent: if an
 * application already exists for that (campaign, athlete), returns it
 * with `created: false` instead of inserting again.
 *
 * Requires the "Brands invite athletes to own campaigns" INSERT policy
 * (see supabase-referrals-setup.sql). The campaign must be accepting
 * applications — the BEFORE-INSERT trigger enforces that.
 */
export async function createReferralApplication(input: {
  campaignId: string;
  brandUserId: string;
  athleteUserId: string;
}): Promise<
  | { ok: true; application: StoredApplication; created: boolean }
  | { ok: false; status: number; error: string }
> {
  const athleteUserId = String(input.athleteUserId ?? '').trim();
  if (!athleteUserId) {
    return { ok: false, status: 400, error: 'athleteUserId is required' };
  }

  const campaign = await getCampaignById(input.campaignId);
  if (!campaign) {
    return { ok: false, status: 404, error: 'Campaign not found' };
  }
  if (campaign.brandUserId !== input.brandUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const supabase = await createClient();

  const { data: existing, error: existingErr } = await supabase
    .from('applications')
    .select('*')
    .eq('campaign_id', input.campaignId)
    .eq('athlete_id', athleteUserId)
    .maybeSingle();
  if (existingErr) {
    return { ok: false, status: 400, error: existingErr.message };
  }
  if (existing) {
    return {
      ok: true,
      application: dbApplicationToStored(existing as unknown as DbApplicationRow),
      created: false,
    };
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      campaign_id: input.campaignId,
      athlete_id: athleteUserId,
      status: 'pending',
      pitch: '',
      athlete_snapshot: {},
    })
    .select('*')
    .single();
  if (error) {
    return { ok: false, status: 400, error: error.message };
  }
  return {
    ok: true,
    application: dbApplicationToStored(data as unknown as DbApplicationRow),
    created: true,
  };
}

export async function updateApplicationStatus(
  applicationId: string,
  brandUserId: string,
  status: 'pending' | 'shortlisted' | 'approved' | 'declined',
): Promise<StoredApplication | null> {
  const supabase = await createClient();

  // Verify the brand owns the campaign before the RLS-gated update.
  // Gives us a clean null return for "not found / forbidden" without
  // surfacing a cryptic RLS error to the caller.
  const { data: app } = await supabase
    .from('applications')
    .select('campaign_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (!app) return null;

  const { data: camp } = await supabase
    .from('campaigns')
    .select('brand_id')
    .eq('id', app.campaign_id)
    .maybeSingle();
  if (!camp || camp.brand_id !== brandUserId) return null;

  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbApplicationToStored(data as unknown as DbApplicationRow) : null;
}

/**
 * True when the campaign has a deadline and it is now in the past.
 * Used by the athlete applications view to gate the "Re-apply" affordance.
 */
export function isPastCampaignApplicationDeadline(campaign: StoredCampaign): boolean {
  const endDate = typeof campaign.endDate === 'string' ? campaign.endDate.trim() : '';
  if (!endDate) return false;
  const ms = new Date(endDate).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() > ms;
}

export async function listApplicationsForAthlete(athleteUserId: string): Promise<StoredApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('athlete_id', athleteUserId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbApplicationToStored(r as unknown as DbApplicationRow));
}

export async function updateApplicationPitchByAthlete(
  applicationId: string,
  athleteUserId: string,
  pitch: string,
): Promise<
  | { ok: true; application: StoredApplication }
  | { ok: false; status: number; error: string }
> {
  const trimmed = typeof pitch === 'string' ? pitch.trim() : '';
  if (!trimmed) return { ok: false, status: 400, error: 'Pitch cannot be empty' };
  if (trimmed.length > 1000) return { ok: false, status: 400, error: 'Pitch too long (max 1000)' };

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from('applications')
    .select('id, athlete_id, status')
    .eq('id', applicationId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) return { ok: false, status: 404, error: 'Not found' };
  if (existing.athlete_id !== athleteUserId) return { ok: false, status: 403, error: 'Forbidden' };
  if (existing.status !== 'pending') {
    return { ok: false, status: 409, error: 'Cannot edit pitch after the application has moved past pending' };
  }

  const { data, error } = await supabase
    .from('applications')
    .update({ pitch: trimmed })
    .eq('id', applicationId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, status: 404, error: 'Not found' };
  return { ok: true, application: dbApplicationToStored(data as unknown as DbApplicationRow) };
}

export async function withdrawApplicationByAthlete(
  applicationId: string,
  athleteUserId: string,
): Promise<
  | { ok: true; application: StoredApplication }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from('applications')
    .select('id, athlete_id, status')
    .eq('id', applicationId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) return { ok: false, status: 404, error: 'Not found' };
  if (existing.athlete_id !== athleteUserId) return { ok: false, status: 403, error: 'Forbidden' };
  if (existing.status === 'withdrawn') {
    return { ok: false, status: 409, error: 'Application is already withdrawn' };
  }
  if (existing.status === 'approved' || existing.status === 'declined') {
    return { ok: false, status: 409, error: 'Cannot withdraw a decided application' };
  }

  const { data, error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, status: 404, error: 'Not found' };
  return { ok: true, application: dbApplicationToStored(data as unknown as DbApplicationRow) };
}

export async function appendApplicationMessage(
  applicationId: string,
  userId: string,
  body: string,
): Promise<{ application: StoredApplication | null; error?: 'forbidden' | 'not_found' }> {
  const supabase = await createClient();

  const { data: app, error: readErr } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!app) return { application: null, error: 'not_found' };

  const { data: camp } = await supabase
    .from('campaigns')
    .select('brand_id')
    .eq('id', app.campaign_id)
    .maybeSingle();
  if (!camp) return { application: null, error: 'not_found' };

  const isAthlete = userId === app.athlete_id;
  const isBrand = userId === camp.brand_id;
  if (!isAthlete && !isBrand) return { application: null, error: 'forbidden' };

  const existing = normalizeMessages(app.messages);
  const nextMessages: StoredApplicationMessage[] = [
    ...existing,
    {
      _id: crypto.randomUUID(),
      fromUserId: userId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    },
  ];

  const { data: updated, error: upErr } = await supabase
    .from('applications')
    .update({ messages: nextMessages })
    .eq('id', applicationId)
    .select('*')
    .maybeSingle();
  if (upErr) throw new Error(upErr.message);
  if (!updated) return { application: null, error: 'forbidden' };
  return { application: dbApplicationToStored(updated as unknown as DbApplicationRow) };
}

/* ─────────────────────────────────────────────────────────────────
 * OFFERS
 *
 * Backed by the public.offers table. RLS policies in
 * supabase-offers-setup.sql gate access — these helpers add a
 * defensive ownership check before mutations so the caller gets a
 * clear null/error rather than a cryptic RLS denial.
 * ───────────────────────────────────────────────────────────────── */

const OFFER_SELECT = '*';

export async function listOffersForCampaign(
  campaignId: string,
  brandUserId: string,
): Promise<StoredOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbOfferToStored(r as unknown as DbOfferRow));
}

export async function listOffersForAthlete(athleteUserId: string): Promise<StoredOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('athlete_id', athleteUserId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbOfferToStored(r as unknown as DbOfferRow));
}

export async function listOffersForBrand(brandUserId: string): Promise<StoredOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('brand_id', brandUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbOfferToStored(r as unknown as DbOfferRow));
}

export async function getOfferByIdForBrand(
  offerId: string,
  brandUserId: string,
): Promise<StoredOffer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('id', offerId)
    .eq('brand_id', brandUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbOfferToStored(data as unknown as DbOfferRow) : null;
}

export async function getOfferByIdForAthlete(
  offerId: string,
  athleteUserId: string,
): Promise<StoredOffer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('id', offerId)
    .eq('athlete_id', athleteUserId)
    .neq('status', 'draft')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbOfferToStored(data as unknown as DbOfferRow) : null;
}

/**
 * Direct-from-profile draft. The brand opens the athlete's profile and
 * starts a fresh draft with no campaign or application linkage. The
 * OfferWizard is then opened against the returned offer id.
 */
export async function createDirectProfileOfferDraft(input: {
  brandUserId: string;
  athleteUserId: string;
  notes?: string;
  structuredDraft?: Record<string, unknown>;
}): Promise<StoredOffer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .insert({
      brand_id: input.brandUserId,
      athlete_id: input.athleteUserId,
      offer_origin: 'direct_profile',
      status: 'draft',
      notes: (input.notes ?? '').trim(),
      structured_draft: input.structuredDraft ?? {},
    })
    .select(OFFER_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return dbOfferToStored(data as unknown as DbOfferRow);
}

/**
 * Chat-negotiated draft. Optionally carries a campaign_id when the
 * conversation referenced one; never carries an application_id.
 */
export async function createChatNegotiatedOfferDraft(input: {
  brandUserId: string;
  athleteUserId: string;
  campaignId?: string | null;
  notes?: string;
  structuredDraft?: Record<string, unknown>;
}): Promise<StoredOffer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('offers')
    .insert({
      brand_id: input.brandUserId,
      athlete_id: input.athleteUserId,
      campaign_id: input.campaignId ?? null,
      offer_origin: 'chat_negotiated',
      status: 'draft',
      notes: (input.notes ?? '').trim(),
      structured_draft: input.structuredDraft ?? {},
    })
    .select(OFFER_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return dbOfferToStored(data as unknown as DbOfferRow);
}

/**
 * Bulk draft creation from approved applications. Used when a brand
 * picks N applicants from a campaign review screen and wants offer
 * drafts queued up. Skips application ids that already have an offer.
 */
export async function createOfferDraftsFromApplications(input: {
  brandUserId: string;
  campaignId: string;
  applicationIds: string[];
}): Promise<StoredOffer[]> {
  if (input.applicationIds.length === 0) return [];
  const supabase = await createClient();

  const { data: camp } = await supabase
    .from('campaigns')
    .select('brand_id')
    .eq('id', input.campaignId)
    .maybeSingle();
  if (!camp || camp.brand_id !== input.brandUserId) {
    throw new Error('Campaign not found or not owned by brand');
  }

  const { data: apps, error: appsErr } = await supabase
    .from('applications')
    .select('id, athlete_id, status, campaign_id')
    .in('id', input.applicationIds)
    .eq('campaign_id', input.campaignId);
  if (appsErr) throw new Error(appsErr.message);

  const { data: existingOffers, error: exErr } = await supabase
    .from('offers')
    .select('application_id')
    .in('application_id', input.applicationIds);
  if (exErr) throw new Error(exErr.message);
  const taken = new Set(
    (existingOffers ?? [])
      .map((r) => r.application_id)
      .filter((id): id is string => typeof id === 'string'),
  );

  const toInsert = (apps ?? [])
    .filter((a) => !taken.has(a.id))
    .map((a) => ({
      brand_id: input.brandUserId,
      athlete_id: a.athlete_id,
      campaign_id: input.campaignId,
      application_id: a.id,
      offer_origin: 'campaign_handoff' as const,
      status: 'draft' as const,
      structured_draft: {},
    }));

  if (toInsert.length === 0) return [];

  const { data: inserted, error: insErr } = await supabase
    .from('offers')
    .insert(toInsert)
    .select(OFFER_SELECT);
  if (insErr) throw new Error(insErr.message);
  return (inserted ?? []).map((r) => dbOfferToStored(r as unknown as DbOfferRow));
}

/**
 * Patch a draft offer's editable fields. Status transitions go through
 * a separate helper (Step 7) — this only touches terms/notes while the
 * offer is still a draft.
 */
export async function updateOfferDraftFields(
  offerId: string,
  brandUserId: string,
  patch: {
    structuredDraft?: Record<string, unknown>;
    notes?: string;
  },
): Promise<StoredOffer | null> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.structuredDraft !== undefined) update.structured_draft = patch.structuredDraft;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (Object.keys(update).length === 0) {
    return getOfferByIdForBrand(offerId, brandUserId);
  }

  // Verify ownership and draft status before mutating. RLS would
  // reject a cross-brand write, but we want a clean null instead of an
  // exception for the "not found / not editable" case.
  const current = await getOfferByIdForBrand(offerId, brandUserId);
  if (!current) return null;
  if (current.status !== 'draft') {
    throw new Error('Only draft offers can be edited');
  }

  const { data, error } = await supabase
    .from('offers')
    .update(update)
    .eq('id', offerId)
    .eq('brand_id', brandUserId)
    .select(OFFER_SELECT)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? dbOfferToStored(data as unknown as DbOfferRow) : null;
}


/* ─────────────────────────────────────────────────────────────────
 * Campaign templates (per-brand saved presets)
 * Backed by `public.campaign_templates`. System templates aren't
 * stored — the GET route merges the seed list from
 * buildSeedSystemCampaignTemplates() with rows returned here.
 * ───────────────────────────────────────────────────────────────── */

export interface StoredBrandCampaignTemplate {
  id: string;
  brandUserId: string;
  name: string;
  description: string;
  version: number;
  status: 'active' | 'archived';
  defaults: Record<string, unknown>;
  lockedPaths: string[] | null;
  sourceCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbCampaignTemplateRow {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  version: number;
  status: string;
  defaults: Record<string, unknown> | null;
  locked_paths: string[] | null;
  source_campaign_id: string | null;
  created_at: string;
  updated_at: string;
}

function dbTemplateToStored(row: DbCampaignTemplateRow): StoredBrandCampaignTemplate {
  return {
    id: row.id,
    brandUserId: row.brand_id,
    name: row.name,
    description: row.description ?? '',
    version: row.version,
    status: row.status === 'archived' ? 'archived' : 'active',
    defaults: row.defaults ?? {},
    lockedPaths: row.locked_paths,
    sourceCampaignId: row.source_campaign_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCampaignTemplatesForBrand(
  brandUserId: string,
): Promise<StoredBrandCampaignTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('brand_id', brandUserId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => dbTemplateToStored(r as DbCampaignTemplateRow));
}

export async function createBrandCampaignTemplate(input: {
  brandUserId: string;
  name: string;
  description?: string;
  defaults: Record<string, unknown>;
  lockedPaths?: string[] | null;
  sourceCampaignId?: string | null;
}): Promise<StoredBrandCampaignTemplate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaign_templates')
    .insert({
      brand_id: input.brandUserId,
      name: input.name,
      description: input.description ?? '',
      defaults: input.defaults,
      locked_paths: input.lockedPaths ?? null,
      source_campaign_id: input.sourceCampaignId ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return dbTemplateToStored(data as DbCampaignTemplateRow);
}
