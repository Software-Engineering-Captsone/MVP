import { validateCampaignPublish } from './publishValidation';

type CampaignSubmitIntent = 'draft' | 'publish';

type DeriveStatusOptions = {
  intent: CampaignSubmitIntent;
  now?: Date;
  validatePublishReady?: (input: Record<string, unknown>) => boolean;
};

function parseCampaignEndDate(input: Record<string, unknown>): Date | null {
  const direct = typeof input.endDate === 'string' ? input.endDate.trim() : '';
  const fromBrief =
    input.campaignBriefV2 &&
    typeof input.campaignBriefV2 === 'object' &&
    !Array.isArray(input.campaignBriefV2) &&
    (input.campaignBriefV2 as { strategy?: { flightEndDate?: unknown } }).strategy &&
    typeof (input.campaignBriefV2 as { strategy?: { flightEndDate?: unknown } }).strategy?.flightEndDate ===
      'string'
      ? String((input.campaignBriefV2 as { strategy?: { flightEndDate?: unknown } }).strategy?.flightEndDate).trim()
      : '';

  const raw = direct || fromBrief;
  if (!raw) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999Z` : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasCampaignEnded(input: Record<string, unknown>, now: Date): boolean {
  const end = parseCampaignEndDate(input);
  return !!end && now.getTime() > end.getTime();
}

export function deriveCampaignStatusFromSubmission(
  input: Record<string, unknown>,
  options: DeriveStatusOptions
): 'Draft' | 'Reviewing Candidates' | 'Active' | 'Completed' {
  const now = options.now ?? new Date();
  if (hasCampaignEnded(input, now)) return 'Completed';

  if (options.intent === 'publish') return 'Active';

  const isPublishReady = options.validatePublishReady
    ? options.validatePublishReady(input)
    : validateCampaignPublish(input, { enablePolicyWarnings: false }).blockingIssues.length === 0;

  return isPublishReady ? 'Reviewing Candidates' : 'Draft';
}
