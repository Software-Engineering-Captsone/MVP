import type { StoredCampaign } from './localCampaignStore';

export type MatchPreviewStatus =
  | 'ready'
  | 'insufficient_filters'
  | 'broad_estimate'
  | 'no_matches'
  | 'refreshing'
  | 'stale';

/** API contract version for `estimatedMatch` (additive fields allowed). */
export const MATCH_PREVIEW_ESTIMATOR_VERSION = 'match_preview@2';

/** Estimator model label surfaced to clients (mirrors contract bump). */
export const MATCH_PREVIEW_MODEL_VERSION = 'match_preview@2';

/**
 * Staleness is determined only by wall-clock age of `computedAt` vs `staleAfterMs`.
 * Clients and servers MUST use the same rule for consistent UX.
 */
export const MATCH_PREVIEW_STALENESS_STRATEGY = 'computed_at_elapsed_ms_v1' as const;

/** Default TTL when older clients omit `staleAfterMs`. */
export const MATCH_PREVIEW_DEFAULT_STALE_AFTER_MS = 10 * 60 * 1000;

/** Hint for UI polling / manual refresh cadence (seconds). */
export const MATCH_PREVIEW_DEFAULT_RECOMMENDED_REFRESH_SEC = 5 * 60;

export type MatchPreviewStalenessStrategy = typeof MATCH_PREVIEW_STALENESS_STRATEGY;

export interface MatchPreviewStaleness {
  strategy: MatchPreviewStalenessStrategy;
  /** Compare `Date.now() - new Date(computedAt).getTime()` to this threshold. */
  staleAfterMs: number;
  /** Which field in the payload is the reference timestamp (always `computedAt` for v1). */
  referenceField: 'computedAt';
}

export interface MatchPreviewEstimate {
  status: MatchPreviewStatus;
  range: { min: number; max: number };
  confidence: 'low' | 'medium';
  /** Numeric counterpart to `confidence`, always in [0, 1]. */
  confidenceScore: number;
  confidenceReason: string;
  methodology: 'heuristic_v1';
  computedAt: string;
  version: string;
  modelVersion: string;
  /** Stable fingerprint of targeting + sourcing inputs used for this estimate. */
  inputHash: string;
  staleAfterMs: number;
  recommendedRefreshSec: number;
  staleness: MatchPreviewStaleness;
}

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function u32ToHex8(n: number): string {
  return n.toString(16).padStart(8, '0');
}

/**
 * Deterministic hash of the campaign fields that affect match preview targeting/sourcing.
 * Uses a canonical JSON payload (sorted brand tags) and FNV-1a — no Node crypto dependency.
 */
export function computeMatchPreviewInputHash(campaign: StoredCampaign): string {
  const sport = String(campaign.sport ?? '').trim();
  const genderFilter = String(campaign.genderFilter ?? '').trim();
  const location = String(campaign.location ?? '').trim();
  const followerMin = Number(campaign.followerMin ?? 0);
  const engagementMinPct = Number(campaign.engagementMinPct ?? 0);
  const rawTags = Array.isArray(campaign.brandFitTags) ? (campaign.brandFitTags as unknown[]) : [];
  const brandFitTags = rawTags
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const acceptApplications = Boolean(campaign.acceptApplications);
  const visibility = String(campaign.visibility ?? '').trim();

  const payload = {
    sport,
    genderFilter,
    location,
    followerMin: Number.isFinite(followerMin) ? followerMin : 0,
    engagementMinPct: Number.isFinite(engagementMinPct) ? engagementMinPct : 0,
    brandFitTags,
    acceptApplications,
    visibility,
  };
  const canonical = JSON.stringify(payload);
  const h1 = fnv1a32(canonical);
  const h2 = fnv1a32([...canonical].reverse().join(''));
  return `mp_${u32ToHex8(h1)}${u32ToHex8(h2)}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function matchPreviewConfidenceScore(
  status: MatchPreviewStatus,
  confidence: 'low' | 'medium'
): number {
  if (status === 'refreshing') return 0.55;
  if (status === 'no_matches') return 0.08;
  if (status === 'insufficient_filters') return 0.35;
  if (status === 'broad_estimate') return 0.45;
  if (status === 'stale') return 0.28;
  if (confidence === 'medium') return 0.72;
  return 0.4;
}

/** Deterministic staleness check (shared by API docs and UI). */
export function isMatchPreviewStale(
  computedAtIso: string,
  staleAfterMs: number,
  nowMs: number = Date.now()
): boolean {
  const t = new Date(computedAtIso).getTime();
  if (!Number.isFinite(t) || staleAfterMs <= 0) return false;
  return nowMs - t >= staleAfterMs;
}

interface BuildOptions {
  refreshing?: boolean;
  stale?: boolean;
}

function hasMeaningfulFilters(c: StoredCampaign): boolean {
  const sport = String(c.sport ?? '').trim();
  const gender = String(c.genderFilter ?? '').trim();
  const location = String(c.location ?? '').trim();
  const followerMin = Number(c.followerMin ?? 0);
  return (
    followerMin > 0 ||
    (sport.length > 0 && sport !== 'All Sports') ||
    (gender.length > 0 && gender !== 'Any') ||
    location.length > 0
  );
}

export function buildMatchPreviewEstimate(
  campaign: StoredCampaign,
  options: BuildOptions = {}
): MatchPreviewEstimate {
  const inputHash = computeMatchPreviewInputHash(campaign);
  const followerMin = Number(campaign.followerMin ?? 0);
  const hasFilters = hasMeaningfulFilters(campaign);
  const computedAt = new Date().toISOString();

  // Start from a broad marketplace estimate and narrow based on filters.
  let min = 250;
  let max = 2200;

  if (String(campaign.sport ?? 'All Sports') !== 'All Sports') {
    min = Math.round(min * 0.7);
    max = Math.round(max * 0.65);
  }
  if (String(campaign.genderFilter ?? 'Any') !== 'Any') {
    min = Math.round(min * 0.75);
    max = Math.round(max * 0.75);
  }
  if (String(campaign.location ?? '').trim()) {
    min = Math.round(min * 0.7);
    max = Math.round(max * 0.7);
  }
  if (followerMin > 0) {
    const scale = Math.max(0.2, 1 - followerMin / 200);
    min = Math.round(min * scale);
    max = Math.round(max * scale);
  }

  min = Math.max(0, min);
  max = Math.max(min, max);

  let status: MatchPreviewStatus = 'ready';
  let confidence: 'low' | 'medium' = 'medium';

  if (options.refreshing) {
    status = 'refreshing';
  } else if (options.stale) {
    status = 'stale';
    confidence = 'low';
  } else if (!hasFilters) {
    status = 'insufficient_filters';
    confidence = 'low';
  } else if (max === 0) {
    status = 'no_matches';
    confidence = 'low';
  } else if (max - min > 900) {
    status = 'broad_estimate';
    confidence = 'low';
  }

  const staleAfterMs = MATCH_PREVIEW_DEFAULT_STALE_AFTER_MS;
  const recommendedRefreshSec = MATCH_PREVIEW_DEFAULT_RECOMMENDED_REFRESH_SEC;
  const staleness: MatchPreviewStaleness = {
    strategy: MATCH_PREVIEW_STALENESS_STRATEGY,
    staleAfterMs,
    referenceField: 'computedAt',
  };

  const confidenceReason = (() => {
    if (status === 'refreshing') {
      return 'A new estimate is being prepared for the current filters.';
    }
    if (status === 'stale') {
      return 'This snapshot was marked stale; refresh to recompute against the latest saved campaign.';
    }
    if (status === 'insufficient_filters') {
      return 'With few filters applied, the range reflects a wide slice of the marketplace.';
    }
    if (status === 'no_matches') {
      return 'The current filter combination narrows the pool to zero in this heuristic model.';
    }
    if (status === 'broad_estimate') {
      return 'The min/max span is wide; tightening filters would increase precision.';
    }
    if (confidence === 'low') {
      return 'Heuristic confidence is reduced for this edge case.';
    }
    return 'Filters are specific enough for a medium-confidence heuristic band.';
  })();

  const confidenceScore = clamp01(matchPreviewConfidenceScore(status, confidence));

  return {
    status,
    range: { min, max },
    confidence,
    confidenceScore,
    confidenceReason,
    methodology: 'heuristic_v1',
    computedAt,
    version: MATCH_PREVIEW_ESTIMATOR_VERSION,
    modelVersion: MATCH_PREVIEW_MODEL_VERSION,
    inputHash,
    staleAfterMs,
    recommendedRefreshSec,
    staleness,
  };
}
