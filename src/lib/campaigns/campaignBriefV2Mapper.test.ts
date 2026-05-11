import { describe, expect, it } from 'vitest';
import {
  campaignBriefV2ToLegacy,
  normalizeCampaignBriefV2,
  objectiveTypeToLegacyCampaignGoal,
  type ObjectiveTypeV2,
} from './campaignBriefV2Mapper';

describe('objectiveTypeToLegacyCampaignGoal', () => {
  it.each([
    ['awareness', 'Brand Awareness'],
    ['consideration', 'Engagement'],
    ['conversion', 'Sales'],
    ['ugc_library', 'UGC Focus'],
  ] satisfies Array<[ObjectiveTypeV2, string]>)(
    'maps %s to a campaigns.goal constraint-safe value',
    (objectiveType, expected) => {
      expect(objectiveTypeToLegacyCampaignGoal(objectiveType)).toBe(expected);
    }
  );
});

describe('campaignBriefV2ToLegacy', () => {
  it('writes the legacy goal field with a Supabase constraint-safe value', () => {
    const brief = normalizeCampaignBriefV2({
      strategy: {
        campaignName: 'Launch test',
        objectiveType: 'conversion',
        primaryKpi: 'sales',
        primaryKpiTarget: 25,
      },
    });

    expect(campaignBriefV2ToLegacy(brief).goal).toBe('Sales');
  });
});
