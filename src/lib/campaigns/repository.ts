import { newObjectIdHex } from '@/lib/generateId';
import { findUserById } from '@/lib/auth/localUserRepository';
import { mergeAthleteProfile } from '@/lib/auth/athleteProfile';
import type { StoredUser } from '@/lib/auth/localUserStore';
import {
  mutateLocalCampaignStore,
  readLocalCampaignStore,
  type LocalCampaignStoreSnapshot,
  type StoredApplication,
  type StoredCampaign,
  type StoredCampaignTemplate,
  type StoredOffer,
} from './localCampaignStore';
import { buildSeedCampaignTemplates, SEED_BRAND_USER_ID, SEED_CAMPAIGN_IDS } from './seedCampaigns';
import { SEED_DEAL_GRAPH_IDS } from '@/lib/campaigns/deals/seedDealLifecycle';
import { buildSeedSystemCampaignTemplates, SEED_SYSTEM_TEMPLATE_IDS } from './seedCampaignTemplates';
import {
  normalizeCampaignBriefV2,
  OBJECTIVE_TYPE_LABELS,
  resolveCampaignBriefV2ForApi,
} from './campaignBriefV2Mapper';
import {
  OFFER_STRUCTURED_DRAFT_VERSION,
  emptyOfferWizardState,
  prefillWizardFromChatNegotiated,
} from './offerWizardTypes';
import {
  validateApplicationInput,
  validateCampaignInput,
  validateOfferInput,
} from './validateCampaignRecords';
import {
  assertApplicationStatusTransition,
  assertCampaignStatusTransition,
} from './stateTransitions';

const OPEN_STATUSES = ['Open for Applications', 'Reviewing Candidates'] as const;

function idStr(doc: { _id?: unknown }): string {
  if (doc._id == null) return '';
  return String(doc._id);
}

function resolveCampaignApplicationDeadline(campaign: StoredCampaign): string {
  const endDate = typeof (campaign as Record<string, unknown>).endDate === 'string'
    ? String((campaign as Record<string, unknown>).endDate).trim()
    : '';
  if (endDate) return endDate;
  const brief = (campaign as Record<string, unknown>).campaignBriefV2;
  if (brief && typeof brief === 'object') {
    const timeline = (brief as Record<string, unknown>).timelineDates;
    if (timeline && typeof timeline === 'object') {
      const v = (timeline as Record<string, unknown>).endDate;
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

/** Merge demo campaigns once per process when any seed id is missing (cheap read first). */
export async function ensureSeedCampaignsPresent(): Promise<void> {
  const snap = await readLocalCampaignStore();
  const idSet = new Set(snap.campaigns.map((c) => idStr(c)));
  if (SEED_CAMPAIGN_IDS.every((id) => idSet.has(id))) return;

  await mutateLocalCampaignStore((draft) => {
    const ids = new Set(draft.campaigns.map((c) => idStr(c)));
    for (const template of buildSeedCampaignTemplates()) {
      const id = String(template._id ?? '');
      if (!id || ids.has(id)) continue;
      try {
        const raw = validateCampaignInput(template as Record<string, unknown>);
        const row = { ...raw, _id: idStr(raw) || id } as StoredCampaign;
        draft.campaigns.push(row);
        ids.add(row._id);
      } catch (e) {
        console.error('[campaigns] Seed campaign skipped:', id, e);
      }
    }
  });
}

const SEED_CAMPAIGN_ID_SET = new Set<string>(SEED_CAMPAIGN_IDS as unknown as string[]);
const SEED_DEAL_ID_SET = new Set<string>(SEED_DEAL_GRAPH_IDS as unknown as string[]);

function brandOwnsNonSeedCampaign(draft: { campaigns: StoredCampaign[] }, brandUserId: string): boolean {
  return draft.campaigns.some(
    (c) => String(c.brandUserId) === brandUserId && !SEED_CAMPAIGN_ID_SET.has(idStr(c))
  );
}

function brandOwnsNonSeedDeal(draft: { deals?: { _id?: unknown; brandUserId?: unknown }[] }, brandUserId: string): boolean {
  const deals = draft.deals ?? [];
  return deals.some(
    (d) => String(d.brandUserId ?? '') === brandUserId && !SEED_DEAL_ID_SET.has(idStr(d))
  );
}

/**
 * Demo/local: reassigns rows still owned by `SEED_BRAND_USER_ID` to the logged-in brand when they have
 * no non-seed campaigns or deals (so late-inserted seed deals can be claimed after seed campaigns).
 * Idempotent; does not run for the synthetic seed brand id itself.
 */
export async function claimSeedBusinessOwnershipForBrandUser(brandUserId: string): Promise<void> {
  const trimmed = String(brandUserId ?? '').trim();
  if (!trimmed || trimmed === SEED_BRAND_USER_ID) return;

  await ensureSeedCampaignsPresent();

  const snap = await readLocalCampaignStore();
  if (brandOwnsNonSeedCampaign(snap, trimmed) || brandOwnsNonSeedDeal(snap, trimmed)) {
    return;
  }
  const hasSeedOwnedRows =
    snap.campaigns.some((c) => String(c.brandUserId) === SEED_BRAND_USER_ID) ||
    (snap.offers ?? []).some((o) => String(o.brandUserId ?? '') === SEED_BRAND_USER_ID) ||
    (snap.deals ?? []).some((d) => String(d.brandUserId ?? '') === SEED_BRAND_USER_ID);
  if (!hasSeedOwnedRows) return;

  await mutateLocalCampaignStore((draft: LocalCampaignStoreSnapshot) => {
    if (brandOwnsNonSeedCampaign(draft, trimmed) || brandOwnsNonSeedDeal(draft, trimmed)) {
      return;
    }
    for (let i = 0; i < draft.campaigns.length; i++) {
      const c = draft.campaigns[i]!;
      if (String(c.brandUserId) === SEED_BRAND_USER_ID) {
        draft.campaigns[i] = { ...c, brandUserId: trimmed } as StoredCampaign;
      }
    }
    if (!Array.isArray(draft.offers)) draft.offers = [];
    for (let i = 0; i < draft.offers.length; i++) {
      const o = draft.offers[i]!;
      if (String(o.brandUserId ?? '') === SEED_BRAND_USER_ID) {
        draft.offers[i] = { ...o, brandUserId: trimmed } as StoredOffer;
      }
    }
    if (!Array.isArray(draft.deals)) draft.deals = [];
    for (let i = 0; i < draft.deals.length; i++) {
      const d = draft.deals[i]!;
      if (String(d.brandUserId ?? '') === SEED_BRAND_USER_ID) {
        draft.deals[i] = { ...d, brandUserId: trimmed };
      }
    }
    if (!Array.isArray(draft.dealActivities)) draft.dealActivities = [];
    for (let i = 0; i < draft.dealActivities.length; i++) {
      const a = draft.dealActivities[i]!;
      if (a.actorType === 'business' && String(a.actorId ?? '') === SEED_BRAND_USER_ID) {
        draft.dealActivities[i] = { ...a, actorId: trimmed };
      }
    }
  });
}

function ensureTemplatesArray(draft: { campaignTemplates?: StoredCampaignTemplate[] }) {
  if (!Array.isArray(draft.campaignTemplates)) draft.campaignTemplates = [];
}

async function ensureSystemCampaignTemplatesPresent(): Promise<void> {
  const snap = await readLocalCampaignStore();
  ensureTemplatesArray(snap);
  const idSet = new Set(snap.campaignTemplates.map((t) => idStr(t)));
  if (SEED_SYSTEM_TEMPLATE_IDS.every((id) => idSet.has(id))) return;

  await mutateLocalCampaignStore((draft) => {
    ensureTemplatesArray(draft);
    const ids = new Set(draft.campaignTemplates.map((t) => idStr(t)));
    for (const row of buildSeedSystemCampaignTemplates()) {
      const id = String(row._id ?? '');
      if (!id || ids.has(id)) continue;
      draft.campaignTemplates.push(row);
      ids.add(id);
    }
  });
}

function isSystemTemplate(t: StoredCampaignTemplate): boolean {
  return t.orgId == null || t.orgId === '';
}

export type CampaignTemplateListScope = 'system' | 'org' | 'all';

export async function listCampaignTemplates(
  scope: CampaignTemplateListScope,
  userId: string,
  role: 'brand' | 'athlete'
): Promise<StoredCampaignTemplate[]> {
  await ensureSystemCampaignTemplatesPresent();
  const { campaignTemplates } = await readLocalCampaignStore();
  const rows = Array.isArray(campaignTemplates) ? campaignTemplates : [];
  const active = rows.filter((t) => t.status !== 'archived');

  if (role === 'athlete') {
    return active.filter((t) => isSystemTemplate(t));
  }

  if (scope === 'system') {
    return active.filter((t) => isSystemTemplate(t));
  }
  if (scope === 'org') {
    return active.filter((t) => !isSystemTemplate(t) && String(t.orgId) === userId);
  }
  // all
  return active.filter((t) => isSystemTemplate(t) || String(t.orgId) === userId);
}

export async function getCampaignTemplateById(
  templateId: string
): Promise<StoredCampaignTemplate | null> {
  await ensureSystemCampaignTemplatesPresent();
  const { campaignTemplates } = await readLocalCampaignStore();
  const rows = Array.isArray(campaignTemplates) ? campaignTemplates : [];
  return rows.find((t) => idStr(t) === templateId) ?? null;
}

export async function createOrgCampaignTemplate(
  brandUserId: string,
  input: {
    name: string;
    description?: string;
    defaults?: unknown;
    lockedPaths?: string[];
  }
): Promise<StoredCampaignTemplate> {
  const _id = newObjectIdHex();
  const now = new Date().toISOString();
  const defaults = normalizeCampaignBriefV2(input.defaults ?? {});
  const row: StoredCampaignTemplate = {
    _id,
    orgId: brandUserId,
    name: input.name.trim(),
    ...(input.description != null && input.description !== ''
      ? { description: input.description.trim() }
      : {}),
    version: 1,
    status: 'active',
    defaults: defaults as unknown as Record<string, unknown>,
    ...(Array.isArray(input.lockedPaths) && input.lockedPaths.length > 0
      ? { lockedPaths: input.lockedPaths.map((p) => String(p)) }
      : {}),
    createdBy: brandUserId,
    createdAt: now,
    updatedAt: now,
  };

  await mutateLocalCampaignStore((draft) => {
    ensureTemplatesArray(draft);
    draft.campaignTemplates.push(row);
  });
  return row;
}

export type PatchCampaignTemplateInput = {
  status?: 'archived';
  name?: string;
  description?: string | null;
  lockedPaths?: string[];
  defaults?: unknown;
  bumpVersion?: boolean;
};

export async function patchCampaignTemplate(
  templateId: string,
  brandUserId: string,
  patch: PatchCampaignTemplateInput
): Promise<StoredCampaignTemplate | null> {
  let updated: StoredCampaignTemplate | null = null;
  await mutateLocalCampaignStore((draft) => {
    ensureTemplatesArray(draft);
    const idx = draft.campaignTemplates.findIndex((t) => idStr(t) === templateId);
    if (idx === -1) return;
    const cur = draft.campaignTemplates[idx];
    if (isSystemTemplate(cur)) return;
    if (String(cur.orgId) !== brandUserId) return;

    const now = new Date().toISOString();
    const next: StoredCampaignTemplate = { ...cur };
    if (patch.status === 'archived') {
      next.status = 'archived';
    }
    if (typeof patch.name === 'string' && patch.name.trim()) {
      next.name = patch.name.trim();
    }
    if (patch.description === null) {
      delete next.description;
    } else if (typeof patch.description === 'string') {
      next.description = patch.description.trim() || undefined;
    }
    if (patch.lockedPaths !== undefined) {
      if (patch.lockedPaths.length === 0) delete next.lockedPaths;
      else next.lockedPaths = patch.lockedPaths.map((p) => String(p));
    }
    if (patch.defaults !== undefined) {
      const normalized = normalizeCampaignBriefV2(patch.defaults);
      next.defaults = normalized as unknown as Record<string, unknown>;
      if (patch.bumpVersion === true) {
        const v = typeof next.version === 'number' ? next.version : Number(next.version) || 1;
        next.version = v + 1;
      }
    }
    next.updatedAt = now;
    draft.campaignTemplates[idx] = next;
    updated = next;
  });
  return updated;
}

export async function createCampaignTemplateFromCampaign(
  campaignId: string,
  brandUserId: string,
  input: { name: string; description?: string; lockedPaths?: string[] }
): Promise<StoredCampaignTemplate | null> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.brandUserId !== brandUserId) {
    return null;
  }
  const derived = resolveCampaignBriefV2ForApi(campaign as Record<string, unknown>);
  if (!derived) {
    throw new Error('campaignBriefV2 is required to save campaign template');
  }
  const defaults = normalizeCampaignBriefV2({
    ...derived,
    templateMeta: {
      ...(derived.templateMeta ?? {}),
      source: 'org',
    },
  });
  return createOrgCampaignTemplate(brandUserId, {
    name: input.name,
    description: input.description,
    defaults,
    lockedPaths: input.lockedPaths,
  });
}

export async function listCampaignsForBrand(brandUserId: string): Promise<StoredCampaign[]> {
  await ensureSeedCampaignsPresent();
  await claimSeedBusinessOwnershipForBrandUser(brandUserId);
  const { campaigns } = await readLocalCampaignStore();
  return campaigns.filter((c) => c.brandUserId === brandUserId);
}

function campaignCreatedAtMs(c: StoredCampaign): number {
  const t = new Date(String(c.createdAt ?? 0)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Deterministic athlete marketplace ordering: newest first, then id ascending. */
function compareOpenAthleteSort(a: StoredCampaign, b: StoredCampaign): number {
  const dt = campaignCreatedAtMs(b) - campaignCreatedAtMs(a);
  if (dt !== 0) return dt;
  return idStr(a).localeCompare(idStr(b));
}

async function listOpenCampaignsForAthleteSorted(): Promise<StoredCampaign[]> {
  await ensureSeedCampaignsPresent();
  const { campaigns } = await readLocalCampaignStore();
  const open = campaigns.filter(
    (c) =>
      c.visibility === 'Public' &&
      c.acceptApplications === true &&
      OPEN_STATUSES.includes(c.status as (typeof OPEN_STATUSES)[number])
  );
  return [...open].sort(compareOpenAthleteSort);
}

export async function listOpenCampaignsForAthlete(): Promise<StoredCampaign[]> {
  return listOpenCampaignsForAthleteSorted();
}

function encodeAthleteCampaignCursor(createdAtMs: number, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAtMs, id }), 'utf8').toString('base64url');
}

function decodeAthleteCampaignCursor(cursor: string): { t: number; id: string } {
  let parsed: unknown;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Invalid cursor');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { t?: unknown }).t !== 'number' ||
    typeof (parsed as { id?: unknown }).id !== 'string'
  ) {
    throw new Error('Invalid cursor');
  }
  const { t, id } = parsed as { t: number; id: string };
  return { t, id };
}

export type OpenCampaignsPageResult = {
  campaigns: StoredCampaign[];
  nextCursor: string | null;
};

/** Server-side marketplace filters (athlete GET only). All fields optional; empty/absent = no constraint. */
export type AthleteOpenCampaignFilters = {
  sport?: string | null;
  category?: string | null;
  platform?: string | null;
  /** USD, inclusive overlap with inferred campaign compensation range */
  compensationMinUsd?: number | null;
  compensationMaxUsd?: number | null;
  location?: string | null;
};

function normLower(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

function extractUsdAmounts(...chunks: string[]): number[] {
  const out: number[] = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    const re = /\$\s*([\d,]+(?:\.\d+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) {
      const n = Number.parseFloat(m[1]!.replace(/,/g, ''));
      if (Number.isFinite(n) && n >= 0) out.push(n);
    }
  }
  return out;
}

/**
 * Inferred [min,max] USD for filtering. Prefers `campaignBriefV2.budgetRights`; else parses
 * `budget` / `budgetHint` for dollar amounts (range if two values). No usable signal → `{0,0}`.
 */
function compensationRangeUsd(c: StoredCampaign): { min: number; max: number } {
  const brief = resolveCampaignBriefV2ForApi(c as Record<string, unknown>);
  const br = brief?.budgetRights;
  if (br && typeof br.budgetCap === 'number' && br.budgetCap > 0) {
    const rmin =
      typeof br.budgetRangeMin === 'number' && Number.isFinite(br.budgetRangeMin) ? br.budgetRangeMin : NaN;
    const rmax =
      typeof br.budgetRangeMax === 'number' && Number.isFinite(br.budgetRangeMax) ? br.budgetRangeMax : NaN;
    if (Number.isFinite(rmin) && Number.isFinite(rmax) && rmax >= rmin) {
      return { min: Math.max(0, rmin), max: rmax };
    }
    return { min: 0, max: br.budgetCap };
  }
  const nums = extractUsdAmounts(String(c.budgetHint ?? ''), String(c.budget ?? ''));
  if (nums.length === 0) return { min: 0, max: 0 };
  if (nums.length === 1) return { min: nums[0]!, max: nums[0]! };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function campaignSportSignal(c: StoredCampaign): string {
  const brief = resolveCampaignBriefV2ForApi(c as Record<string, unknown>);
  const fromBrief = brief?.audienceCreatorFit?.sportCategory;
  if (typeof fromBrief === 'string' && fromBrief.trim()) return fromBrief.trim();
  if (typeof c.sport === 'string' && c.sport.trim()) return c.sport.trim();
  return 'All Sports';
}

function sportFilterMatches(c: StoredCampaign, filterSport: string): boolean {
  const f = normLower(filterSport);
  if (!f) return true;
  const raw = campaignSportSignal(c);
  const s = normLower(raw);
  if (s === 'all sports' || s === '' || s === 'any') return true;
  return s === f;
}

function platformTokensForCampaign(c: StoredCampaign): string[] {
  const brief = resolveCampaignBriefV2ForApi(c as Record<string, unknown>);
  const fromBrief = brief?.contentDeliverables?.platforms;
  const raw: string[] = [];
  if (Array.isArray(fromBrief)) raw.push(...fromBrief.map((x) => String(x)));
  if (Array.isArray(c.platforms)) raw.push(...(c.platforms as unknown[]).map(String));
  return [...new Set(raw.map((x) => normLower(x)).filter(Boolean))];
}

function platformFilterMatches(c: StoredCampaign, filterPlatform: string): boolean {
  const f = normLower(filterPlatform);
  if (!f) return true;
  const tokens = platformTokensForCampaign(c);
  return tokens.some((p) => p === f || p.includes(f) || f.includes(p));
}

function categorySearchBlob(c: StoredCampaign): string {
  const parts: string[] = [];
  if (typeof c.name === 'string') parts.push(c.name);
  if (typeof c.subtitle === 'string') parts.push(c.subtitle);
  if (typeof c.brief === 'string') parts.push(c.brief);
  if (typeof c.goal === 'string') parts.push(c.goal);
  if (typeof c.campaignType === 'string') parts.push(c.campaignType);
  if (typeof c.packageName === 'string') parts.push(c.packageName);
  if (typeof c.packageId === 'string') parts.push(c.packageId);
  if (typeof c.opportunityContext === 'string') parts.push(c.opportunityContext);
  const brief = resolveCampaignBriefV2ForApi(c as Record<string, unknown>);
  if (brief?.strategy?.objectiveType) {
    const ot = brief.strategy.objectiveType;
    parts.push(String(ot));
    const label = OBJECTIVE_TYPE_LABELS[ot as keyof typeof OBJECTIVE_TYPE_LABELS];
    if (label) parts.push(label);
  }
  if (brief?.strategy?.primaryKpi) parts.push(String(brief.strategy.primaryKpi));
  if (typeof brief?.strategy?.campaignSummary === 'string') parts.push(brief.strategy.campaignSummary);
  if (Array.isArray(c.brandFitTags)) parts.push(...(c.brandFitTags as unknown[]).map(String));
  return parts.join(' ');
}

function categoryFilterMatches(c: StoredCampaign, filterCategory: string): boolean {
  const f = normLower(filterCategory);
  if (!f) return true;
  return normLower(categorySearchBlob(c)).includes(f);
}

function locationSearchBlob(c: StoredCampaign): string {
  const loc = typeof c.location === 'string' ? c.location : '';
  const brief = resolveCampaignBriefV2ForApi(c as Record<string, unknown>);
  const region = brief?.strategy?.marketRegion != null ? String(brief.strategy.marketRegion) : '';
  return `${loc} ${region}`;
}

function locationFilterMatches(c: StoredCampaign, filterLocation: string): boolean {
  const f = normLower(filterLocation);
  if (!f) return true;
  return normLower(locationSearchBlob(c)).includes(f);
}

function compensationFilterMatches(
  c: StoredCampaign,
  filterMinUsd: number | null | undefined,
  filterMaxUsd: number | null | undefined
): boolean {
  const hasMin = filterMinUsd != null && Number.isFinite(filterMinUsd);
  const hasMax = filterMaxUsd != null && Number.isFinite(filterMaxUsd);
  if (!hasMin && !hasMax) return true;
  const fmin = hasMin ? Math.max(0, filterMinUsd as number) : 0;
  const fmax = hasMax ? (filterMaxUsd as number) : Number.POSITIVE_INFINITY;
  const { min: cmin, max: cmax } = compensationRangeUsd(c);
  return cmax >= fmin && cmin <= fmax;
}

function campaignMatchesAthleteFilters(c: StoredCampaign, filters: AthleteOpenCampaignFilters): boolean {
  if (!sportFilterMatches(c, String(filters.sport ?? ''))) return false;
  if (!categoryFilterMatches(c, String(filters.category ?? ''))) return false;
  if (!platformFilterMatches(c, String(filters.platform ?? ''))) return false;
  if (!locationFilterMatches(c, String(filters.location ?? ''))) return false;
  if (!compensationFilterMatches(c, filters.compensationMinUsd, filters.compensationMaxUsd)) return false;
  return true;
}

function filterOpenCampaignsForAthlete(
  openSorted: StoredCampaign[],
  filters: AthleteOpenCampaignFilters | undefined
): StoredCampaign[] {
  if (filters == null) return openSorted;
  const hasAny =
    normLower(filters.sport) ||
    normLower(filters.category) ||
    normLower(filters.platform) ||
    normLower(filters.location) ||
    (filters.compensationMinUsd != null && Number.isFinite(filters.compensationMinUsd)) ||
    (filters.compensationMaxUsd != null && Number.isFinite(filters.compensationMaxUsd));
  if (!hasAny) return openSorted;
  return openSorted.filter((c) => campaignMatchesAthleteFilters(c, filters));
}

/**
 * Cursor-paginated open campaigns for athletes. Sort: createdAt desc, id asc tie-break.
 * Cursor is opaque (base64url JSON of last row's `{ t, id }`); next page starts after that row.
 * Filters apply before pagination; `nextCursor` is relative to the filtered ordering.
 */
export async function listOpenCampaignsForAthletePage(opts: {
  cursor?: string | null;
  limit: number;
  filters?: AthleteOpenCampaignFilters | null;
}): Promise<OpenCampaignsPageResult> {
  const openSorted = await listOpenCampaignsForAthleteSorted();
  const open = filterOpenCampaignsForAthlete(openSorted, opts.filters ?? undefined);
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit)));

  let startIdx = 0;
  const rawCursor = opts.cursor != null ? String(opts.cursor).trim() : '';
  if (rawCursor) {
    const { t, id } = decodeAthleteCampaignCursor(rawCursor);
    const li = open.findIndex(
      (c) => campaignCreatedAtMs(c) === t && idStr(c) === id
    );
    if (li === -1) {
      throw new Error('Invalid cursor');
    }
    startIdx = li + 1;
  }

  if (startIdx >= open.length) {
    return { campaigns: [], nextCursor: null };
  }

  const slice = open.slice(startIdx, startIdx + limit);
  const last = slice[slice.length - 1];
  const nextCursor =
    slice.length > 0 && startIdx + limit < open.length
      ? encodeAthleteCampaignCursor(campaignCreatedAtMs(last!), idStr(last!))
      : null;

  return { campaigns: slice, nextCursor };
}

export async function getCampaignById(campaignId: string): Promise<StoredCampaign | null> {
  const { campaigns } = await readLocalCampaignStore();
  return campaigns.find((c) => idStr(c) === campaignId) ?? null;
}

export async function createCampaign(
  input: Record<string, unknown>
): Promise<StoredCampaign> {
  const _id = newObjectIdHex();
  const raw = validateCampaignInput({ ...input, _id });
  const row = { ...raw, _id: idStr(raw) || _id } as StoredCampaign;

  await mutateLocalCampaignStore((draft) => {
    draft.campaigns.push(row);
  });
  return row;
}

export async function updateCampaign(
  campaignId: string,
  brandUserId: string,
  patch: Partial<StoredCampaign>
): Promise<StoredCampaign | null> {
  let updated: StoredCampaign | null = null;
  await mutateLocalCampaignStore((draft) => {
    const idx = draft.campaigns.findIndex((c) => idStr(c) === campaignId);
    if (idx === -1) return;
    const c = draft.campaigns[idx];
    if (c.brandUserId !== brandUserId) return;
    if (patch.status !== undefined && patch.status !== null) {
      assertCampaignStatusTransition(String(c.status ?? ''), String(patch.status));
    }
    const next = { ...c, ...patch };
    validateCampaignInput(next as Record<string, unknown>);
    draft.campaigns[idx] = next as StoredCampaign;
    updated = draft.campaigns[idx];
  });
  return updated;
}

export async function deleteCampaignById(
  campaignId: string,
  brandUserId: string
): Promise<boolean> {
  let removed = false;
  await mutateLocalCampaignStore((draft) => {
    const idx = draft.campaigns.findIndex((c) => idStr(c) === campaignId);
    if (idx === -1) return;
    const target = draft.campaigns[idx];
    if (String(target.brandUserId) !== brandUserId) return;
    const removedOfferIds = new Set(
      (draft.offers ?? []).filter((o) => String(o.campaignId) === campaignId).map((o) => idStr(o))
    );
    const dealIdsToRemove = new Set(
      (draft.deals ?? [])
        .filter(
          (d) =>
            String(d.campaignId ?? '') === campaignId ||
            (d.offerId != null && removedOfferIds.has(String(d.offerId)))
        )
        .map((d) => idStr(d))
    );
    if (!Array.isArray(draft.deals)) draft.deals = [];
    if (!Array.isArray(draft.deliverables)) draft.deliverables = [];
    if (!Array.isArray(draft.submissions)) draft.submissions = [];
    if (!Array.isArray(draft.dealContracts)) draft.dealContracts = [];
    if (!Array.isArray(draft.dealPayments)) draft.dealPayments = [];
    if (!Array.isArray(draft.dealActivities)) draft.dealActivities = [];
    draft.deliverables = draft.deliverables.filter((x) => !dealIdsToRemove.has(x.dealId));
    draft.submissions = draft.submissions.filter((x) => !dealIdsToRemove.has(x.dealId));
    draft.dealContracts = draft.dealContracts.filter((x) => !dealIdsToRemove.has(x.dealId));
    draft.dealPayments = draft.dealPayments.filter((x) => !dealIdsToRemove.has(x.dealId));
    draft.dealActivities = draft.dealActivities.filter((x) => !dealIdsToRemove.has(x.dealId));
    draft.deals = draft.deals.filter((x) => !dealIdsToRemove.has(idStr(x)));
    draft.campaigns.splice(idx, 1);
    draft.applications = draft.applications.filter((a) => String(a.campaignId) !== campaignId);
    draft.offers = draft.offers.filter((o) => String(o.campaignId) !== campaignId);
    removed = true;
  });
  return removed;
}

export async function listApplicationsForCampaign(campaignId: string): Promise<StoredApplication[]> {
  const { applications } = await readLocalCampaignStore();
  return applications.filter((a) => a.campaignId === campaignId);
}

export async function listApplicationsForAthlete(athleteUserId: string): Promise<StoredApplication[]> {
  const { applications } = await readLocalCampaignStore();
  return applications
    .filter((a) => String(a.athleteUserId) === athleteUserId)
    .sort((a, b) => {
      const ta = new Date(String(a.updatedAt ?? a.createdAt ?? 0)).getTime();
      const tb = new Date(String(b.updatedAt ?? b.createdAt ?? 0)).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
}

export async function getApplicationById(applicationId: string): Promise<StoredApplication | null> {
  const { applications } = await readLocalCampaignStore();
  return applications.find((a) => idStr(a) === applicationId) ?? null;
}

export async function createApplication(
  input: Record<string, unknown>
): Promise<{ application: StoredApplication; error?: 'duplicate'; reactivated?: boolean }> {
  const campaignId = String(input.campaignId ?? '');
  const athleteUserId = String(input.athleteUserId ?? '');
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }
  const visibility = String(campaign.visibility ?? '');
  if ((visibility !== 'Public' && visibility !== 'Private') || !campaign.acceptApplications) {
    throw new Error('Campaign is not accepting applications');
  }
  const source = String(input.source ?? 'regular').trim() || 'regular';
  if (visibility === 'Private' && source !== 'referral') {
    throw new Error('Private campaigns only accept invite/referral applications');
  }
  if (!OPEN_STATUSES.includes(campaign.status as (typeof OPEN_STATUSES)[number])) {
    throw new Error('Campaign is not open for applications');
  }
  const deadline = resolveCampaignApplicationDeadline(campaign);
  if (deadline) {
    const deadlineMs = new Date(deadline).getTime();
    if (!Number.isNaN(deadlineMs) && Date.now() > deadlineMs) {
      throw new Error('Application deadline has passed');
    }
  }

  const existing = await readLocalCampaignStore();
  const duplicate = existing.applications.find(
    (a) => a.campaignId === campaignId && a.athleteUserId === athleteUserId
  );
  if (duplicate) {
    if (String(duplicate.status ?? '') === 'rejected' && duplicate.withdrawnByAthlete === true) {
      let reactivated: StoredApplication | null = null;
      await mutateLocalCampaignStore((draft) => {
        const idx = draft.applications.findIndex((a) => idStr(a) === idStr(duplicate));
        if (idx < 0) return;
        const next = {
          ...draft.applications[idx],
          status: 'applied',
          withdrawnByAthlete: false,
          withdrawnAt: null,
          pitch: typeof input.pitch === 'string' ? input.pitch : '',
        };
        validateApplicationInput(next as Record<string, unknown>);
        draft.applications[idx] = next as StoredApplication;
        reactivated = draft.applications[idx] as StoredApplication;
      });
      if (reactivated) {
        return { application: reactivated, reactivated: true };
      }
    }
    return {
      error: 'duplicate',
      application: duplicate,
    };
  }

  const _id = newObjectIdHex();
  const raw = validateApplicationInput({
    ...input,
    _id,
    status: input.status ?? 'applied',
    messages: input.messages ?? [],
  });
  const row = { ...raw, _id: idStr(raw) || _id } as StoredApplication;

  await mutateLocalCampaignStore((draft) => {
    draft.applications.push(row);
    if (campaign.status === 'Open for Applications') {
      const idx = draft.campaigns.findIndex((c) => idStr(c) === campaignId);
      if (idx >= 0) {
        draft.campaigns[idx] = {
          ...draft.campaigns[idx],
          status: 'Reviewing Candidates',
        } as StoredCampaign;
      }
    }
  });

  return { application: row };
}

export type UpdateApplicationStatusResult =
  | { ok: true; application: StoredApplication }
  | {
      ok: false;
      status: number;
      error: string;
      details?: Record<string, unknown>;
    };

export async function updateApplicationStatus(
  applicationId: string,
  brandUserId: string,
  status: 'under_review' | 'shortlisted' | 'rejected' | 'offer_sent'
): Promise<UpdateApplicationStatusResult> {
  let updated: StoredApplication | null = null;
  let fail: UpdateApplicationStatusResult | null = null;
  await mutateLocalCampaignStore((draft) => {
    const aidx = draft.applications.findIndex((a) => idStr(a) === applicationId);
    if (aidx === -1) {
      fail = { ok: false, status: 404, error: 'Not found or forbidden' };
      return;
    }
    const app = draft.applications[aidx];
    const camp = draft.campaigns.find((c) => idStr(c) === app.campaignId);
    if (!camp || camp.brandUserId !== brandUserId) {
      fail = { ok: false, status: 404, error: 'Not found or forbidden' };
      return;
    }
    const from = String(app.status ?? 'applied');
    try {
      assertApplicationStatusTransition(from, status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid status transition';
      fail = {
        ok: false,
        status: 400,
        error: msg,
        details: { from, to: status },
      };
      return;
    }
    const next = { ...app, status };
    validateApplicationInput(next as Record<string, unknown>);
    draft.applications[aidx] = next as StoredApplication;
    updated = draft.applications[aidx];
  });
  if (fail) return fail;
  if (!updated) return { ok: false, status: 404, error: 'Not found or forbidden' };
  return { ok: true, application: updated };
}

export async function appendApplicationMessage(
  applicationId: string,
  userId: string,
  body: string
): Promise<{ application: StoredApplication | null; error?: 'forbidden' | 'not_found' }> {
  let result: StoredApplication | null = null;
  let error: 'forbidden' | 'not_found' | undefined;
  await mutateLocalCampaignStore((draft) => {
    const aidx = draft.applications.findIndex((a) => idStr(a) === applicationId);
    if (aidx === -1) {
      error = 'not_found';
      return;
    }
    const app = draft.applications[aidx];
    const camp = draft.campaigns.find((c) => idStr(c) === app.campaignId);
    if (!camp) {
      error = 'not_found';
      return;
    }
    const allowed = app.athleteUserId === userId || camp.brandUserId === userId;
    if (!allowed) {
      error = 'forbidden';
      return;
    }
    const messages = Array.isArray(app.messages) ? [...app.messages] : [];
    messages.push({
      _id: newObjectIdHex(),
      fromUserId: userId,
      body: body.trim(),
      createdAt: new Date(),
    });
    const next = { ...app, messages };
    validateApplicationInput(next as Record<string, unknown>);
    draft.applications[aidx] = next as StoredApplication;
    result = draft.applications[aidx];
  });
  return { application: result, error };
}

export type UpdateApplicationByAthleteResult =
  | { ok: true; application: StoredApplication }
  | { ok: false; status: number; error: string };

/**
 * Athlete can edit the submitted pitch only while application is still in `applied`.
 */
export async function updateApplicationPitchByAthlete(
  applicationId: string,
  athleteUserId: string,
  pitch: string
): Promise<UpdateApplicationByAthleteResult> {
  let result: UpdateApplicationByAthleteResult | null = null;
  await mutateLocalCampaignStore((draft) => {
    const idx = draft.applications.findIndex((a) => idStr(a) === applicationId);
    if (idx < 0) {
      result = { ok: false, status: 404, error: 'Application not found' };
      return;
    }
    const app = draft.applications[idx] as StoredApplication;
    if (String(app.athleteUserId ?? '') !== athleteUserId) {
      result = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    const status = String(app.status ?? 'applied');
    if (status !== 'applied' && status !== 'pending') {
      result = { ok: false, status: 400, error: 'Application can only be edited before review starts' };
      return;
    }
    const next = { ...app, status: 'applied', pitch: pitch.trim() };
    try {
      validateApplicationInput(next as Record<string, unknown>);
    } catch (e) {
      result = {
        ok: false,
        status: 400,
        error: e instanceof Error ? e.message : 'Validation failed',
      };
      return;
    }
    draft.applications[idx] = next as StoredApplication;
    result = { ok: true, application: draft.applications[idx] as StoredApplication };
  });
  return result ?? { ok: false, status: 500, error: 'Unexpected error' };
}

/**
 * Athlete withdrawal is allowed until offer is sent. We track it as `rejected` with a flag.
 */
export async function withdrawApplicationByAthlete(
  applicationId: string,
  athleteUserId: string
): Promise<UpdateApplicationByAthleteResult> {
  let result: UpdateApplicationByAthleteResult | null = null;
  await mutateLocalCampaignStore((draft) => {
    const idx = draft.applications.findIndex((a) => idStr(a) === applicationId);
    if (idx < 0) {
      result = { ok: false, status: 404, error: 'Application not found' };
      return;
    }
    const app = draft.applications[idx] as StoredApplication;
    if (String(app.athleteUserId ?? '') !== athleteUserId) {
      result = { ok: false, status: 403, error: 'Forbidden' };
      return;
    }
    const status = String(app.status ?? 'applied');
    if (status !== 'applied' && status !== 'pending') {
      result = {
        ok: false,
        status: 400,
        error: 'Application can only be withdrawn before review starts',
      };
      return;
    }
    if (status === 'rejected' && app.withdrawnByAthlete === true) {
      result = { ok: true, application: app };
      return;
    }
    const next = {
      ...app,
      status: 'rejected',
      withdrawnByAthlete: true,
      withdrawnAt: new Date().toISOString(),
    };
    try {
      validateApplicationInput(next as Record<string, unknown>);
    } catch (e) {
      result = {
        ok: false,
        status: 400,
        error: e instanceof Error ? e.message : 'Validation failed',
      };
      return;
    }
    draft.applications[idx] = next as StoredApplication;
    result = { ok: true, application: draft.applications[idx] as StoredApplication };
  });
  return result ?? { ok: false, status: 500, error: 'Unexpected error' };
}

export type OfferHandoffDetail = { applicationId: string; reason: string };

/**
 * Creates offer draft rows (linkage scaffold only — no execution terms on campaign).
 * Handoff validation: each application must belong to the campaign and have status `shortlisted`.
 * Idempotent: existing draft for (campaignId, applicationId) is returned, not duplicated.
 */
export async function createOfferDraftsFromApplications(
  campaignId: string,
  brandUserId: string,
  applicationIds: string[],
  notes: string
): Promise<
  | { ok: true; offers: StoredOffer[] }
  | { ok: false; status: number; error: string; details?: OfferHandoffDetail[] }
> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, status: 404, error: 'Campaign not found' };
  }
  if (campaign.brandUserId !== brandUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const ids = [...new Set(applicationIds.map((s) => String(s).trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false, status: 400, error: 'applicationIds must include at least one id' };
  }

  const details: OfferHandoffDetail[] = [];
  const apps: StoredApplication[] = [];

  for (const applicationId of ids) {
    const app = await getApplicationById(applicationId);
    if (!app) {
      details.push({ applicationId, reason: 'not_found' });
      continue;
    }
    if (app.campaignId !== campaignId) {
      details.push({ applicationId, reason: 'wrong_campaign' });
      continue;
    }
    if (app.status !== 'shortlisted') {
      details.push({ applicationId, reason: 'not_shortlisted' });
      continue;
    }
    apps.push(app);
  }

  if (details.length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid application selection',
      details,
    };
  }

  const preOffers = (await readLocalCampaignStore()).offers ?? [];
  for (const app of apps) {
    const appId = idStr(app);
    const ex = preOffers.find(
      (o) => String(o.campaignId) === campaignId && String(o.applicationId) === appId
    );
    if (ex && String(ex.brandUserId ?? '') !== brandUserId) {
      return {
        ok: false,
        status: 409,
        error: 'Offer draft exists for this application under a different owner',
        details: [{ applicationId: appId, reason: 'offer_owner_mismatch' }],
      };
    }
  }

  const campaignLookup = (draft: { campaigns: StoredCampaign[] }) => (cid: string) =>
    draft.campaigns.find((c) => idStr(c) === cid) ?? null;

  const resultOffers: StoredOffer[] = [];
  await mutateLocalCampaignStore((draft) => {
    if (!Array.isArray(draft.offers)) draft.offers = [];
    resultOffers.length = 0;
    const resolveCampaign = campaignLookup(draft);
    for (const app of apps) {
      const appId = idStr(app);
      const existingIdx = draft.offers.findIndex(
        (o) =>
          String(o.campaignId) === campaignId &&
          String(o.applicationId) === appId &&
          String(o.brandUserId ?? '') === brandUserId
      );
      const existing = existingIdx >= 0 ? (draft.offers[existingIdx] as StoredOffer) : undefined;
      if (existing) {
        const merged = { ...existing } as Record<string, unknown>;
        if (!merged.offerOrigin) merged.offerOrigin = 'campaign_handoff';
        if (!merged.brandUserId || String(merged.brandUserId).trim() === '') {
          merged.brandUserId = brandUserId;
        }
        const upgraded = validateOfferInput(merged, { campaignById: resolveCampaign }) as StoredOffer;
        const stableId = idStr(existing);
        const row = { ...upgraded, _id: stableId || idStr(upgraded) } as StoredOffer;
        draft.offers[existingIdx] = row;
        resultOffers.push(row);
        continue;
      }
      const _id = newObjectIdHex();
      const raw = validateOfferInput(
        {
          _id,
          brandUserId,
          offerOrigin: 'campaign_handoff',
          campaignId,
          applicationId: appId,
          athleteUserId: String(app.athleteUserId ?? ''),
          status: 'draft',
          notes: notes.trim(),
        },
        { campaignById: resolveCampaign }
      );
      const row = { ...raw, _id: idStr(raw) || _id } as StoredOffer;
      draft.offers.push(row);
      resultOffers.push(row);
    }
  });

  return { ok: true, offers: resultOffers };
}

function athleteSnapshotFromStoredUser(user: StoredUser): Record<string, string> {
  const p = mergeAthleteProfile(user.athleteProfile);
  const followers =
    [p.instagramFollowers, p.twitterFollowers, p.tiktokFollowers].find((s) => s && s.trim()) || '—';
  return {
    name: typeof user.name === 'string' ? user.name.trim() : '',
    sport: p.sport ?? '',
    school: p.school ?? '',
    image: p.imageUrl ?? '',
    followers,
    engagement: '—',
  };
}

export type DirectOfferDraftResult =
  | { ok: true; offer: StoredOffer }
  | { ok: false; status: number; error: string; details?: Record<string, unknown> };

/**
 * Brand-initiated offer draft from athlete profile (no campaign / application linkage).
 * Idempotent per (brandUserId, athleteUserId) for `direct_profile` drafts without campaignId.
 */
export async function createDirectProfileOfferDraft(
  brandUserId: string,
  athleteUserId: string,
  contextNote: string
): Promise<DirectOfferDraftResult> {
  const athleteUserIdNorm = String(athleteUserId ?? '').trim();
  if (!athleteUserIdNorm) {
    return { ok: false, status: 400, error: 'athleteUserId is required' };
  }

  const athlete = await findUserById(athleteUserIdNorm);
  if (!athlete || athlete.role !== 'athlete') {
    return {
      ok: false,
      status: 404,
      error: 'Athlete not found',
      details: { athleteUserId: athleteUserIdNorm },
    };
  }

  let offerOut: StoredOffer | null = null;
  try {
    await mutateLocalCampaignStore((draft) => {
      if (!Array.isArray(draft.offers)) draft.offers = [];
      const existingIdx = draft.offers.findIndex((o) => {
      const bid = o.brandUserId != null ? String(o.brandUserId) : '';
      const aid = o.athleteUserId != null ? String(o.athleteUserId) : '';
      const cid =
        o.campaignId != null && String(o.campaignId).trim() !== '' ? String(o.campaignId) : '';
      const apid =
        o.applicationId != null && String(o.applicationId).trim() !== ''
          ? String(o.applicationId)
          : '';
      return (
        bid === brandUserId &&
        aid === athleteUserIdNorm &&
        String(o.offerOrigin ?? '') === 'direct_profile' &&
        !cid &&
        !apid
      );
    });
    if (existingIdx >= 0) {
      const cur = draft.offers[existingIdx] as StoredOffer;
      const merged = { ...cur } as Record<string, unknown>;
      merged.offerOrigin = 'direct_profile';
      merged.brandUserId = brandUserId;
      merged.athleteUserId = athleteUserIdNorm;
      if (typeof contextNote === 'string' && contextNote.trim()) {
        merged.notes = contextNote.trim();
      }
      const row = validateOfferInput(merged) as StoredOffer;
      const stableId = idStr(cur);
      offerOut = { ...row, _id: stableId || idStr(row) } as StoredOffer;
      draft.offers[existingIdx] = offerOut;
      return;
    }
    const _id = newObjectIdHex();
    const raw = validateOfferInput({
      _id,
      brandUserId,
      offerOrigin: 'direct_profile',
      athleteUserId: athleteUserIdNorm,
      status: 'draft',
      notes: typeof contextNote === 'string' ? contextNote.trim() : '',
    });
    const row = { ...raw, _id: idStr(raw) || _id } as StoredOffer;
      draft.offers.push(row);
      offerOut = row;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Offer validation failed';
    return { ok: false, status: 400, error: msg };
  }

  if (!offerOut) {
    return { ok: false, status: 500, error: 'Failed to persist offer draft' };
  }
  return { ok: true, offer: offerOut };
}

export type ReferralInviteResult =
  | { ok: true; application: StoredApplication; created: boolean }
  | { ok: false; status: number; error: string; details?: Record<string, unknown> };

/**
 * Brand-initiated referral application for an athlete on a campaign.
 * Same acceptance rules as athlete `createApplication`; idempotent on (campaignId, athleteUserId).
 */
export async function createReferralInviteApplication(
  campaignId: string,
  brandUserId: string,
  athleteUserId: string,
  inviteNote: string,
  referralOrigin: 'profile' | 'chat' | 'manual' = 'manual'
): Promise<ReferralInviteResult> {
  const athleteUserIdNorm = String(athleteUserId ?? '').trim();
  if (!athleteUserIdNorm) {
    return { ok: false, status: 400, error: 'athleteUserId is required' };
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, status: 404, error: 'Campaign not found' };
  }
  if (campaign.brandUserId !== brandUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const visibility = String(campaign.visibility ?? '');
  if ((visibility !== 'Public' && visibility !== 'Private') || !campaign.acceptApplications) {
    return { ok: false, status: 400, error: 'Campaign is not accepting applications' };
  }
  if (!OPEN_STATUSES.includes(campaign.status as (typeof OPEN_STATUSES)[number])) {
    return { ok: false, status: 400, error: 'Campaign is not open for applications' };
  }

  const athlete = await findUserById(athleteUserIdNorm);
  if (!athlete || athlete.role !== 'athlete') {
    return {
      ok: false,
      status: 404,
      error: 'Athlete not found',
      details: { athleteUserId: athleteUserIdNorm },
    };
  }

  const noteTrim = typeof inviteNote === 'string' ? inviteNote.trim() : '';
  const referralMeta: Record<string, unknown> = {
    inviterUserId: brandUserId,
    origin: referralOrigin,
    timestamp: new Date(),
    ...(noteTrim ? { note: noteTrim } : {}),
  };

  let application: StoredApplication | null = null;
  let created = false;

  try {
    await mutateLocalCampaignStore((draft) => {
    const dupIdx = draft.applications.findIndex(
      (a) => a.campaignId === campaignId && String(a.athleteUserId) === athleteUserIdNorm
    );
    if (dupIdx >= 0) {
      const dup = draft.applications[dupIdx] as StoredApplication;
      const sourceBefore = String(dup.source ?? 'regular');
      const priorMeta =
        dup.referralMeta != null &&
        typeof dup.referralMeta === 'object' &&
        !Array.isArray(dup.referralMeta)
          ? (dup.referralMeta as Record<string, unknown>)
          : {};
      const mergedInput: Record<string, unknown> = {
        ...(dup as unknown as Record<string, unknown>),
        source: 'referral',
        referralMeta: { ...priorMeta, ...referralMeta },
      };
      if (String(dup.status ?? '') === 'declined' || String(dup.status ?? '') === 'rejected') {
        // Re-inviting a declined row should reopen it for review.
        mergedInput.status = 'under_review';
      }
      if (sourceBefore !== 'referral' || mergedInput.status !== dup.status) {
        const raw = validateApplicationInput(mergedInput);
        const row = { ...raw, _id: idStr(dup) || idStr(raw) } as StoredApplication;
        draft.applications[dupIdx] = row;
        application = row;
      } else {
        application = dup;
      }
      created = false;
      return;
    }

    const campInDraft = draft.campaigns.find((c) => idStr(c) === campaignId);
    if (!campInDraft || String(campInDraft.brandUserId) !== brandUserId) {
      return;
    }

    const _id = newObjectIdHex();
    const raw = validateApplicationInput({
      _id,
      campaignId,
      athleteUserId: athleteUserIdNorm,
      source: 'referral',
      referralMeta,
      status: 'under_review',
      pitch: '',
      athleteSnapshot: athleteSnapshotFromStoredUser(athlete),
      messages: [],
    });
    const row = { ...raw, _id: idStr(raw) || _id } as StoredApplication;
    draft.applications.push(row);
    application = row;
    created = true;

    if (campInDraft.status === 'Open for Applications') {
      const idx = draft.campaigns.findIndex((c) => idStr(c) === campaignId);
      if (idx >= 0) {
        draft.campaigns[idx] = {
          ...draft.campaigns[idx],
          status: 'Reviewing Candidates',
        } as StoredCampaign;
      }
    }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Application validation failed';
    return { ok: false, status: 400, error: msg };
  }

  if (!application) {
    return { ok: false, status: 404, error: 'Campaign not found' };
  }
  return { ok: true, application, created };
}

export async function listOffersForCampaign(
  campaignId: string,
  brandUserId: string
): Promise<{ ok: true; offers: StoredOffer[] } | { ok: false; status: number; error: string }> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, status: 404, error: 'Campaign not found' };
  }
  if (String(campaign.brandUserId) !== brandUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const snap = await readLocalCampaignStore();
  const offers = (snap.offers ?? []).filter(
    (o) => String(o.campaignId) === campaignId && String(o.brandUserId) === brandUserId
  );
  return { ok: true, offers };
}

export async function getOfferByIdForBrand(
  offerId: string,
  brandUserId: string
): Promise<
  | {
      ok: true;
      offer: StoredOffer;
      campaign: StoredCampaign | null;
      application: StoredApplication | null;
    }
  | { ok: false; status: number; error: string }
> {
  const snap = await readLocalCampaignStore();
  const offer = (snap.offers ?? []).find((o) => idStr(o) === offerId);
  if (!offer) {
    return { ok: false, status: 404, error: 'Offer not found' };
  }
  if (String(offer.brandUserId) !== brandUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const cid =
    offer.campaignId != null && String(offer.campaignId).trim() !== '' ? String(offer.campaignId) : '';
  const aid =
    offer.applicationId != null && String(offer.applicationId).trim() !== ''
      ? String(offer.applicationId)
      : '';
  const campaign = cid ? snap.campaigns.find((c) => idStr(c) === cid) ?? null : null;
  const application = aid ? snap.applications.find((a) => idStr(a) === aid) ?? null : null;
  return { ok: true, offer, campaign, application };
}

export async function listOffersForAthlete(
  athleteUserId: string
): Promise<StoredOffer[]> {
  const snap = await readLocalCampaignStore();
  return (snap.offers ?? [])
    .filter((o) => {
      if (String(o.athleteUserId ?? '') !== athleteUserId) return false;
      const status = String(o.status ?? 'draft');
      return status === 'sent' || status === 'accepted' || status === 'declined';
    })
    .sort((a, b) => {
      const ta = new Date(String(a.updatedAt ?? a.createdAt ?? 0)).getTime();
      const tb = new Date(String(b.updatedAt ?? b.createdAt ?? 0)).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
}

export async function getOfferByIdForAthlete(
  offerId: string,
  athleteUserId: string
): Promise<
  | {
      ok: true;
      offer: StoredOffer;
      campaign: StoredCampaign | null;
      application: StoredApplication | null;
    }
  | { ok: false; status: number; error: string }
> {
  const snap = await readLocalCampaignStore();
  const offer = (snap.offers ?? []).find((o) => idStr(o) === offerId);
  if (!offer) {
    return { ok: false, status: 404, error: 'Offer not found' };
  }
  if (String(offer.athleteUserId ?? '') !== athleteUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const cid =
    offer.campaignId != null && String(offer.campaignId).trim() !== '' ? String(offer.campaignId) : '';
  const aid =
    offer.applicationId != null && String(offer.applicationId).trim() !== ''
      ? String(offer.applicationId)
      : '';
  const campaign = cid ? snap.campaigns.find((c) => idStr(c) === cid) ?? null : null;
  const application = aid ? snap.applications.find((a) => idStr(a) === aid) ?? null : null;
  return { ok: true, offer, campaign, application };
}

export async function updateOfferDraftFields(
  offerId: string,
  brandUserId: string,
  patch: { notes?: string; structuredDraft?: unknown }
): Promise<{ ok: true; offer: StoredOffer } | { ok: false; status: number; error: string }> {
  const snap = await readLocalCampaignStore();
  const idx = (snap.offers ?? []).findIndex((o) => idStr(o) === offerId);
  if (idx < 0) {
    return { ok: false, status: 404, error: 'Offer not found' };
  }
  const cur = snap.offers[idx] as StoredOffer;
  if (String(cur.brandUserId) !== brandUserId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  let offerOut: StoredOffer | null = null;
  try {
    await mutateLocalCampaignStore((draft) => {
      const j = (draft.offers ?? []).findIndex((o) => idStr(o) === offerId);
      if (j < 0) return;
      const row = { ...(draft.offers[j] as StoredOffer) } as Record<string, unknown>;
      if (typeof patch.notes === 'string') {
        row.notes = patch.notes;
      }
      if (patch.structuredDraft !== undefined) {
        row.structuredDraft = patch.structuredDraft;
      }
      const cid =
        row.campaignId != null && String(row.campaignId).trim() !== '' ? String(row.campaignId) : '';
      const resolveCampaign = (id: string) =>
        draft.campaigns.find((c) => idStr(c) === id) ?? null;
      const validated = validateOfferInput(row, cid ? { campaignById: resolveCampaign } : undefined) as StoredOffer;
      const stableId = idStr(draft.offers[j] as StoredOffer);
      offerOut = { ...validated, _id: stableId || idStr(validated) } as StoredOffer;
      draft.offers[j] = offerOut;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Offer update failed';
    return { ok: false, status: 400, error: msg };
  }

  if (!offerOut) {
    return { ok: false, status: 500, error: 'Failed to update offer' };
  }
  return { ok: true, offer: offerOut };
}

export type ChatOfferDraftResult =
  | { ok: true; offer: StoredOffer }
  | { ok: false; status: number; error: string; details?: Record<string, unknown> };

/**
 * Placeholder-safe chat lane: persists `chat_negotiated` draft without campaign/application linkage.
 * Idempotent per (brandUserId, athleteUserId, chatThreadId or empty).
 */
export async function createChatNegotiatedOfferDraft(
  brandUserId: string,
  athleteUserId: string,
  chatThreadId: string,
  contextNote: string
): Promise<ChatOfferDraftResult> {
  const athleteUserIdNorm = String(athleteUserId ?? '').trim();
  if (!athleteUserIdNorm) {
    return { ok: false, status: 400, error: 'athleteUserId is required' };
  }
  const threadNorm = String(chatThreadId ?? '').trim();

  const athlete = await findUserById(athleteUserIdNorm);
  if (!athlete || athlete.role !== 'athlete') {
    return {
      ok: false,
      status: 404,
      error: 'Athlete not found',
      details: { athleteUserId: athleteUserIdNorm },
    };
  }

  let offerOut: StoredOffer | null = null;
  try {
    await mutateLocalCampaignStore((draft) => {
      if (!Array.isArray(draft.offers)) draft.offers = [];
      const existingIdx = draft.offers.findIndex((o) => {
        const bid = o.brandUserId != null ? String(o.brandUserId) : '';
        const aid = o.athleteUserId != null ? String(o.athleteUserId) : '';
        const cid =
          o.campaignId != null && String(o.campaignId).trim() !== '' ? String(o.campaignId) : '';
        const apid =
          o.applicationId != null && String(o.applicationId).trim() !== ''
            ? String(o.applicationId)
            : '';
        const origin = String(o.offerOrigin ?? '');
        const sd = o.structuredDraft as Record<string, unknown> | undefined;
        const oc = sd && typeof sd === 'object' && !Array.isArray(sd) ? (sd.originContext as Record<string, unknown> | undefined) : undefined;
        const existingThread =
          oc && typeof oc.chatThreadId === 'string' ? oc.chatThreadId.trim() : '';
        return (
          bid === brandUserId &&
          aid === athleteUserIdNorm &&
          origin === 'chat_negotiated' &&
          !cid &&
          !apid &&
          existingThread === threadNorm
        );
      });
      if (existingIdx >= 0) {
        const cur = draft.offers[existingIdx] as StoredOffer;
        const merged = { ...cur } as Record<string, unknown>;
        merged.offerOrigin = 'chat_negotiated';
        merged.brandUserId = brandUserId;
        merged.athleteUserId = athleteUserIdNorm;
        if (typeof contextNote === 'string' && contextNote.trim()) {
          merged.notes = contextNote.trim();
        }
        const row = validateOfferInput(merged) as StoredOffer;
        const stableId = idStr(cur);
        offerOut = { ...row, _id: stableId || idStr(row) } as StoredOffer;
        draft.offers[existingIdx] = offerOut;
        return;
      }
      const athleteName = typeof athlete.name === 'string' ? athlete.name.trim() : '';
      const wizard = prefillWizardFromChatNegotiated(emptyOfferWizardState(), {
        chatThreadId: threadNorm || undefined,
        athleteName: athleteName || undefined,
      });
      const structuredDraft = {
        version: OFFER_STRUCTURED_DRAFT_VERSION,
        wizard,
        originContext: {
          offerOrigin: 'chat_negotiated' as const,
          athleteUserId: athleteUserIdNorm,
          chatThreadId: threadNorm || null,
          campaignId: null,
          applicationId: null,
        },
      };
      const _id = newObjectIdHex();
      const raw = validateOfferInput({
        _id,
        brandUserId,
        offerOrigin: 'chat_negotiated',
        athleteUserId: athleteUserIdNorm,
        status: 'draft',
        notes: typeof contextNote === 'string' ? contextNote.trim() : '',
        structuredDraft,
      });
      const row = { ...raw, _id: idStr(raw) || _id } as StoredOffer;
      draft.offers.push(row);
      offerOut = row;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Offer validation failed';
    return { ok: false, status: 400, error: msg };
  }

  if (!offerOut) {
    return { ok: false, status: 500, error: 'Failed to persist offer draft' };
  }
  return { ok: true, offer: offerOut };
}
