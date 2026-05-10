import { describe, expect, it } from 'vitest';
import { computeDealNextAction } from './nextAction';
import type { StoredDeal, StoredDeliverable } from './types';

const now = new Date(0).toISOString();

const baseDeal: StoredDeal = {
  _id: 'deal-1',
  offerId: 'offer-1',
  brandUserId: 'brand-1',
  athleteUserId: 'athlete-1',
  campaignId: null,
  applicationId: null,
  chatThreadId: null,
  termsSnapshot: {},
  status: 'submission_in_progress',
  contractId: 'contract-1',
  paymentId: 'payment-1',
  nextActionOwner: null,
  nextActionLabel: '',
  createdAt: now,
  updatedAt: now,
};

const baseDeliverable: StoredDeliverable = {
  _id: 'deliverable-1',
  dealId: 'deal-1',
  title: 'Deliverable',
  order: 0,
  type: 'custom',
  instructions: '',
  status: 'approved',
  dueAt: null,
  draftRequired: true,
  publishRequired: true,
  proofRequired: true,
  disclosureRequired: true,
  revisionLimit: 2,
  revisionCountUsed: 0,
  createdAt: now,
  updatedAt: now,
};

describe('computeDealNextAction publication handoff', () => {
  it('routes publish-required approved deliverables back to the athlete', () => {
    expect(
      computeDealNextAction({
        deal: baseDeal,
        contract: null,
        payment: null,
        deliverables: [baseDeliverable],
      }),
    ).toEqual({
      nextActionOwner: 'athlete',
      nextActionLabel: 'Publish approved content',
    });
  });
});
