'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export type DealsRealtimeOptions = {
  /** When false, no subscription is created. */
  enabled: boolean;
  /** If set, also listen to child tables for this deal (detail + list refresh). */
  dealId?: string | null;
  /** Debounced callback (e.g. refetch list + detail). */
  onInvalidate: () => void;
};

/**
 * Subscribes to Supabase Realtime `postgres_changes` for deal-related tables.
 * RLS on the underlying tables limits which events the user receives.
 */
export function useDealsRealtimeRefresh({ enabled, dealId, onInvalidate }: DealsRealtimeOptions): void {
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase.channel(`deals-realtime-${dealId ?? 'list'}-${Date.now()}`);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onInvalidateRef.current();
      }, 400);
    };

    const base = { schema: 'public' as const, event: '*' as const };

    channel.on('postgres_changes', { ...base, table: 'deals' }, debounced);

    if (dealId) {
      channel.on(
        'postgres_changes',
        { ...base, table: 'deal_contracts', filter: `deal_id=eq.${dealId}` },
        debounced,
      );
      channel.on(
        'postgres_changes',
        { ...base, table: 'deal_payments', filter: `deal_id=eq.${dealId}` },
        debounced,
      );
      channel.on(
        'postgres_changes',
        { ...base, table: 'deal_deliverables', filter: `deal_id=eq.${dealId}` },
        debounced,
      );
      channel.on(
        'postgres_changes',
        { ...base, table: 'deliverable_submissions', filter: `deal_id=eq.${dealId}` },
        debounced,
      );
      channel.on(
        'postgres_changes',
        { ...base, table: 'deal_activities', filter: `deal_id=eq.${dealId}` },
        debounced,
      );
    }

    void channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, dealId]);
}
