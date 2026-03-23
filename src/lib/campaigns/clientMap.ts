import type {
  Campaign,
  CampaignStatus,
  Candidate,
  CandidateStatus,
} from '@/components/dashboard/screens/campaignDashboardTypes';

const PLACEHOLDER_ATHLETE =
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80';
const DEFAULT_CAMPAIGN_IMAGE =
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80';

export type ApiCampaignRow = {
  id: string;
  brandDisplayName?: string;
  name: string;
  subtitle?: string;
  packageName?: string;
  goal?: string;
  brief?: string;
  budget?: string;
  duration?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  visibility?: string;
  acceptApplications?: boolean;
  sport?: string;
  packageDetails?: string[];
  platforms?: string[];
  image?: string;
  status?: string;
  createdAt?: string;
};

export type ApiApplicationRow = {
  id: string;
  campaignId: string;
  athleteUserId: string;
  status: string;
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

function appStatusToCandidate(status: string): CandidateStatus {
  switch (status) {
    case 'pending':
      return 'Applied';
    case 'shortlisted':
      return 'Shortlisted';
    case 'approved':
      return 'Selected';
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
    return {
      id: a.id,
      name: snap.name || 'Athlete',
      sport: snap.sport || '—',
      school: snap.school || '—',
      image: snap.image || PLACEHOLDER_ATHLETE,
      followers: snap.followers || '—',
      engagement: snap.engagement || '—',
      status: appStatusToCandidate(a.status),
      appliedDate: formatApplied(a.createdAt),
    };
  });
}

export function apiCampaignToUi(
  c: ApiCampaignRow,
  applications: ApiApplicationRow[] = []
): Campaign {
  const candidates = mapApplicationsToCandidates(applications);
  const status = (c.status || 'Draft') as CampaignStatus;
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
    image: c.image || DEFAULT_CAMPAIGN_IMAGE,
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
