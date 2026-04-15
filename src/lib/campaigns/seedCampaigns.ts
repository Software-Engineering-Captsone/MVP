/**
 * Demo campaigns merged into `data/local-campaign-store.json` when missing.
 * Uses a synthetic brand user id so new athlete accounts always see open opportunities.
 */
export const SEED_BRAND_USER_ID = 'seed-brand-nilink-demo';

/** Stable ids so we never duplicate seeds across restarts. */
export const SEED_CAMPAIGN_IDS = [
  '64f0a1b2c3d4e5f6a7b8c9d1',
  '64f0a1b2c3d4e5f6a7b8c9d2',
  '64f0a1b2c3d4e5f6a7b8c9d3',
  '64f0a1b2c3d4e5f6a7b8c9d4',
  '64f0a1b2c3d4e5f6a7b8c9d5',
] as const;

function daysAgoIso(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function buildSeedBrief(input: {
  name: string;
  summary: string;
  startDate: string;
  endDate: string;
  marketRegion: string;
  sport: string;
  followerMin: number;
  engagementRateMinPct?: number;
  platforms: string[];
  deliverables: string[];
  budgetCap: number;
  visibility: 'public' | 'private';
  acceptApplications: boolean;
}): Record<string, unknown> {
  return {
    schemaVersion: 'campaign_brief_v2',
    strategy: {
      campaignName: input.name,
      objectiveType: 'awareness',
      primaryKpi: 'engagement_rate',
      primaryKpiTarget: Math.max(1, input.engagementRateMinPct ?? 3),
      flightStartDate: input.startDate,
      flightEndDate: input.endDate,
      marketRegion: input.marketRegion,
      campaignSummary: input.summary,
    },
    audienceCreatorFit: {
      audiencePersona: 'Student-athletes with strong authentic audience fit.',
      sportCategory: input.sport || 'All Sports',
      followerRangeMin: Math.max(0, input.followerMin),
      engagementRateMinPct: Math.max(0, input.engagementRateMinPct ?? 0),
      audienceGeoRequirement: 'preferred',
      genderFilter: 'Any',
    },
    contentDeliverables: {
      platforms: input.platforms.map((p) => p.toLowerCase()),
      deliverableBundle: input.deliverables.map((d) => ({
        platform: input.platforms[0]?.toLowerCase() || 'instagram',
        format: 'custom',
        quantity: 1,
        notes: d,
      })),
      ctaType: 'learn_more',
      messagePillars: ['Brand alignment'],
      draftRequired: true,
      revisionRounds: 1,
    },
    budgetRights: {
      budgetCap: input.budgetCap,
      paymentModel: 'flat',
      usageRights: { mode: 'organic_only', durationDays: 90 },
    },
    sourcingVisibility: {
      acceptApplications: input.acceptApplications,
      visibility: input.visibility,
      shortlistStrategy: 'manual',
    },
    reviewLaunch: { reviewConfirmed: true },
    templateMeta: { source: 'blank' },
  };
}

/**
 * Raw shapes validated before persisting (see validateCampaignRecords).
 */
export function buildSeedCampaignTemplates(): Record<string, unknown>[] {
  return [
    {
      _id: SEED_CAMPAIGN_IDS[0],
      brandUserId: SEED_BRAND_USER_ID,
      brandDisplayName: 'FitLife Nutrition',
      name: 'Spring Product Reviews',
      subtitle: 'UGC + Instagram Reels',
      packageName: 'Creator Review Bundle',
      packageId: 'seed-pkg-1',
      goal: 'Product Review',
      brief:
        'Share honest reviews of our new hydration line. We provide product, talking points, and a flexible posting window during the NCAA season.',
      budget: '$800 – $1,200',
      duration: '6 weeks',
      location: 'United States',
      startDate: 'Mar 1, 2026',
      endDate: 'Apr 15, 2026',
      visibility: 'Public',
      acceptApplications: true,
      sport: 'All Sports',
      genderFilter: 'Any',
      followerMin: 0,
      packageDetails: ['2 Reels', '1 Story series', 'Usage rights 12 months'],
      platforms: ['Instagram', 'TikTok'],
      campaignBriefV2: buildSeedBrief({
        name: 'Spring Product Reviews',
        summary:
          'Share honest reviews of our new hydration line. We provide product, talking points, and a flexible posting window during the NCAA season.',
        startDate: '2026-03-01',
        endDate: '2026-04-15',
        marketRegion: 'US',
        sport: 'All Sports',
        followerMin: 0,
        platforms: ['instagram', 'tiktok'],
        deliverables: ['2 Reels', '1 Story series', 'Usage rights 12 months'],
        budgetCap: 1200,
        visibility: 'public',
        acceptApplications: true,
      }),
      image: '',
      status: 'Open for Applications',
      createdAt: daysAgoIso(2),
      updatedAt: daysAgoIso(2),
    },
    {
      _id: SEED_CAMPAIGN_IDS[1],
      brandUserId: SEED_BRAND_USER_ID,
      brandDisplayName: 'Metro Motors Auto Group',
      name: 'Regional Commercial Spots',
      subtitle: 'Dealership + NIL',
      packageName: 'Commercial Shoot',
      packageId: 'seed-pkg-2',
      goal: 'Commercial Shoot',
      brief:
        'Local-market TV and social spots featuring student athletes. One on-site shoot day plus deliverables for paid social.',
      budget: '$2,000 – $3,500',
      duration: '8 weeks',
      location: 'Midwest markets',
      startDate: 'Mar 10, 2026',
      endDate: 'May 1, 2026',
      visibility: 'Public',
      acceptApplications: true,
      sport: 'All Sports',
      genderFilter: 'Any',
      followerMin: 5000,
      packageDetails: ['1 shoot day', '2 hero edits', 'B-roll for social'],
      platforms: ['Instagram', 'YouTube'],
      campaignBriefV2: buildSeedBrief({
        name: 'Regional Commercial Spots',
        summary:
          'Local-market TV and social spots featuring student athletes. One on-site shoot day plus deliverables for paid social.',
        startDate: '2026-03-10',
        endDate: '2026-05-01',
        marketRegion: 'US-Midwest',
        sport: 'All Sports',
        followerMin: 5000,
        platforms: ['instagram', 'youtube'],
        deliverables: ['1 shoot day', '2 hero edits', 'B-roll for social'],
        budgetCap: 3500,
        visibility: 'public',
        acceptApplications: true,
      }),
      image: '',
      status: 'Open for Applications',
      createdAt: daysAgoIso(5),
      updatedAt: daysAgoIso(5),
    },
    {
      _id: SEED_CAMPAIGN_IDS[2],
      brandUserId: SEED_BRAND_USER_ID,
      brandDisplayName: 'StudyApp Co',
      name: 'Campus Ambassador — Spring Term',
      subtitle: 'Ongoing ambassador program',
      packageName: 'Ambassador',
      packageId: 'seed-pkg-3',
      goal: 'Brand Ambassador',
      brief:
        'Represent our study and focus app on campus. Host micro-events, post twice weekly, and join a monthly creator call.',
      budget: '$1,500/mo',
      duration: 'Mar – Jun 2026',
      location: 'Remote + campus',
      startDate: 'Mar 1, 2026',
      endDate: 'Jun 30, 2026',
      visibility: 'Public',
      acceptApplications: true,
      sport: 'All Sports',
      genderFilter: 'Any',
      followerMin: 2000,
      packageDetails: ['8 posts/mo', 'Campus tabling kit', 'Performance stipend'],
      platforms: ['Instagram', 'TikTok'],
      campaignBriefV2: buildSeedBrief({
        name: 'Campus Ambassador — Spring Term',
        summary:
          'Represent our study and focus app on campus. Host micro-events, post twice weekly, and join a monthly creator call.',
        startDate: '2026-03-01',
        endDate: '2026-06-30',
        marketRegion: 'US',
        sport: 'All Sports',
        followerMin: 2000,
        platforms: ['instagram', 'tiktok'],
        deliverables: ['8 posts/mo', 'Campus tabling kit', 'Performance stipend'],
        budgetCap: 1500,
        visibility: 'public',
        acceptApplications: true,
      }),
      image: '',
      status: 'Reviewing Candidates',
      createdAt: daysAgoIso(7),
      updatedAt: daysAgoIso(1),
    },
    {
      _id: SEED_CAMPAIGN_IDS[3],
      brandUserId: SEED_BRAND_USER_ID,
      brandDisplayName: 'Campus Threads',
      name: 'Game-Day Fit — Content Series',
      subtitle: 'Apparel + lifestyle',
      packageName: 'Lifestyle bundle',
      packageId: 'seed-pkg-4',
      goal: 'Social Media Campaign',
      brief:
        'Showcase game-day outfits and recovery fits. We ship seasonal kits; you create carousel and short-form content.',
      budget: '$1,200 – $2,000',
      duration: '4 weeks',
      location: 'United States',
      startDate: 'Mar 15, 2026',
      endDate: 'Apr 20, 2026',
      visibility: 'Public',
      acceptApplications: true,
      sport: 'Football',
      genderFilter: 'Any',
      followerMin: 3000,
      packageDetails: ['3 Carousels', '2 Reels', 'Affiliate code'],
      platforms: ['Instagram'],
      campaignBriefV2: buildSeedBrief({
        name: 'Game-Day Fit — Content Series',
        summary:
          'Showcase game-day outfits and recovery fits. We ship seasonal kits; you create carousel and short-form content.',
        startDate: '2026-03-15',
        endDate: '2026-04-20',
        marketRegion: 'US',
        sport: 'Football',
        followerMin: 3000,
        platforms: ['instagram'],
        deliverables: ['3 Carousels', '2 Reels', 'Affiliate code'],
        budgetCap: 2000,
        visibility: 'public',
        acceptApplications: true,
      }),
      image: '',
      status: 'Open for Applications',
      createdAt: daysAgoIso(3),
      updatedAt: daysAgoIso(3),
    },
    {
      _id: SEED_CAMPAIGN_IDS[4],
      brandUserId: SEED_BRAND_USER_ID,
      brandDisplayName: 'PowerFuel Energy',
      name: 'Training Week Fuel-Ups',
      subtitle: 'Short-form + stories',
      packageName: 'Training content',
      packageId: 'seed-pkg-5',
      goal: 'Product Endorsement',
      brief:
        'Document a week of training with our energy and recovery products. Authentic voice; no scripted medical claims.',
      budget: '$900 – $1,400',
      duration: '3 weeks',
      location: 'United States',
      startDate: 'Mar 5, 2026',
      endDate: 'Mar 28, 2026',
      visibility: 'Public',
      acceptApplications: true,
      sport: 'All Sports',
      genderFilter: 'Any',
      followerMin: 0,
      packageDetails: ['5 Stories', '1 Reel', 'Product shipment'],
      platforms: ['Instagram', 'TikTok'],
      campaignBriefV2: buildSeedBrief({
        name: 'Training Week Fuel-Ups',
        summary:
          'Document a week of training with our energy and recovery products. Authentic voice; no scripted medical claims.',
        startDate: '2026-03-05',
        endDate: '2026-03-28',
        marketRegion: 'US',
        sport: 'All Sports',
        followerMin: 0,
        platforms: ['instagram', 'tiktok'],
        deliverables: ['5 Stories', '1 Reel', 'Product shipment'],
        budgetCap: 1400,
        visibility: 'public',
        acceptApplications: true,
      }),
      image: '',
      status: 'Open for Applications',
      createdAt: daysAgoIso(1),
      updatedAt: daysAgoIso(1),
    },
  ];
}
