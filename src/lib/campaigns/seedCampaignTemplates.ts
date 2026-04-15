import type { StoredCampaignTemplate } from './localCampaignStore';
import { normalizeCampaignBriefV2 } from './campaignBriefV2Mapper';

/** Stable ids for idempotent system template seeding. */
export const SEED_SYSTEM_TEMPLATE_IDS = ['tpl-system-ugc-reels', 'tpl-system-campus-ambassador'] as const;

export function buildSeedSystemCampaignTemplates(): StoredCampaignTemplate[] {
  const now = new Date().toISOString();
  const systemAuthor = 'system';

  const ugc = normalizeCampaignBriefV2({
    strategy: {
      campaignName: 'Product UGC — Reels',
      objectiveType: 'ugc_library',
      primaryKpi: 'engagement_rate',
      primaryKpiTarget: 3,
      flightStartDate: '',
      flightEndDate: '',
      marketRegion: 'United States',
      campaignSummary: 'Ship product, collect short-form UGC with clear talking points.',
    },
    audienceCreatorFit: {
      audiencePersona: 'Lifestyle creators comfortable on-camera with product demos',
      sportCategory: 'All Sports',
      followerRangeMin: 5000,
      engagementRateMinPct: 2,
      audienceGeoRequirement: 'preferred',
      genderFilter: 'Any',
    },
    contentDeliverables: {
      platforms: ['instagram', 'tiktok'],
      deliverableBundle: [
        { platform: 'instagram', format: 'reel', quantity: 2 },
        { platform: 'tiktok', format: 'short_video', quantity: 2 },
      ],
      ctaType: 'learn_more',
      messagePillars: ['Authentic use', 'Clear product benefits'],
      draftRequired: true,
      revisionRounds: 1,
    },
    budgetRights: {
      budgetCap: 1500,
      paymentModel: 'flat',
      usageRights: { mode: 'organic_only', durationDays: 180 },
    },
    sourcingVisibility: {
      acceptApplications: true,
      visibility: 'public',
      shortlistStrategy: 'manual',
    },
    reviewLaunch: { reviewConfirmed: false },
    templateMeta: { source: 'system' },
  });

  const ambassador = normalizeCampaignBriefV2({
    strategy: {
      campaignName: 'Campus Ambassador Program',
      objectiveType: 'awareness',
      primaryKpi: 'reach',
      primaryKpiTarget: 100000,
      flightStartDate: '',
      flightEndDate: '',
      marketRegion: 'North America',
      campaignSummary: 'Ongoing campus presence with weekly posting cadence.',
    },
    audienceCreatorFit: {
      audiencePersona: 'Student athletes active on campus and social',
      sportCategory: 'All Sports',
      followerRangeMin: 2500,
      engagementRateMinPct: 1.5,
      audienceGeoRequirement: 'strict',
      genderFilter: 'Any',
    },
    contentDeliverables: {
      platforms: ['instagram'],
      deliverableBundle: [{ platform: 'instagram', format: 'story', quantity: 8 }],
      ctaType: 'sign_up',
      messagePillars: ['Campus moments', 'Study and lifestyle integration'],
      draftRequired: true,
      revisionRounds: 1,
    },
    budgetRights: {
      budgetCap: 2500,
      paymentModel: 'flat',
      usageRights: { mode: 'paid_usage', durationDays: 365, channels: ['social_paid'] },
    },
    sourcingVisibility: {
      acceptApplications: true,
      visibility: 'public',
      shortlistStrategy: 'manual',
    },
    reviewLaunch: { reviewConfirmed: false },
    templateMeta: { source: 'system' },
  });

  return [
    {
      _id: SEED_SYSTEM_TEMPLATE_IDS[0],
      orgId: null,
      name: 'Product UGC — Reels',
      description: 'System preset for review-style UGC on Reels/TikTok.',
      version: 1,
      status: 'active',
      defaults: ugc as unknown as Record<string, unknown>,
      lockedPaths: ['contentDeliverables.platforms'],
      createdBy: systemAuthor,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: SEED_SYSTEM_TEMPLATE_IDS[1],
      orgId: null,
      name: 'Campus Ambassador',
      description: 'System preset for term-long ambassador programs.',
      version: 1,
      status: 'active',
      defaults: ambassador as unknown as Record<string, unknown>,
      lockedPaths: undefined,
      createdBy: systemAuthor,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
