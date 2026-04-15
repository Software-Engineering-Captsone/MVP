import type { CampaignBriefV2 } from '@/lib/campaigns/campaignBriefV2Mapper';

function stableSerializeInner(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return null;
  if (Array.isArray(value)) {
    return value.map((v) => stableSerializeInner(v, seen));
  }
  seen.add(value as object);
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = stableSerializeInner(o[k], seen);
  }
  return out;
}

/** Deterministic JSON for draft equality / autosave skip (sorted object keys). */
export function stableSerializeForAutosave(value: unknown): string {
  return JSON.stringify(stableSerializeInner(value, new WeakSet()));
}

export type V2CostForecast = {
  minUsd: number;
  maxUsd: number;
  deliverableUnits: number;
  budgetCap: number;
};

/**
 * Heuristic creator-spend band from budget cap and deliverable units (deterministic, not a quote).
 */
export function computeV2CostForecastRange(brief: CampaignBriefV2 | undefined): V2CostForecast | null {
  if (!brief) return null;
  const cap = brief.budgetRights?.budgetCap;
  if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) return null;
  const bundle = brief.contentDeliverables?.deliverableBundle ?? [];
  const units = Math.max(
    1,
    bundle.reduce((sum, d) => {
      const q = typeof d.quantity === 'number' && d.quantity > 0 ? d.quantity : 1;
      return sum + q;
    }, 0)
  );
  const intensity = Math.min(0.35, (units - 1) * 0.04);
  const lowPct = 0.52 - intensity * 0.5;
  const highPct = Math.min(0.98, 0.9 - intensity * 0.3);
  const minUsd = Math.round(cap * lowPct);
  const maxUsd = Math.round(cap * highPct);
  return {
    minUsd: Math.min(minUsd, maxUsd),
    maxUsd: Math.max(minUsd, maxUsd),
    deliverableUnits: units,
    budgetCap: cap,
  };
}

export type V2ReviewRiskPreview = {
  status: string;
  confidence?: string;
  confidenceScore?: number;
} | null;

export function computeV2ReviewRiskFlags(input: {
  secondaryKpi: string;
  creatorExclusionsText: string;
  preview: V2ReviewRiskPreview;
}): string[] {
  const flags: string[] = [];
  const p = input.preview;
  const lowConfidence =
    p != null &&
    ((typeof p.confidenceScore === 'number' &&
      Number.isFinite(p.confidenceScore) &&
      p.confidenceScore < 0.45) ||
      /\blow\b/i.test(p.confidence ?? ''));
  if (lowConfidence) {
    flags.push('Broad match estimate — confidence is low');
  }
  if (!input.secondaryKpi || String(input.secondaryKpi).trim() === '') {
    flags.push('No secondary KPI defined');
  }
  if (!input.creatorExclusionsText.trim()) {
    flags.push('No creator exclusions set');
  }
  if (p?.status === 'broad_estimate') {
    flags.push('Wide audience — match pool may be very large');
  }
  return flags;
}
