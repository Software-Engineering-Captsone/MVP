import useSWR from 'swr';
import { type ApiCampaignRow } from '@/lib/campaigns/clientMap';
import { apiFetcher } from './fetcher';

export interface CampaignsListResponse {
  campaigns: ApiCampaignRow[];
  nextCursor?: string | null;
}

export function useCampaignsList(searchParams?: URLSearchParams) {
  const key = searchParams?.toString()
    ? `/api/campaigns?${searchParams.toString()}`
    : '/api/campaigns';

  const { data, error, isLoading, mutate } = useSWR<CampaignsListResponse>(
    key,
    apiFetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );
  return {
    campaigns: data?.campaigns ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error: error as Error | null,
    mutate,
  };
}
