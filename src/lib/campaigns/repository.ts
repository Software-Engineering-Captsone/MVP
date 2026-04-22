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
