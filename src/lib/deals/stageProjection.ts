import type {
  ApiActivity,
  ApiContract,
  ApiDeal,
  ApiDeliverable,
  ApiPayment,
  ApiSubmission,
} from '@/lib/deals/dashboardDealsClient';

export type DealStageId =
  | 'agreement'
  | 'work_in_progress'
  | 'review_revisions'
  | 'completed'
  | 'payment'
  | 'closed';

export type ProjectionActor = 'brand' | 'athlete';
export type ActionOwner = 'brand' | 'athlete' | 'system' | 'none';

export type StageAction = {
  key: string;
  label: string;
  owner: ActionOwner;
  enabled: boolean;
  reason?: string;
};

export type DealStageProjection = {
  stageId: DealStageId;
  stageLabel: string;
  stageDescription: string;
  primaryAction: StageAction | null;
  secondaryActions: StageAction[];
  remaining: string[];
  statusLine: string;
  isDisputed: boolean;
};

export type DeliverableProjection = {
  deliverableId: string;
  statusLabel: string;
  latestSubmissionLabel: string;
  latestSubmissionAt: string | null;
  feedback: string | null;
  primaryAction: StageAction | null;
  secondaryActions: StageAction[];
};

const STAGE_LABELS: Record<DealStageId, string> = {
  agreement: 'Agreement',
  work_in_progress: 'Work in Progress',
  review_revisions: 'Review & Revisions',
  completed: 'Completed',
  payment: 'Payment',
  closed: 'Closed',
};

export const STAGE_ORDER: DealStageId[] = [
  'agreement',
  'work_in_progress',
  'review_revisions',
  'completed',
  'payment',
  'closed',
];

const PAYMENT_FLOW_STATUSES = new Set(['pending', 'ready_to_release', 'paid', 'failed', 'manual']);
const MAIN_TIMELINE_EVENTS = new Set([
  'deal_created',
  'contract_uploaded',
  'contract_signed',
  'submission_submitted',
  'revision_requested',
  'submission_approved',
  'deliverable_completed',
  'deal_completed',
  'payment_pending',
  'payment_paid',
]);

function latestSubmissionForDeliverable(
  deliverableId: string,
  submissionsByDeliverable: Record<string, ApiSubmission[]>
): ApiSubmission | null {
  const rows = submissionsByDeliverable[deliverableId] ?? [];
  return rows.reduce<ApiSubmission | null>((acc, row) => {
    if (!acc || row.version > acc.version) return row;
    return acc;
  }, null);
}

export function dealStatusCopy(status: string): string {
  const map: Record<string, string> = {
    created: 'Preparing agreement',
    contract_pending: 'Waiting on contract',
    active: 'Work in progress',
    submission_in_progress: 'Work in progress',
    under_review: 'Under review',
    revision_requested: 'Revision requested',
    approved_completed: 'Completed',
    payment_pending: 'Payment processing',
    paid: 'Paid',
    closed: 'Closed',
    cancelled: 'Cancelled',
    disputed: 'In dispute',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function contractStatusCopy(status: string): string {
  const map: Record<string, string> = {
    not_added: 'No contract uploaded yet',
    uploaded: 'Contract uploaded',
    sent_for_signature: 'Ready to sign',
    signed: 'Contract signed',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function submissionStatusCopy(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Submitted',
    viewed: 'Viewed by brand',
    approved: 'Approved',
    revision_requested: 'Revision requested',
    rejected: 'Needs revision',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function deliverableStatusCopy(status: string): string {
  const map: Record<string, string> = {
    not_started: 'Waiting for work',
    draft_submitted: 'Submitted for review',
    under_review: 'Under review',
    revision_requested: 'Revision requested',
    approved: 'Approved',
    published: 'Published',
    completed: 'Completed',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function paymentStatusCopy(status: string): string {
  const map: Record<string, string> = {
    not_configured: 'Not configured',
    awaiting_setup: 'Setup required',
    pending: 'Processing',
    ready_to_release: 'Ready to release',
    paid: 'Paid',
    failed: 'Payment issue',
    manual: 'Manual payment',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function deriveStage(
  deal: ApiDeal,
  contract: ApiContract | null,
  payment: ApiPayment | null,
  deliverables: ApiDeliverable[]
): DealStageId {
  if (deal.status === 'closed' || deal.status === 'cancelled') return 'closed';

  const contractSigned = contract?.status === 'signed';
  if (!contractSigned || deal.status === 'created' || deal.status === 'contract_pending') {
    return 'agreement';
  }

  if (
    deal.status === 'payment_pending' ||
    deal.status === 'paid' ||
    (payment?.status && PAYMENT_FLOW_STATUSES.has(payment.status))
  ) {
    return 'payment';
  }

  const allDeliverablesCompleted = deliverables.length > 0 && deliverables.every((d) => d.status === 'completed');
  if (deal.status === 'approved_completed' || allDeliverablesCompleted) {
    return 'completed';
  }

  if (deal.status === 'under_review' || deal.status === 'revision_requested') {
    return 'review_revisions';
  }

  return 'work_in_progress';
}

function stageDescription(stageId: DealStageId): string {
  const map: Record<DealStageId, string> = {
    agreement: 'Finalize contract terms and signatures before execution.',
    work_in_progress: 'Athlete is producing deliverables for this deal.',
    review_revisions: 'Brand is reviewing submissions and guiding revisions.',
    completed: 'All deliverables are complete. Ready for payout workflow.',
    payment: 'Payout workflow is in progress or complete.',
    closed: 'Deal is finalized and no further actions are required.',
  };
  return map[stageId];
}

function remainingChecklist(
  stageId: DealStageId,
  contract: ApiContract | null,
  deliverables: ApiDeliverable[],
  payment: ApiPayment | null
): string[] {
  const items: string[] = [];
  if (stageId === 'agreement') {
    if (!contract || contract.status === 'not_added') items.push('Upload contract');
    if (contract && contract.status !== 'signed') items.push('Collect signatures');
  }
  if (stageId === 'work_in_progress' || stageId === 'review_revisions') {
    const open = deliverables.filter((d) => d.status !== 'completed').length;
    items.push(`${open} deliverable${open === 1 ? '' : 's'} remaining`);
  }
  if (stageId === 'completed' || stageId === 'payment') {
    items.push('Finalize payout');
    if (payment && payment.status !== 'paid') items.push(`Payment status: ${paymentStatusCopy(payment.status)}`);
  }
  if (stageId === 'closed') items.push('No remaining actions');
  return items;
}

function actionsForStage(
  stageId: DealStageId,
  actor: ProjectionActor,
  contract: ApiContract | null,
  payment: ApiPayment | null
): { primaryAction: StageAction | null; secondaryActions: StageAction[] } {
  if (stageId === 'agreement') {
    if (!contract || contract.status === 'not_added') {
      return {
        primaryAction: {
          key: 'upload_contract',
          label: 'Upload contract',
          owner: 'brand',
          enabled: actor === 'brand',
          reason: actor === 'brand' ? undefined : 'Waiting on brand',
        },
        secondaryActions: [],
      };
    }
    if (contract.status === 'sent_for_signature') {
      return {
        primaryAction: {
          key: 'sign_contract',
          label: 'Sign contract',
          owner: 'athlete',
          enabled: actor === 'athlete',
          reason: actor === 'athlete' ? undefined : 'Waiting on athlete',
        },
        secondaryActions: [],
      };
    }
    return {
      primaryAction: {
        key: 'await_contract',
        label: 'Await contract signature',
        owner: 'athlete',
        enabled: false,
      },
      secondaryActions: [],
    };
  }

  if (stageId === 'payment') {
    return {
      primaryAction: {
        key: 'await_payment',
        label: payment?.status === 'paid' ? 'Payment completed' : 'Awaiting payment',
        owner: payment?.status === 'paid' ? 'none' : 'system',
        enabled: false,
      },
      secondaryActions: [],
    };
  }

  if (stageId === 'closed') {
    return {
      primaryAction: {
        key: 'closed',
        label: 'No further actions',
        owner: 'none',
        enabled: false,
      },
      secondaryActions: [],
    };
  }

  return { primaryAction: null, secondaryActions: [] };
}

export function buildDealStageProjection(args: {
  actor: ProjectionActor;
  deal: ApiDeal;
  contract: ApiContract | null;
  payment: ApiPayment | null;
  deliverables: ApiDeliverable[];
  submissionsByDeliverable: Record<string, ApiSubmission[]>;
}): DealStageProjection {
  const { actor, deal, contract, payment, deliverables } = args;
  const stageId = deriveStage(deal, contract, payment, deliverables);
  const fromStage = actionsForStage(stageId, actor, contract, payment);
  const isDisputed = deal.status === 'disputed';
  let statusLine = dealStatusCopy(deal.status);
  if (stageId === 'agreement' && contract) {
    statusLine = contractStatusCopy(contract.status);
  } else if (stageId === 'completed') {
    statusLine = 'All deliverables completed';
  } else if (stageId === 'payment' && payment) {
    statusLine = paymentStatusCopy(payment.status);
  } else if (stageId === 'closed') {
    statusLine = deal.status === 'cancelled' ? 'Deal cancelled' : 'Deal closed';
  }
  return {
    stageId,
    stageLabel: STAGE_LABELS[stageId],
    stageDescription: stageDescription(stageId),
    primaryAction: fromStage.primaryAction,
    secondaryActions: fromStage.secondaryActions,
    remaining: remainingChecklist(stageId, contract, deliverables, payment),
    statusLine,
    isDisputed,
  };
}

export function buildDeliverableProjection(args: {
  actor: ProjectionActor;
  deliverable: ApiDeliverable;
  submissionsByDeliverable: Record<string, ApiSubmission[]>;
}): DeliverableProjection {
  const { actor, deliverable, submissionsByDeliverable } = args;
  const latest = latestSubmissionForDeliverable(deliverable.id, submissionsByDeliverable);
  const latestSubmissionLabel = latest
    ? `v${latest.version} · ${submissionStatusCopy(latest.status)}`
    : 'No submission yet';

  let primaryAction: StageAction | null = null;
  let secondaryActions: StageAction[] = [];

  if (actor === 'athlete') {
    const canSubmit = ['not_started', 'revision_requested', 'under_review'].includes(deliverable.status);
    if (canSubmit) {
      const resubmit = deliverable.status === 'revision_requested';
      primaryAction = {
        key: 'submit_work',
        label: resubmit ? 'Resubmit deliverable' : 'Submit deliverable',
        owner: 'athlete',
        enabled: true,
      };
    }
  } else {
    const canReview = latest && (latest.status === 'submitted' || latest.status === 'viewed');
    if (canReview) {
      primaryAction = {
        key: 'approve_submission',
        label: 'Approve submission',
        owner: 'brand',
        enabled: true,
      };
      secondaryActions = [
        {
          key: 'request_revision',
          label: 'Request revision',
          owner: 'brand',
          enabled: true,
        },
      ];
    }
  }

  return {
    deliverableId: deliverable.id,
    statusLabel: deliverableStatusCopy(deliverable.status),
    latestSubmissionLabel,
    latestSubmissionAt: latest?.submittedAt ?? null,
    feedback: latest?.feedback ?? null,
    primaryAction,
    secondaryActions,
  };
}

export function stageProgress(stageId: DealStageId): number {
  return STAGE_ORDER.indexOf(stageId);
}

export function filterMainTimelineActivities(activities: ApiActivity[]): ApiActivity[] {
  return activities.filter((a) => MAIN_TIMELINE_EVENTS.has(a.eventType));
}
