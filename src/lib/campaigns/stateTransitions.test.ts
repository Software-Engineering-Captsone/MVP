import { describe, expect, it } from 'vitest';
import {
  isApplicationStatusTransitionAllowed,
  validateCampaignStatusTransition,
} from './stateTransitions';
import {
  applicationStatusLabel,
  normalizeApplicationStatus,
  normalizeCampaignStatus,
} from './status';

describe('campaign/application status normalization', () => {
  it('maps legacy campaign labels into the canonical lifecycle', () => {
    expect(normalizeCampaignStatus('Open for Applications')).toBe('Active');
    expect(normalizeCampaignStatus('Reviewing Candidates')).toBe('Active');
    expect(normalizeCampaignStatus('Ready to Launch')).toBe('Draft');
  });

  it('maps legacy application labels into the canonical lifecycle', () => {
    expect(normalizeApplicationStatus('approved')).toBe('offer_drafted');
    expect(normalizeApplicationStatus('rejected')).toBe('declined');
    expect(applicationStatusLabel('approved')).toBe('Offer Drafted');
  });
});

describe('application status transitions', () => {
  it('allows review, shortlist, draft, and send transitions', () => {
    expect(isApplicationStatusTransitionAllowed('pending', 'under_review')).toBe(true);
    expect(isApplicationStatusTransitionAllowed('under_review', 'shortlisted')).toBe(true);
    expect(isApplicationStatusTransitionAllowed('shortlisted', 'offer_drafted')).toBe(true);
    expect(isApplicationStatusTransitionAllowed('offer_drafted', 'offer_sent')).toBe(true);
  });

  it('rejects jumps from closed states back into offer flow', () => {
    expect(isApplicationStatusTransitionAllowed('declined', 'offer_drafted')).toBe(false);
    expect(isApplicationStatusTransitionAllowed('offer_declined', 'offer_sent')).toBe(false);
  });
});

describe('campaign status transitions', () => {
  it('keeps campaigns in canonical statuses', () => {
    expect(validateCampaignStatusTransition('Draft', 'Active')).toEqual({ ok: true });
    expect(validateCampaignStatusTransition('Active', 'Completed')).toEqual({ ok: true });
    expect(validateCampaignStatusTransition('Active', 'Deal Creation in Progress')).toEqual({ ok: true });
    expect(validateCampaignStatusTransition('Completed', 'Active')).toEqual({
      ok: false,
      error: 'Campaign cannot move from "Completed" to "Active"',
    });
  });
});
