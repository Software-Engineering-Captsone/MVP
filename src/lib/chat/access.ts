import type { StoredApplication, StoredCampaign } from '@/lib/campaigns/localCampaignStore';
import type { ChatSessionUser } from './types';

export function canAccessApplicationChat(
  session: ChatSessionUser,
  app: StoredApplication,
  campaign: StoredCampaign
): boolean {
  if (session.role === 'brand') {
    return String(campaign.brandUserId) === session.id;
  }
  return String(app.athleteUserId) === session.id;
}
