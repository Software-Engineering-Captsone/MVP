/**
 * Minimal product analytics hook. Dispatches a window CustomEvent and optional dataLayer push
 * so a future GTM/analytics script can subscribe without coupling UI to a vendor SDK.
 */
export const ANALYTICS_EVENT_NAME = 'nilink:analytics' as const;

export type AnalyticsEventName =
  | 'send_offer_modal_open'
  | 'direct_draft_create'
  | 'referral_invite_create'
  | 'offer_submit'
  | 'offer_send';

export type AnalyticsEventDetail = {
  name: AnalyticsEventName;
  payload?: Record<string, unknown>;
  ts: number;
};

export function trackAnalyticsEvent(name: AnalyticsEventName, payload?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const detail: AnalyticsEventDetail = { name, payload, ts: Date.now() };
  window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT_NAME, { detail }));
  const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dl)) {
    dl.push({ event: name, ...payload });
  }
}
