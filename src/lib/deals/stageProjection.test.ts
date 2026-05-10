import { describe, expect, it } from 'vitest';
import { buildDealStageProjection, buildDeliverableProjection, paymentStatusCopy } from './stageProjection';
import type { ApiContract, ApiDeal, ApiDeliverable, ApiPayment } from './dashboardDealsClient';

const baseDeal: ApiDeal = {
  id: 'deal-1',
  offerId: 'offer-1',
  brandUserId: 'brand-1',
  athleteUserId: 'athlete-1',
  campaignId: null,
  applicationId: null,
  chatThreadId: null,
  termsSnapshot: {},
  status: 'contract_pending',
  contractId: 'contract-1',
  paymentId: 'payment-1',
  nextActionOwner: 'brand',
  nextActionLabel: '',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function contract(status: string): ApiContract {
  return {
    id: 'contract-1',
    dealId: 'deal-1',
    fileUrl: 'https://example.com/contract.pdf',
    status,
    signedAt: status === 'signed' ? new Date(0).toISOString() : null,
  };
}

function payment(status: string): ApiPayment {
  return {
    id: 'payment-1',
    dealId: 'deal-1',
    amount: 2500,
    currency: 'USD',
    status,
    provider: status === 'paid' ? 'manual' : '',
    providerReference: '',
    releaseCondition: 'on_completion',
    paidAt: status === 'paid' ? new Date(0).toISOString() : null,
  };
}

describe('buildDealStageProjection agreement actions', () => {
  it('uses presentation-safe payout copy for unconfigured payments', () => {
    expect(paymentStatusCopy('not_configured')).toBe('Payout pending');
  });

  it('lets the brand send an uploaded contract for signature', () => {
    const projection = buildDealStageProjection({
      actor: 'brand',
      deal: baseDeal,
      contract: contract('uploaded'),
      payment: null,
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'send_for_signature',
      owner: 'brand',
      enabled: true,
    });
  });

  it('lets the brand activate a signed contract-pending deal', () => {
    const projection = buildDealStageProjection({
      actor: 'brand',
      deal: baseDeal,
      contract: contract('signed'),
      payment: null,
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'activate_deal',
      owner: 'brand',
      enabled: true,
    });
  });

  it('shows brand review as the active action after athlete submission', () => {
    const projection = buildDealStageProjection({
      actor: 'brand',
      deal: { ...baseDeal, status: 'under_review' },
      contract: contract('signed'),
      payment: null,
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'review_submission',
      owner: 'brand',
      enabled: true,
    });
  });

  it('tells the athlete to wait during brand review', () => {
    const projection = buildDealStageProjection({
      actor: 'athlete',
      deal: { ...baseDeal, status: 'under_review' },
      contract: contract('signed'),
      payment: null,
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'await_brand_review',
      enabled: false,
      reason: 'Waiting on brand review',
    });
  });

  it('lets the brand move a completed deal into payout', () => {
    const projection = buildDealStageProjection({
      actor: 'brand',
      deal: { ...baseDeal, status: 'approved_completed' },
      contract: contract('signed'),
      payment: payment('not_configured'),
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'move_to_payment',
      owner: 'brand',
      enabled: true,
    });
  });

  it('lets the brand record payout during payout stage', () => {
    const projection = buildDealStageProjection({
      actor: 'brand',
      deal: { ...baseDeal, status: 'payment_pending' },
      contract: contract('signed'),
      payment: payment('manual'),
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'mark_payment_paid',
      owner: 'brand',
      enabled: true,
    });
  });

  it('shows publication handoff after brand approval of publish-required work', () => {
    const deliverable: ApiDeliverable = {
      id: 'deliverable-1',
      dealId: 'deal-1',
      title: 'Sample',
      type: 'custom',
      instructions: 'Publish the content.',
      dueAt: null,
      draftRequired: true,
      publishRequired: true,
      proofRequired: true,
      disclosureRequired: true,
      revisionLimit: 2,
      revisionCountUsed: 0,
      status: 'approved',
    };

    const brandProjection = buildDealStageProjection({
      actor: 'brand',
      deal: { ...baseDeal, status: 'submission_in_progress' },
      contract: contract('signed'),
      payment: null,
      deliverables: [deliverable],
      submissionsByDeliverable: {},
    });
    expect(brandProjection.primaryAction).toMatchObject({
      key: 'await_athlete_publication',
      owner: 'athlete',
      enabled: false,
      reason: 'Waiting on athlete publication',
    });

    const athleteProjection = buildDealStageProjection({
      actor: 'athlete',
      deal: { ...baseDeal, status: 'submission_in_progress' },
      contract: contract('signed'),
      payment: null,
      deliverables: [deliverable],
      submissionsByDeliverable: {},
    });
    expect(athleteProjection.primaryAction).toMatchObject({
      key: 'mark_published',
      owner: 'athlete',
      enabled: true,
    });
  });

  it('lets the brand close a paid deal', () => {
    const projection = buildDealStageProjection({
      actor: 'brand',
      deal: { ...baseDeal, status: 'paid' },
      contract: contract('signed'),
      payment: payment('paid'),
      deliverables: [],
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'close_deal',
      owner: 'brand',
      enabled: true,
    });
  });
});

describe('buildDeliverableProjection athlete actions', () => {
  const baseDeliverable: ApiDeliverable = {
    id: 'deliverable-1',
    dealId: 'deal-1',
    title: 'Sample',
    type: 'custom',
    instructions: 'Post the content.',
    dueAt: null,
    draftRequired: true,
    publishRequired: false,
    proofRequired: false,
    disclosureRequired: false,
    revisionLimit: 2,
    revisionCountUsed: 0,
    status: 'not_started',
  };

  it('lets the athlete submit when work has not started', () => {
    const projection = buildDeliverableProjection({
      actor: 'athlete',
      deliverable: baseDeliverable,
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toMatchObject({
      key: 'submit_work',
      owner: 'athlete',
      enabled: true,
    });
  });

  it('does not let the athlete submit while brand review is underway', () => {
    const projection = buildDeliverableProjection({
      actor: 'athlete',
      deliverable: { ...baseDeliverable, status: 'under_review' },
      submissionsByDeliverable: {},
    });

    expect(projection.primaryAction).toBeNull();
  });
});
