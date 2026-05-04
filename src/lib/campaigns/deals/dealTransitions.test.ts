import { describe, expect, it } from 'vitest';
import {
  assertContractStatusTransition,
  assertDealStatusTransition,
  dealTransitionRequiresSignedContract,
} from './dealTransitions';
import { assertDeliverableStatusTransition } from './deliverableTransitions';
import { assertSubmissionStatusTransition } from './submissionTransitions';

describe('assertDealStatusTransition', () => {
  it('allows created -> contract_pending', () => {
    expect(() => assertDealStatusTransition('created', 'contract_pending')).not.toThrow();
  });

  it('allows contract_pending -> active', () => {
    expect(() => assertDealStatusTransition('contract_pending', 'active')).not.toThrow();
  });

  it('allows approved_completed -> payment_pending', () => {
    expect(() => assertDealStatusTransition('approved_completed', 'payment_pending')).not.toThrow();
  });

  it('rejects skipping stages (created -> active)', () => {
    expect(() => assertDealStatusTransition('created', 'active')).toThrow(/Invalid deal status transition/);
  });

  it('rejects terminal-ish regressions (paid -> active)', () => {
    expect(() => assertDealStatusTransition('paid', 'active')).toThrow(/Invalid deal status transition/);
  });
});

describe('dealTransitionRequiresSignedContract', () => {
  it('is true only for contract_pending -> active', () => {
    expect(dealTransitionRequiresSignedContract('contract_pending', 'active')).toBe(true);
    expect(dealTransitionRequiresSignedContract('created', 'contract_pending')).toBe(false);
    expect(dealTransitionRequiresSignedContract('active', 'submission_in_progress')).toBe(false);
  });
});

describe('assertContractStatusTransition', () => {
  it('allows single-step forward', () => {
    expect(() => assertContractStatusTransition('uploaded', 'sent_for_signature')).not.toThrow();
  });

  it('rejects backward', () => {
    expect(() => assertContractStatusTransition('signed', 'uploaded')).toThrow(/Invalid contract status transition/);
  });

  it('rejects multi-step skip', () => {
    expect(() => assertContractStatusTransition('not_added', 'signed')).toThrow(/one step at a time/);
  });
});

describe('assertDeliverableStatusTransition', () => {
  it('allows not_started -> draft_submitted', () => {
    expect(() => assertDeliverableStatusTransition('not_started', 'draft_submitted')).not.toThrow();
  });

  it('allows approved -> published or completed', () => {
    expect(() => assertDeliverableStatusTransition('approved', 'published')).not.toThrow();
    expect(() => assertDeliverableStatusTransition('approved', 'completed')).not.toThrow();
    expect(() => assertDeliverableStatusTransition('published', 'completed')).not.toThrow();
  });

  it('rejects completed -> anything', () => {
    expect(() => assertDeliverableStatusTransition('completed', 'not_started')).toThrow(
      /Invalid deliverable status transition/,
    );
  });
});

describe('assertSubmissionStatusTransition', () => {
  it('allows submitted -> viewed', () => {
    expect(() => assertSubmissionStatusTransition('submitted', 'viewed')).not.toThrow();
  });

  it('allows viewed -> revision_requested', () => {
    expect(() => assertSubmissionStatusTransition('viewed', 'revision_requested')).not.toThrow();
  });

  it('rejects approved -> viewed', () => {
    expect(() => assertSubmissionStatusTransition('approved', 'viewed')).toThrow(
      /Invalid submission status transition/,
    );
  });
});
