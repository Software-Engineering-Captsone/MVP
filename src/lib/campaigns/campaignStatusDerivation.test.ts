import { describe, expect, it } from 'vitest';
import { deriveCampaignStatusFromSubmission } from './campaignStatusDerivation';

describe('deriveCampaignStatusFromSubmission', () => {
  it('returns Draft when submission is incomplete and not launched', () => {
    const status = deriveCampaignStatusFromSubmission(
      { campaignBriefV2: null },
      { intent: 'draft' }
    );
    expect(status).toBe('Draft');
  });

  it('returns Reviewing Candidates when submission is complete but not launched', () => {
    const status = deriveCampaignStatusFromSubmission(
      { campaignBriefV2: { schemaVersion: 'v2' } },
      {
        intent: 'draft',
        validatePublishReady: () => true,
      }
    );
    expect(status).toBe('Reviewing Candidates');
  });

  it('returns Active when launched and campaign has not ended', () => {
    const status = deriveCampaignStatusFromSubmission(
      {
        campaignBriefV2: { schemaVersion: 'v2' },
        endDate: '2099-01-01',
      },
      {
        intent: 'publish',
        now: new Date('2026-05-05T00:00:00.000Z'),
      }
    );
    expect(status).toBe('Active');
  });

  it('returns Completed when campaign has already ended', () => {
    const status = deriveCampaignStatusFromSubmission(
      {
        campaignBriefV2: {
          strategy: { flightEndDate: '2026-05-01' },
        },
      },
      {
        intent: 'publish',
        now: new Date('2026-05-05T00:00:00.000Z'),
      }
    );
    expect(status).toBe('Completed');
  });
});
