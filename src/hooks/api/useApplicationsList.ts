import useSWR from 'swr';
import { apiFetcher } from './fetcher';

export type ApplicationWithCampaign = {
  application: {
    id: string;
    campaignId: string;
    status: string;
    pitch?: string;
    withdrawnByAthlete?: boolean;
    createdAt?: string;
    updatedAt?: string;
    statusHistory?: { status: string; at: string }[];
    hasPreviousPitch?: boolean;
  };
  campaign: {
    id: string;
    name: string;
    image?: string;
    brandDisplayName?: string;
    applicationDeadlinePassed?: boolean;
  } | null;
  applicationMessaging?: {
    canViewThread: boolean;
    canSend: boolean;
  } | null;
  /** Linked offer/deal for post-application navigation (Offer Sent and beyond). */
  handoff?: {
    offerId: string;
    dealId: string | null;
    dealStatus: string | null;
    offerStatus: string | null;
  } | null;
};

export interface ApplicationsListResponse {
  applications: ApplicationWithCampaign[];
}

export function useApplicationsList() {
  const { data, error, isLoading, mutate } = useSWR<ApplicationsListResponse>(
    '/api/applications',
    apiFetcher,
    { revalidateOnFocus: true, refreshInterval: 0 }
  );
  return {
    applications: data?.applications ?? [],
    isLoading,
    error: error as Error | null,
    mutate,
  };
}
