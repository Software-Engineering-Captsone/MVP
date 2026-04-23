import type {
  Campaign,
  CampaignStatus,
  Candidate,
  CandidateStatus,
} from '@/components/dashboard/screens/campaignDashboardTypes';
import type { CampaignBriefV2 } from '@/lib/campaigns/campaignBriefV2Mapper';
import { normalizeCampaignBriefV2 } from '@/lib/campaigns/campaignBriefV2Mapper';

const PLACEHOLDER_ATHLETE =
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80';

/** Wizard package ids — keep aligned with `CreateCampaignOverlay` presets. */
const WIZARD_PACKAGE_IDS = new Set([
  'grand-opening',
  'local-awareness',
  'reel-story',
  'ugc-photo',
]);

/** Brand fit chips — keep aligned with `CreateCampaignOverlay` BRAND_FIT_OPTIONS. */
const KNOWN_BRAND_FIT_TAGS = new Set([
  'Values-aligned',
  'School spirit',
  'Professional tone',
  'Family-friendly',
  'Performance-focused',
]);

const WIZARD_SPORTS = new Set([
  'All Sports',
  'Basketball',
  'Football',
  'Baseball',
  'Soccer',
  'Track & Field',
  'Volleyball',
  'Gymnastics',
]);

export type ApiCampaignRow = {
  id: string;
  brandDisplayName?: string;
  name: string;
  campaignType?: string;
  opportunityContext?: string;
  subtitle?: string;
  packageName?: string;
  packageId?: string;
  goal?: string;
  brief?: string;
  budget?: string;
  budgetHint?: string;
  duration?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  visibility?: string;
  acceptApplications?: boolean;
  sport?: string;
  genderFilter?: string;
  followerMin?: number;
  engagementMinPct?: number;
  brandFitTags?: string[];
  packageDetails?: string[];
  platforms?: string[];
  image?: string;
  status?: string;
  workflowPresetSource?: 'template' | 'scratch';
  workflowPublishReviewConfirmed?: boolean;
  createdAt?: string;
  campaignBriefV2?: unknown;
};

export type ApiApplicationRow = {
  id: string;
  campaignId: string;
  athleteUserId: string;
  source?: 'regular' | 'referral';
  referralMeta?: {
    inviterUserId?: string;
    origin?: 'profile' | 'chat' | 'manual';
    timestamp?: string;
    note?: string;
  };
  status: string;
  withdrawnByAthlete?: boolean;
  withdrawnAt?: string;
  pitch?: string;
  athleteSnapshot?: {
    name?: string;
    sport?: string;
    school?: string;
    image?: string;
    followers?: string;
    engagement?: string;
  };
  createdAt?: string;
};

function appStatusToCandidate(status: string, withdrawnByAthlete?: boolean): CandidateStatus {
  if (withdrawnByAthlete === true && status === 'rejected') {
    return 'Withdrawn';
  }
  switch (status) {
    case 'applied':
    case 'pending':
      return 'Applied';
    case 'under_review':
      return 'Under Review';
    case 'shortlisted':
      return 'Shortlisted';
    case 'offer_sent':
      return 'Offer Sent';
    case 'offer_declined':
      return 'Offer Declined';
    case 'approved':
      return 'Offer Sent';
    case 'rejected':
      return 'Rejected';
    case 'declined':
      return 'Declined';
    default:
      return 'Applied';
  }
}

function formatApplied(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

/** Relative label for dashboard list rows (e.g. "3 days ago"). */
export function formatCampaignRelativePosted(iso?: string | null): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function mapApplicationsToCandidates(apps: ApiApplicationRow[]): Candidate[] {
  return apps.map((a) => {
    const snap = a.athleteSnapshot ?? {};
    const applicationSource: Candidate['applicationSource'] =
      a.source === 'referral' ? 'referral' : 'regular';
    return {
      id: a.id,
      name: snap.name || 'Athlete',
      sport: snap.sport || '—',
      school: snap.school || '—',
      image: snap.image || PLACEHOLDER_ATHLETE,
      followers: snap.followers || '—',
      engagement: snap.engagement || '—',
      status: appStatusToCandidate(a.status, a.withdrawnByAthlete),
      appliedDate: formatApplied(a.createdAt),
      applicationSource,
    };
  });
}

/** Referral applications surface first in the brand campaign detail queue. */
function sortApplicationsForBrandQueue(apps: ApiApplicationRow[]): ApiApplicationRow[] {
  return [...apps].sort((a, b) => {
    const rank = (s: ApiApplicationRow['source'] | undefined) => (s === 'referral' ? 0 : 1);
    return rank(a.source) - rank(b.source);
  });
}

/** Parsed form state for `CreateCampaignOverlay` when resuming a draft from API data. */
export type CampaignDraftOverlayPrefill = {
  campaignName: string;
  opportunityContext: string;
  goal: string;
  budgetMin: string;
  budgetMax: string;
  startDate: string;
  endDate: string;
  brief: string;
  selectedPackage: string | null;
  sport: string;
  gender: string;
  followerMin: number;
  engagementMinPct: number;
  brandFitTags: string[];
  acceptApplications: boolean;
  visibility: 'Public' | 'Private';
  locationRadius: string;
  reviewPublishConfirmed: boolean;
  /** Always set: persisted `campaignBriefV2` or legacy-derived for V2 UI hydration. */
  campaignBriefV2Hydration: CampaignBriefV2;
  /** True when the API row included a stored `campaignBriefV2` document. */
  hadPersistedCampaignBriefV2: boolean;
};

function stripMoneyToken(raw: string): string {
  return raw.replace(/[$,\s]/g, '').trim();
}

/** Parse stored budget strings like `$5,000 – $10,000` into min/max fields for the wizard. */
function parseBudgetRangeForOverlay(budget: string | undefined): { min: string; max: string } {
  if (!budget?.trim()) return { min: '', max: '' };
  const s = budget.trim();
  const m = s.match(/\$?\s*([\d,.\s]+)\s*[–-]\s*\$?\s*([\d,.\s]+)/);
  if (m) {
    return { min: stripMoneyToken(m[1]), max: stripMoneyToken(m[2]) };
  }
  const single = s.match(/\$?\s*([\d,.\s]+)\s*$/);
  if (single) {
    const v = stripMoneyToken(single[1]);
    return { min: v, max: v };
  }
  return { min: '', max: '' };
}

/** Convert API display dates or ISO fragments to `YYYY-MM-DD` for `<input type="date">`. */
function apiDateToDateInputValue(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function normalizeGenderForOverlay(genderFilter: string | undefined): string {
  const g = (genderFilter ?? '').trim();
  if (g === 'Male' || g === 'Female' || g === 'Any') return g;
  if (/^male$/i.test(g)) return 'Male';
  if (/^female$/i.test(g)) return 'Female';
  if (/^men$/i.test(g)) return 'Male';
  if (/^women$/i.test(g)) return 'Female';
  return 'Any';
}

function resolveWizardPackageId(row: ApiCampaignRow): string | null {
  const pid = (row.packageId ?? '').trim();
  if (pid && WIZARD_PACKAGE_IDS.has(pid)) return pid;
  const ctype = (row.campaignType ?? '').trim();
  if (ctype && WIZARD_PACKAGE_IDS.has(ctype)) return ctype;
  return null;
}

/**
 * Maps a persisted campaign row into overlay-local state. Used only for draft resume;
 * non-template packageIds (e.g. seed ids) fall back to custom (null preset).
 */
export function apiCampaignRowToDraftOverlayPrefill(row: ApiCampaignRow): CampaignDraftOverlayPrefill {
  const { min: budgetMin, max: budgetMax } = parseBudgetRangeForOverlay(row.budget ?? row.budgetHint);
  const sportRaw = (row.sport ?? 'All Sports').trim() || 'All Sports';
  const sport = WIZARD_SPORTS.has(sportRaw) ? sportRaw : 'All Sports';
  const tags = (row.brandFitTags ?? []).filter((t) => KNOWN_BRAND_FIT_TAGS.has(t));
  const vis = row.visibility === 'Private' ? 'Private' : 'Public';

  const hadPersistedCampaignBriefV2 =
    row.campaignBriefV2 != null && typeof row.campaignBriefV2 === 'object' && !Array.isArray(row.campaignBriefV2);
  const campaignBriefV2Hydration = hadPersistedCampaignBriefV2
    ? normalizeCampaignBriefV2(row.campaignBriefV2)
    : normalizeCampaignBriefV2(undefined);

  return {
    campaignName: row.name ?? '',
    opportunityContext: row.opportunityContext ?? '',
    goal: row.goal ?? '',
    budgetMin,
    budgetMax,
    startDate: apiDateToDateInputValue(row.startDate),
    endDate: apiDateToDateInputValue(row.endDate),
    brief: row.brief ?? '',
    selectedPackage: resolveWizardPackageId(row),
    sport,
    gender: normalizeGenderForOverlay(row.genderFilter),
    followerMin: typeof row.followerMin === 'number' && !Number.isNaN(row.followerMin) ? row.followerMin : 0,
    engagementMinPct:
      typeof row.engagementMinPct === 'number' && !Number.isNaN(row.engagementMinPct)
        ? row.engagementMinPct
        : 0,
    brandFitTags: tags,
    acceptApplications: row.acceptApplications !== false,
    visibility: vis,
    locationRadius: row.location ?? '',
    reviewPublishConfirmed: Boolean(row.workflowPublishReviewConfirmed),
    campaignBriefV2Hydration,
    hadPersistedCampaignBriefV2,
  };
}

/** Maps legacy stored statuses to the current `CampaignStatus` union (UI + types). */
export function normalizeUiCampaignStatus(raw: string | undefined): CampaignStatus {
  const s = (raw ?? '').trim() || 'Draft';
  if (s === 'Open for Applications') return 'Active';
  return s as CampaignStatus;
}

export function apiCampaignToUi(
  c: ApiCampaignRow,
  applications: ApiApplicationRow[] = []
): Campaign {
  const candidates = mapApplicationsToCandidates(sortApplicationsForBrandQueue(applications));
  const status = normalizeUiCampaignStatus(c.status);
  return {
    id: c.id,
    name: c.name,
    subtitle: c.subtitle || c.packageName || '',
    packageName: c.packageName || '',
    goal: c.goal || '',
    status,
    budget: c.budget || '',
    duration: c.duration || '',
    location: c.location || '',
    brief: c.brief || '',
    athleteCount: 0,
    candidateCount: candidates.length,
    image: typeof c.image === 'string' ? c.image : '',
    startDate: c.startDate || '',
    endDate: c.endDate || '',
    visibility: c.visibility === 'Private' ? 'Private' : 'Public',
    acceptApplications: c.acceptApplications !== false,
    sport: c.sport || 'All Sports',
    packageDetails: c.packageDetails ?? [],
    platforms: c.platforms ?? [],
    deliverables: [],
    candidates,
    athletes: [],
    activity: [],
  };
}
