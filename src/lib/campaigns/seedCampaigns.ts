/**
 * Demo campaigns merged into `data/local-campaign-store.json` when missing.
 * Uses a synthetic brand user id so new athlete accounts always see open opportunities.
 */
export const SEED_BRAND_USER_ID = 'seed-brand-nilink-demo';

const U = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=800&q=85&auto=format&fit=crop`;

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

/**
 * Raw shapes validated with the Campaign mongoose schema before persisting.
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
      image: U('photo-1584308666744-24d5c474f2ae'),
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
      image: U('photo-1492144534655-ae79c964c9d7'),
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
      image: U('photo-1576678927484-cc907957088c'),
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
      image: U('photo-1441986300917-64674bd600d8'),
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
      image: U('photo-1571019613454-1cb2f99b2d8b'),
      status: 'Open for Applications',
      createdAt: daysAgoIso(1),
      updatedAt: daysAgoIso(1),
    },
  ];
}
