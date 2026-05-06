'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Eye,
  Facebook,
  FileText,
  Heart,
  Instagram,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Play,
  Send,
  Users,
  X,
} from 'lucide-react';
import useSWR from 'swr';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { getAthleteById, mockAthletes, type Athlete, type ContentItem } from '@/lib/mockData';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { useSavedMarketplace } from '@/hooks/useSavedMarketplace';
import { authFetch } from '@/lib/authFetch';
import { apiFetcher } from '@/hooks/api/fetcher';
import type { ApiCampaignRow } from '@/lib/campaigns/clientMap';
import dynamic from 'next/dynamic';

const OfferWizard = dynamic(
  () => import('@/components/offers/OfferWizard').then((m) => m.OfferWizard),
  { ssr: false, loading: () => null }
);
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  COPY_INVITE_TO_CAMPAIGN,
  COPY_MESSAGE_ATHLETE,
  COPY_REFERRAL,
  COPY_SEND_OFFER,
} from '@/lib/productCopy';

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

type ProfileTab = 'overview' | 'content';
type ContentFilter = 'all' | 'photos' | 'videos';

function ContentCard({ item, showPlay }: { item: ContentItem; showPlay: boolean }) {
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 shadow-sm">
      <ImageWithFallback src={item.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      {showPlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-nilink-ink shadow-md">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
      )}
      {item.overlayText && showPlay && (
        <p className="absolute bottom-14 left-2 right-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-white drop-shadow-md sm:text-xs">
          {item.overlayText}
        </p>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-medium text-white drop-shadow">
        <Eye className="h-3.5 w-3.5 opacity-90" strokeWidth={2.5} />
        {item.views}
      </div>
    </div>
  );
}

// Aligned with deriveCampaignStatusFromSubmission: 'Active' is the published, accepting-applicants
// state; 'Reviewing Candidates' is the draft-but-publish-ready state. Both are eligible for
// referral invites. (Legacy 'Open for Applications' kept for backwards-compatible API rows.)
const REFERRAL_ELIGIBLE_STATUSES = new Set([
  'Active',
  'Reviewing Candidates',
  'Open for Applications',
]);

function isCampaignEligibleForReferralInvite(c: ApiCampaignRow): boolean {
  return (
    c.visibility === 'Public' &&
    c.acceptApplications !== false &&
    REFERRAL_ELIGIBLE_STATUSES.has(String(c.status || ''))
  );
}

function MessageAthleteButton({
  compact,
  athleteUserId,
  athleteName,
}: {
  compact?: boolean;
  athleteUserId: string;
  athleteName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOutreach = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/chat/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteUserId, athleteName }),
      });
      const data = (await res.json()) as { error?: string; threadId?: string };
      if (!res.ok) {
        setError(data.error || 'Could not open messages');
        return;
      }
      if (data.threadId) {
        router.push(`/dashboard/messages?thread=${encodeURIComponent(data.threadId)}`);
        return;
      }
      setError('No conversation was returned');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const baseButton =
    compact
      ? 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm sm:px-4'
      : 'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="relative inline-flex max-w-full flex-col items-stretch">
      <button
        type="button"
        disabled={loading}
        aria-busy={loading}
        onClick={() => void startOutreach()}
        className={baseButton}
      >
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {!loading ? <MessageSquare className="h-4 w-4 shrink-0" aria-hidden /> : null}
        {loading ? 'Opening…' : COPY_MESSAGE_ATHLETE}
      </button>
      {error ? (
        <p
          role="alert"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-w-[min(100vw-2rem,280px)] rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-left text-xs font-medium text-red-700 sm:left-auto sm:right-0 sm:max-w-xs"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SendOfferButton({
  compact,
  athleteUserId,
  athleteName,
}: {
  compact?: boolean;
  athleteUserId: string;
  athleteName: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [campaignRows, setCampaignRows] = useState<ApiCampaignRow[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [wizardOfferId, setWizardOfferId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const eligibleCampaigns = campaignRows.filter(isCampaignEligibleForReferralInvite);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const res = await authFetch('/api/campaigns');
      const data = (await res.json()) as { campaigns?: ApiCampaignRow[]; error?: string };
      if (!res.ok) {
        setCampaignRows([]);
        setCampaignsError(data.error || 'Could not load your campaigns');
        return;
      }
      setCampaignRows(data.campaigns ?? []);
    } catch {
      setCampaignRows([]);
      setCampaignsError('Network error while loading campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setSuccessMessage(null);
    setCampaignsError(null);
    setDirectError(null);
    setReferralError(null);
    setChatError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSuccessMessage(null);
    setCampaignsError(null);
    setDirectError(null);
    setReferralError(null);
    setChatError(null);
    setInviteNote('');
    setSelectedCampaignId('');
    void loadCampaigns();
  }, [open, loadCampaigns]);

  useEffect(() => {
    if (!open) return;
    trackAnalyticsEvent('send_offer_modal_open', { athleteUserId, source: 'athlete_profile' });
  }, [open, athleteUserId]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeModal]);

  const createDirectDraft = async () => {
    setDirectLoading(true);
    setDirectError(null);
    setSuccessMessage(null);
    try {
      const res = await authFetch('/api/offers/direct-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteUserId,
          athleteName,
          contextNote: '',
        }),
      });
      const data = (await res.json()) as { error?: string; offer?: { id: string }; threadId?: string };
      if (!res.ok) {
        setDirectError(data.error || 'Could not create offer draft');
        return;
      }
      trackAnalyticsEvent('direct_draft_create', {
        athleteUserId,
        offerId: data.offer?.id,
      });
      setOpen(false);
      if (data.offer?.id) {
        setWizardOfferId(data.offer.id);
      } else {
        setSuccessMessage(`${COPY_SEND_OFFER}: draft created.`);
      }
    } catch {
      setDirectError('Network error');
    } finally {
      setDirectLoading(false);
    }
  };

  const createChatLinkedDraft = async () => {
    setChatLoading(true);
    setChatError(null);
    setSuccessMessage(null);
    try {
      const res = await authFetch('/api/offers/from-chat-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteUserId,
          athleteName,
          contextNote: '',
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        offer?: { id: string };
        threadId?: string;
      };
      if (!res.ok) {
        setChatError(data.error || 'Could not create chat-linked draft');
        return;
      }
      setOpen(false);
      if (data.threadId) {
        router.push(`/dashboard/messages?thread=${encodeURIComponent(data.threadId)}`);
      }
      if (data.offer?.id) setWizardOfferId(data.offer.id);
    } catch {
      setChatError('Network error');
    } finally {
      setChatLoading(false);
    }
  };

  const sendCampaignReferral = async () => {
    if (!selectedCampaignId) {
      setReferralError(`Select a campaign for ${COPY_INVITE_TO_CAMPAIGN} (${COPY_REFERRAL}).`);
      return;
    }
    setReferralLoading(true);
    setReferralError(null);
    setSuccessMessage(null);
    try {
      const res = await authFetch(`/api/campaigns/${selectedCampaignId}/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteUserId,
          inviteNote: inviteNote.trim(),
          origin: 'profile',
        }),
      });
      const data = (await res.json()) as { error?: string; created?: boolean };
      if (!res.ok) {
        setReferralError(data.error || `Could not add ${COPY_REFERRAL} to campaign`);
        return;
      }
      trackAnalyticsEvent('referral_invite_create', {
        athleteUserId,
        campaignId: selectedCampaignId,
        created: data.created === true,
      });
      setSuccessMessage(
        data.created
          ? `${COPY_REFERRAL} invite added to that campaign’s application queue.`
          : 'This athlete already has an application on that campaign; nothing changed.'
      );
    } catch {
      setReferralError('Network error');
    } finally {
      setReferralLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={
          compact
            ? 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-nilink-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-nilink-accent-hover sm:text-sm sm:px-4'
            : 'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-nilink-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-nilink-accent-hover'
        }
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen(true)}
      >
        <Send className={`h-4 w-4 transition-transform ${hover ? 'translate-x-0.5' : ''}`} />
        {COPY_SEND_OFFER}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 md:p-6"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-offer-title"
            aria-describedby="send-offer-desc"
            className="max-h-[min(92dvh,720px)] w-full max-w-md cursor-auto overflow-y-auto rounded-t-2xl border border-gray-100 bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 id="send-offer-title" className="text-lg font-bold text-gray-900">
                  {COPY_SEND_OFFER}
                </h2>
                <p id="send-offer-desc" className="mt-1 text-sm text-gray-500">
                  Choose how you want to engage {athleteName}. Actions use your brand account.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-lg p-2 text-gray-400 outline-none ring-nilink-accent transition hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5">
              {successMessage && (
                <p
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                  role="status"
                >
                  {successMessage}
                </p>
              )}

              <div
                className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                aria-busy={directLoading}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-nilink-accent shadow-sm">
                    <FileText className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{COPY_SEND_OFFER} — direct draft</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Start a campaign-free offer draft for this athlete (POST{' '}
                      <code className="break-all text-[11px] sm:break-normal">/api/offers/direct-drafts</code>).
                    </p>
                    {directError ? (
                      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {directError}
                      </p>
                    ) : null}
                    {!directLoading && !directError ? (
                      <p className="mt-2 text-xs text-gray-400">
                        Idle — creates a private draft, then opens {COPY_SEND_OFFER}.
                      </p>
                    ) : null}
                    {directLoading ? (
                      <p className="sr-only" role="status" aria-live="polite">
                        Creating direct draft
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={directLoading}
                      onClick={() => void createDirectDraft()}
                      className="mt-3 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white outline-none ring-offset-2 transition hover:bg-nilink-accent-hover focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {directLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      {directLoading ? 'Creating…' : 'Create draft'}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                aria-busy={referralLoading || campaignsLoading}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-nilink-accent shadow-sm">
                    <Megaphone className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{COPY_INVITE_TO_CAMPAIGN}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Adds a {COPY_REFERRAL} application on the campaign you pick (POST{' '}
                      <code className="text-[11px]">/api/campaigns/[id]/referrals</code>). Only public campaigns that are
                      accepting applications are listed.
                    </p>
                    {campaignsLoading ? (
                      <p
                        className="mt-3 flex items-center gap-2 text-sm text-gray-500"
                        role="status"
                        aria-live="polite"
                      >
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        Loading campaigns…
                      </p>
                    ) : campaignsError ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <p role="alert">{campaignsError}</p>
                        <button
                          type="button"
                          onClick={() => void loadCampaigns()}
                          className="text-sm font-semibold text-red-900 underline underline-offset-2 hover:no-underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : eligibleCampaigns.length === 0 ? (
                      <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                        <p className="font-medium text-gray-800">No campaigns for {COPY_INVITE_TO_CAMPAIGN}</p>
                        <p className="mt-1 text-gray-500">
                          No eligible campaigns right now. Publish a public campaign that accepts applications, or use{' '}
                          {COPY_SEND_OFFER} — direct draft instead.
                        </p>
                      </div>
                    ) : (
                      <>
                        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="send-offer-campaign">
                          Campaign
                        </label>
                        <select
                          id="send-offer-campaign"
                          className="mt-1 w-full min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent"
                          value={selectedCampaignId}
                          onChange={(e) => setSelectedCampaignId(e.target.value)}
                        >
                          <option value="">Select a campaign…</option>
                          {eligibleCampaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="send-offer-invite-note">
                          {COPY_INVITE_TO_CAMPAIGN} note (optional)
                        </label>
                        <textarea
                          id="send-offer-invite-note"
                          value={inviteNote}
                          onChange={(e) => setInviteNote(e.target.value)}
                          rows={2}
                          placeholder="Short context for your team (optional)"
                          className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent"
                        />
                        {referralError ? (
                          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                            {referralError}
                          </p>
                        ) : null}
                        {referralLoading ? (
                          <p className="sr-only" role="status" aria-live="polite">
                            Sending {COPY_REFERRAL} invite
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={referralLoading || !selectedCampaignId}
                          onClick={() => void sendCampaignReferral()}
                          className="mt-3 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-nilink-accent px-4 py-2 text-sm font-semibold text-white outline-none ring-offset-2 transition hover:bg-nilink-accent-hover focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {referralLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                          {referralLoading ? 'Sending…' : `${COPY_INVITE_TO_CAMPAIGN} (${COPY_REFERRAL})`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-nilink-accent">
                    <MessageSquare className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">Chat-negotiated offer</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Opens (or creates) a brand outreach thread with this athlete, starts a{' '}
                      <code className="text-[11px]">chat_negotiated</code> offer draft, sends you to Messages for that
                      thread, and opens the offer wizard when a draft is returned.
                    </p>
                    {chatError ? (
                      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {chatError}
                      </p>
                    ) : null}
                    {chatLoading ? (
                      <p className="sr-only" role="status" aria-live="polite">
                        Creating chat-linked draft
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={chatLoading}
                      onClick={() => void createChatLinkedDraft()}
                      className="mt-3 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-nilink-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      {chatLoading ? 'Creating…' : 'Create chat-linked draft'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {wizardOfferId && (
        <OfferWizard offerId={wizardOfferId} onClose={() => setWizardOfferId(null)} />
      )}
    </>
  );
}

function SaveAthleteControl({
  athleteId,
  compact,
}: {
  athleteId: string;
  compact?: boolean;
}) {
  const { toggleAthlete, isAthleteSaved } = useSavedMarketplace();
  const saved = isAthleteSaved(athleteId);
  return (
    <button
      type="button"
      onClick={() => toggleAthlete(athleteId)}
      aria-label={saved ? 'Remove athlete from saved' : 'Save athlete'}
      title={saved ? 'Remove from saved' : 'Save athlete'}
      className={
        compact
          ? `inline-flex shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition sm:text-sm sm:px-4 ${
              saved
                ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`
          : `inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm transition ${
              saved
                ? 'border-nilink-accent bg-nilink-accent-soft text-nilink-accent'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`
      }
    >
      <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
      {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}

export function AthleteProfile() {
  const searchParams = useSearchParams();
  const { accountType } = useDashboard();
  const showSaveForBrand = accountType === 'business';
  const idParam = searchParams.get('id');

  // Fetch live profile when an id is present and looks like a UUID (mock ids
  // like "1" stay on the client-side mock data). On 404/network errors we
  // gracefully fall back to mock data — useful during dev when not every
  // athlete has been seeded into Supabase yet.
  const isUuid = !!idParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam);
  const swrKey = isUuid ? `/api/dashboard/athlete/profile/${idParam}` : null;
  const { data: liveData, error: liveError, isLoading: liveLoading } = useSWR<{ athlete: Athlete }>(
    swrKey,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  const athlete = useMemo<Athlete>(() => {
    if (liveData?.athlete) return liveData.athlete;
    if (idParam) {
      const found = getAthleteById(idParam);
      if (found) return found;
    }
    return mockAthletes[0];
  }, [idParam, liveData]);

  const showLoadingOverlay = isUuid && liveLoading && !liveData;
  const showLiveError = isUuid && !!liveError && !liveData;

  const [tab, setTab] = useState<ProfileTab>('overview');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);

  const updateCollapsed = useCallback(() => {
    const main = document.querySelector('main');
    const hero = heroRef.current;
    if (!main || !hero) return;
    const mainRect = main.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const threshold = mainRect.top + 4;
    setHeaderCollapsed(heroRect.bottom < threshold);
  }, []);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    updateCollapsed();
    main.addEventListener('scroll', updateCollapsed, { passive: true });
    window.addEventListener('resize', updateCollapsed, { passive: true });
    return () => {
      main.removeEventListener('scroll', updateCollapsed);
      window.removeEventListener('resize', updateCollapsed);
    };
  }, [updateCollapsed, athlete.id]);

  const images = athlete.contentItems.filter((c) => c.type === 'image');
  const videos = athlete.contentItems.filter((c) => c.type === 'video');
  const previewItems = athlete.contentItems.slice(0, 5);

  const filteredContent = useMemo(() => {
    if (contentFilter === 'photos') return images;
    if (contentFilter === 'videos') return videos;
    return athlete.contentItems;
  }, [athlete.contentItems, contentFilter, images, videos]);

  const filterChips: { id: ContentFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
  ];

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'content', label: 'Content' },
  ];

  return (
    <div className="min-h-full bg-nilink-page pb-16">
      <div className="pt-4 sm:pt-6 dash-main-gutter-x">
        <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <Link
            href="/dashboard/search"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-nilink-ink"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back
          </Link>
        </div>

        {showLoadingOverlay ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-xs font-medium text-gray-500 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Loading profile…
          </div>
        ) : null}
        {showLiveError ? (
          <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            Showing cached profile — couldn&rsquo;t reach the latest data.
          </div>
        ) : null}

        {/* Full hero */}
        <div ref={heroRef} className="mb-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="relative h-40 sm:h-48">
            <ImageWithFallback src={athlete.bannerImage} alt="" className="h-full w-full object-cover" />
          </div>

          <div className="relative px-5 pb-6 pt-0 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative -mt-16 shrink-0 sm:-mt-20">
                  <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-md sm:h-32 sm:w-32">
                    <ImageWithFallback src={athlete.image} alt={athlete.name} className="h-full w-full object-cover" />
                  </div>
                  <div
                    className="absolute -right-0.5 -top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-emerald-500 text-xs font-bold text-white shadow-sm"
                    title="Brand fit score"
                  >
                    {athlete.nilScore}
                  </div>
                </div>

                <div className="min-w-0 flex-1 pb-0 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{athlete.name}</h1>
                    {athlete.verified ? <VerifiedBadge className="h-6 w-6 text-nilink-accent" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {athlete.sport} | {athlete.school}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Instagram className="h-4 w-4 text-pink-600" />
                      {athlete.stats.instagram}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <TiktokIcon className="h-4 w-4 text-nilink-ink" />
                      {athlete.stats.tiktok}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      {athlete.stats.facebook}
                    </span>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {athlete.hometown}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {athlete.position} · {athlete.jerseyNumber}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                {showSaveForBrand ? <SaveAthleteControl athleteId={athlete.id} /> : null}
                {showSaveForBrand ? (
                  <MessageAthleteButton athleteUserId={athlete.id} athleteName={athlete.name} />
                ) : null}
                {showSaveForBrand ? (
                  <SendOfferButton athleteUserId={athlete.id} athleteName={athlete.name} />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Condensed sticky bar — same width & radius as hero; smooth height/opacity */}
        <div
          className={`sticky top-0 z-30 w-full overflow-hidden rounded-2xl border bg-white/95 backdrop-blur-md transition-[height,opacity,margin,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
            headerCollapsed
              ? 'mt-3 h-[72px] border-gray-100 opacity-100 shadow-sm'
              : 'pointer-events-none mt-0 h-0 border-transparent opacity-0 shadow-none'
          }`}
          aria-hidden={!headerCollapsed}
        >
          <div className="flex h-[72px] items-center justify-between gap-3 px-5 sm:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-100 shadow-sm sm:h-11 sm:w-11">
                <ImageWithFallback src={athlete.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-gray-900 sm:text-base">{athlete.name}</span>
                  {athlete.verified ? <VerifiedBadge className="h-4 w-4 shrink-0 text-nilink-accent" /> : null}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {athlete.sport} · {athlete.stats.instagram} IG
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {showSaveForBrand ? <SaveAthleteControl athleteId={athlete.id} compact /> : null}
              {showSaveForBrand ? (
                <MessageAthleteButton athleteUserId={athlete.id} athleteName={athlete.name} compact />
              ) : null}
              {showSaveForBrand ? (
                <SendOfferButton athleteUserId={athlete.id} athleteName={athlete.name} compact />
              ) : null}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 mt-8 border-b border-gray-200">
          <div className="flex justify-center gap-0 sm:gap-4">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative flex-1 px-3 py-3 text-center text-sm font-semibold sm:flex-none sm:min-w-[120px] ${
                    active ? 'text-nilink-ink' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                  {active ? (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-nilink-accent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">About</h2>
              <p className="mt-3 leading-relaxed text-gray-600">{athlete.bio}</p>
              <dl className="mt-6 grid gap-3 border-t border-gray-100 pt-6 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-400">Academic year</dt>
                  <dd className="font-medium text-gray-900">{athlete.academicYear}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Major</dt>
                  <dd className="font-medium text-gray-900">{athlete.major}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Height / weight</dt>
                  <dd className="font-medium text-gray-900">{athlete.heightWeight}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Compatibility</dt>
                  <dd className="font-medium text-nilink-accent">{athlete.compatibilityScore}% match</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Reach snapshot</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total followers', value: athlete.aggregate.totalFollowers, icon: Users },
                  { label: 'Engagement', value: athlete.aggregate.engagementRate, icon: Heart },
                  { label: 'Total views', value: athlete.aggregate.totalViews, icon: Eye },
                  { label: 'Posts / mo', value: String(athlete.aggregate.monthlyPosts), icon: BarChart3 },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-gray-100 bg-white px-4 py-4 shadow-sm"
                  >
                    <s.icon className="mb-2 h-4 w-4 text-nilink-accent" />
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Content</h2>
                <button
                  type="button"
                  onClick={() => setTab('content')}
                  className="text-sm font-semibold text-nilink-accent hover:underline"
                >
                  See all
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {previewItems.map((item) => (
                  <div key={item.id} className="w-[38%] shrink-0 sm:w-[30%]">
                    <ContentCard item={item} showPlay={item.type === 'video'} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">Achievements</h2>
              <ul className="mt-4 space-y-3">
                {athlete.achievements.map((line) => (
                  <li key={line} className="flex gap-3 text-gray-700">
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-nilink-accent" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Platform performance</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {(
                  [
                    { key: 'instagram', label: 'Instagram', Icon: Instagram, m: athlete.platformMetrics.instagram },
                    { key: 'tiktok', label: 'TikTok', Icon: TiktokIcon, m: athlete.platformMetrics.tiktok },
                    { key: 'facebook', label: 'Facebook', Icon: Facebook, m: athlete.platformMetrics.facebook },
                  ] as const
                ).map(({ key, label, Icon, m }) => (
                  <div key={key} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-nilink-ink" />
                      <span className="font-bold text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{m.handle}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Followers</p>
                        <p className="text-lg font-bold text-gray-900">{m.followers}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Posts/mo</p>
                        <p className="text-lg font-bold text-gray-900">{m.postsPerMonth}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Eng.</p>
                        <p className="text-lg font-bold text-nilink-accent">{m.engagementRate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Deal availability</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {athlete.openToDeals
                      ? 'This athlete is accepting new sponsorship conversations.'
                      : 'Not accepting new deals at the moment.'}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold ${
                    athlete.openToDeals ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {athlete.openToDeals ? 'Open to deals' : 'Unavailable'}
                </span>
              </div>
            </section>
          </div>
        )}

        {tab === 'content' && (
          <div>
            <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-semibold text-gray-700">
                Content{' '}
                <span className="font-normal text-gray-400">
                  ({filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'})
                </span>
              </p>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5 sm:absolute sm:right-0 sm:top-0">
                {filterChips.map((chip) => {
                  const on = contentFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setContentFilter(chip.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-[13px] ${
                        on
                          ? 'border-nilink-accent bg-nilink-accent text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {filteredContent.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-12 text-center text-sm text-gray-500">
                No {contentFilter === 'photos' ? 'photos' : contentFilter === 'videos' ? 'videos' : 'content'} to show.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredContent.map((item) => (
                  <ContentCard key={item.id} item={item} showPlay={item.type === 'video'} />
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
