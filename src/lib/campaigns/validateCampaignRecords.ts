import Joi from 'joi';

function formatJoiError(err: Joi.ValidationError): string {
  return err.details.map((d) => d.message.replace(/"/g, "'")).join('; ');
}

const CAMPAIGN_STATUSES = [
  'Draft',
  'Ready to Launch',
  'Open for Applications',
  'Reviewing Candidates',
  'Deal Creation in Progress',
  'Active',
  'Completed',
] as const;

const campaignSchema = Joi.object({
  _id: Joi.string().optional(),
  brandUserId: Joi.string().trim().required(),
  brandDisplayName: Joi.string().allow('').optional(),
  name: Joi.string().trim().required(),
  visibility: Joi.string().valid('Public', 'Private').default('Public'),
  acceptApplications: Joi.boolean().default(true),
  image: Joi.string().allow('').optional(),
  workflowPresetSource: Joi.string().valid('template', 'scratch').optional(),
  workflowPublishReviewConfirmed: Joi.boolean().optional(),
  campaignBriefV2: Joi.object().unknown(true).required(),
  status: Joi.string()
    .valid(...CAMPAIGN_STATUSES)
    .default('Open for Applications'),
}).unknown(true);

export function validateCampaignInput(data: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = campaignSchema.validate(data, {
    abortEarly: false,
    stripUnknown: false,
  });
  if (error) throw new Error(formatJoiError(error));
  return value as Record<string, unknown>;
}

const applicationMessageSchema = Joi.object({
  fromUserId: Joi.string().required(),
  body: Joi.string().trim().required(),
  createdAt: Joi.any().optional(),
}).unknown(true);

const applicationSchema = Joi.object({
  _id: Joi.string().optional(),
  campaignId: Joi.string().required(),
  athleteUserId: Joi.string().required(),
  source: Joi.string().valid('regular', 'referral').default('regular'),
  referralMeta: Joi.object().unknown(true).optional(),
  status: Joi.string()
    .valid(
      'applied',
      'under_review',
      'shortlisted',
      'rejected',
      'offer_sent',
      'offer_declined',
      // Legacy statuses kept for backward-compatible reads/migrations.
      'pending',
      'approved',
      'declined'
    )
    .default('applied'),
  pitch: Joi.string().allow('').optional(),
  athleteSnapshot: Joi.object().unknown(true).optional(),
  messages: Joi.array().items(applicationMessageSchema).optional(),
}).unknown(true);

/** Legacy applications without `source` default to `regular` before validation. */
export function validateApplicationInput(data: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...data };
  if (merged.source == null || merged.source === '') {
    merged.source = 'regular';
  }
  const { error, value } = applicationSchema.validate(merged, {
    abortEarly: false,
    stripUnknown: false,
  });
  if (error) throw new Error(formatJoiError(error));
  return value as Record<string, unknown>;
}

export type ValidateOfferOptions = {
  /** When `brandUserId` is missing, fill from campaign row if linked. */
  campaignById?: (campaignId: string) => Record<string, unknown> | null | undefined;
};

const offerSchema = Joi.object({
  _id: Joi.string().optional(),
  brandUserId: Joi.string().trim().allow(''),
  offerOrigin: Joi.string().valid('campaign_handoff', 'direct_profile', 'chat_negotiated').required(),
  campaignId: Joi.string().allow('', null).optional(),
  applicationId: Joi.string().allow('', null).optional(),
  athleteUserId: Joi.string().required(),
  status: Joi.string().valid('draft', 'sent', 'accepted', 'declined').default('draft'),
  dealId: Joi.string().allow('', null).optional(),
  sentAt: Joi.any().optional(),
  acceptedAt: Joi.any().optional(),
  declinedAt: Joi.any().optional(),
  notes: Joi.string().allow('').optional(),
  structuredDraft: Joi.any().optional(),
}).unknown(true);

/**
 * Validates offer payloads. Derives `brandUserId` from campaign when possible;
 * infers `campaign_handoff` when both ids are present and origin is missing.
 * Throws if `brandUserId` cannot be resolved.
 */
export function validateOfferInput(
  data: Record<string, unknown>,
  options?: ValidateOfferOptions
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...data };
  const cid =
    merged.campaignId != null && merged.campaignId !== ''
      ? String(merged.campaignId)
      : '';
  const appId =
    merged.applicationId != null && merged.applicationId !== ''
      ? String(merged.applicationId)
      : '';
  const brand = merged.brandUserId != null ? String(merged.brandUserId).trim() : '';
  if (!brand && cid && options?.campaignById) {
    const c = options.campaignById(cid);
    const bid = c?.brandUserId != null ? String(c.brandUserId).trim() : '';
    if (bid) merged.brandUserId = bid;
  }
  if (!merged.offerOrigin || merged.offerOrigin === '') {
    if (cid && appId) {
      merged.offerOrigin = 'campaign_handoff';
    }
  }

  const { error, value } = offerSchema.validate(merged, {
    abortEarly: false,
    stripUnknown: false,
  });
  if (error) throw new Error(formatJoiError(error));

  const out = value as Record<string, unknown>;
  const origin = String(out.offerOrigin ?? '');
  if (origin === 'campaign_handoff') {
    const cId = out.campaignId != null && String(out.campaignId).trim() !== '' ? String(out.campaignId) : '';
    const aId = out.applicationId != null && String(out.applicationId).trim() !== '' ? String(out.applicationId) : '';
    if (!cId || !aId) {
      throw new Error('campaign_handoff requires campaignId and applicationId');
    }
  }

  const resolvedBrand = out.brandUserId != null ? String(out.brandUserId).trim() : '';
  if (!resolvedBrand) {
    throw new Error('brandUserId is required (could not derive from campaign)');
  }
  return out;
}
