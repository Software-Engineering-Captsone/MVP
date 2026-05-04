import useSWR from 'swr';
import { apiFetcher } from './fetcher';

export type AthleteOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type ApiOfferRow = {
  id: string;
  offerOrigin: 'campaign_handoff' | 'direct_profile' | 'chat_negotiated';
  campaignId: string | null;
  applicationId: string | null;
  athleteUserId: string;
  brandUserId: string;
  status: string;
  dealId?: string;
  notes?: string;
  structuredDraft?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  declineNote?: string;
  athleteOfferStatus: AthleteOfferStatus;
  brandName: string;
  campaignName: string | null;
  shortDescription: string;
  compensationSummary: string;
  deadline: string | null;
};

export interface OffersListResponse {
  offers: ApiOfferRow[];
}

export function useOffersList(options?: { enabled?: boolean; refreshInterval?: number }) {
  const key = options?.enabled === false ? null : '/api/offers';
  const { data, error, isLoading, mutate } = useSWR<OffersListResponse>(
    key,
    apiFetcher,
    { revalidateOnFocus: false, refreshInterval: options?.refreshInterval ?? 0 }
  );
  return {
    offers: data?.offers ?? [],
    isLoading,
    error: error as Error | null,
    mutate,
  };
}
