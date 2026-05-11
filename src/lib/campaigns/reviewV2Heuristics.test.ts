import { describe, expect, it } from 'vitest';
import { computeV2ReviewRiskFlags } from './reviewV2Heuristics';

describe('computeV2ReviewRiskFlags', () => {
  it('does not flag optional blank KPI or creator exclusion fields', () => {
    const flags = computeV2ReviewRiskFlags({
      secondaryKpi: '',
      creatorExclusionsText: '',
      preview: null,
    });

    expect(flags).toEqual([]);
  });

  it('flags low-confidence audience estimates', () => {
    const flags = computeV2ReviewRiskFlags({
      secondaryKpi: '',
      creatorExclusionsText: '',
      preview: {
        status: 'ok',
        confidence: 'low',
        confidenceScore: 0.7,
      },
    });

    expect(flags).toEqual(['Broad match estimate — confidence is low']);
  });

  it('flags broad audience estimates', () => {
    const flags = computeV2ReviewRiskFlags({
      secondaryKpi: '',
      creatorExclusionsText: '',
      preview: {
        status: 'broad_estimate',
      },
    });

    expect(flags).toEqual(['Wide audience — match pool may be very large']);
  });
});
