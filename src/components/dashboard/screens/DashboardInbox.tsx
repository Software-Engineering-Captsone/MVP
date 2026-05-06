'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Send,
  User,
  Trash2,
  Plus,
  ChevronLeft,
  CheckCheck,
  CheckCircle2,
  Paperclip,
  BriefcaseBusiness,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { authFetch } from '@/lib/authFetch';
import { createClient } from '@/lib/supabase/client';
import type { ChatInboxItem, ChatMessageRow } from '@/lib/chat/types';

const PLACEHOLDER_AVATAR =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const FootballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-45 12 12)" />
    <path d="M8 8l8 8" />
    <path d="M11 9l2 2" />
    <path d="M9 11l2 2" />
    <path d="M13 11l2 2" />
  </svg>
);

const BaseballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2A10 10 0 0 1 12 22" />
    <path d="M12 2A10 10 0 0 0 12 22" />
    <path d="M8 5a8 8 0 0 0 0 14" />
    <path d="M16 5a8 8 0 0 1 0 14" />
  </svg>
);

const sports = ['Football', 'Baseball', 'Softball', 'Cheerleading', 'Dance', 'Basketball', 'Beach Volleyball'];
const APPLICATION_APPROVED_MARKER = '[nilink-notice:application_approved]';

export type InboxVariant = 'business' | 'athlete';

export type DashboardInboxProps = {
  variant: InboxVariant;
  initialThreadId?: string | null;
  initialApplicationId?: string | null;
};

type InboxErrorCode = 'CHAT_SCHEMA_NOT_READY' | 'CHAT_SERVICE_UNAVAILABLE' | null;
type AthleteOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getRenderableMessageBody(msg: ChatMessageRow): {
  text: string;
  isApplicationApprovedNotice: boolean;
} {
  const raw = String(msg.body ?? '');
  if (raw.startsWith(APPLICATION_APPROVED_MARKER)) {
    const stripped = raw.replace(APPLICATION_APPROVED_MARKER, '').trim();
    return {
      text: stripped || 'Application approved — you can coordinate here.',
      isApplicationApprovedNotice: true,
    };
  }
  return { text: raw, isApplicationApprovedNotice: false };
}

function getRenderableMessagePreview(body: string): string {
  if (body.startsWith(APPLICATION_APPROVED_MARKER)) {
    const stripped = body.replace(APPLICATION_APPROVED_MARKER, '').trim();
    return stripped || 'Application approved — you can coordinate here.';
  }
  return body;
}

function chatMessageFromRealtimeRow(row: Record<string, unknown>): {
  threadId: string;
  message: ChatMessageRow;
} | null {
  const threadId = typeof row.thread_id === 'string' ? row.thread_id : '';
  const id = typeof row.id === 'string' ? row.id : '';
  const fromUserId = typeof row.from_user_id === 'string' ? row.from_user_id : '';
  if (!threadId || !id || !fromUserId) return null;
  return {
    threadId,
    message: {
      id,
      fromUserId,
      body: typeof row.body === 'string' ? row.body : '',
      createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
      messageKind:
        row.message_kind === 'system' || row.message_kind === 'offer' || row.message_kind === 'user'
          ? row.message_kind
          : 'user',
      offerId: typeof row.offer_id === 'string' ? row.offer_id : null,
    },
  };
}

function sortInboxItems(items: ChatInboxItem[]): ChatInboxItem[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
}

export function DashboardInbox({
  variant,
  initialThreadId = null,
  initialApplicationId = null,
}: DashboardInboxProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showUnread, setShowUnread] = useState(false);
  const [draft, setDraft] = useState('');
  const { user: dashboardUser } = useDashboard();
  const currentUserId = dashboardUser?.id ?? null;
  const [items, setItems] = useState<ChatInboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxErrorCode, setInboxErrorCode] = useState<InboxErrorCode>(null);
  const [inboxErrorHint, setInboxErrorHint] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [attachmentHint, setAttachmentHint] = useState<string | null>(null);
  const [sendDealLoading, setSendDealLoading] = useState(false);
  const [offerStatusById, setOfferStatusById] = useState<Record<string, AthleteOfferStatus>>({});
  const [offerActionLoadingById, setOfferActionLoadingById] = useState<Record<string, 'accept' | 'decline' | 'send' | null>>({});
  const orphanAttemptedRef = useRef<string | null>(null);
  const initialThreadAppliedRef = useRef(false);
  const selectedThreadIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const debouncedSearchRef = useRef('');
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const fetchInbox = useCallback(async (q: string) => {
    setInboxLoading(true);
    setInboxError(null);
    setInboxErrorCode(null);
    setInboxErrorHint(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const qs = params.toString();
      const res = await authFetch(qs ? `/api/chat/inbox?${qs}` : '/api/chat/inbox');
      const data = (await res.json()) as {
        items?: ChatInboxItem[];
        error?: string;
        errorCode?: InboxErrorCode;
        hint?: string;
      };
      if (!res.ok) {
        if (data.errorCode === 'CHAT_SCHEMA_NOT_READY') {
          setInboxError('Messaging setup is still in progress.');
          setInboxErrorHint('Chat will appear once the database migration is applied.');
          setInboxErrorCode(data.errorCode);
        } else if (data.errorCode === 'CHAT_SERVICE_UNAVAILABLE') {
          setInboxError('Messaging is temporarily unavailable.');
          setInboxErrorHint('Please retry in a moment.');
          setInboxErrorCode(data.errorCode);
        } else {
          setInboxError(data.error || 'Could not load inbox');
          setInboxErrorHint(data.hint || null);
          setInboxErrorCode(data.errorCode ?? null);
        }
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setInboxError('Network error');
      setInboxErrorCode(null);
      setInboxErrorHint('Please check your connection and retry.');
      setItems([]);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  const markThreadReadLocally = useCallback((threadId: string) => {
    setItems((prev) => prev.map((i) => (i.threadId === threadId ? { ...i, unreadCount: 0 } : i)));
    void authFetch(`/api/chat/threads/${threadId}/read`, { method: 'POST' });
  }, []);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scroll = () => {
      const node = messagesScrollRef.current;
      if (!node) return;
      node.scrollTo({ top: node.scrollHeight, behavior });
    };
    window.requestAnimationFrame(() => {
      scroll();
      window.requestAnimationFrame(scroll);
    });
  }, []);


  useEffect(() => {
    if (!currentUserId) return;
    void fetchInbox(debouncedSearch);
  }, [debouncedSearch, currentUserId, fetchInbox]);

  useEffect(() => {
    orphanAttemptedRef.current = null;
    initialThreadAppliedRef.current = false;
  }, [initialApplicationId, initialThreadId]);

  useEffect(() => {
    if (!initialThreadId || initialThreadAppliedRef.current) return;
    initialThreadAppliedRef.current = true;
    setSelectedThreadId(initialThreadId);
  }, [initialThreadId]);

  useEffect(() => {
    if (!initialApplicationId || inboxLoading) return;
    const match = items.find((i) => i.applicationId === initialApplicationId);
    if (match) {
      setSelectedThreadId(match.threadId);
      return;
    }
    if (orphanAttemptedRef.current === initialApplicationId) return;
    orphanAttemptedRef.current = initialApplicationId;
    void (async () => {
      const res = await authFetch(`/api/applications/${initialApplicationId}/messages`);
      if (res.ok) {
        await fetchInbox(debouncedSearch);
      } else if (res.status === 403 || res.status === 503) {
        orphanAttemptedRef.current = initialApplicationId;
      } else {
        orphanAttemptedRef.current = null;
      }
    })();
  }, [initialApplicationId, items, inboxLoading, debouncedSearch, fetchInbox]);

  const industryOptions = useMemo(() => {
    const names = [...new Set(items.map((i) => i.counterpart.displayName))];
    names.sort((a, b) => a.localeCompare(b));
    return names.slice(0, 12);
  }, [items]);

  const filterOptions = variant === 'business' ? sports : industryOptions;

  const displayedItems = useMemo(() => {
    let list = showUnread ? items.filter((i) => i.unreadCount > 0) : [...items];
    if (activeFilter) {
      const k = activeFilter.toLowerCase();
      list = list.filter((i) => {
        if (variant === 'business') {
          return (i.counterpart.sport ?? '').toLowerCase() === k;
        }
        return (
          i.counterpart.displayName.toLowerCase().includes(k) ||
          (i.lastMessage?.body ?? '').toLowerCase().includes(k)
        );
      });
    }
    return list;
  }, [items, showUnread, activeFilter, variant]);

  const listCount = displayedItems.length;

  const activeItem = selectedThreadId ? items.find((i) => i.threadId === selectedThreadId) : undefined;

  const counterpartName = activeItem?.counterpart.displayName ?? 'Conversation';
  const counterpartImage = activeItem?.counterpart.avatarUrl || PLACEHOLDER_AVATAR;

  const loadAthleteOfferStatuses = useCallback(async () => {
    if (variant !== 'athlete') return;
    try {
      const res = await authFetch('/api/offers');
      if (!res.ok) return;
      const data = (await res.json()) as {
        offers?: Array<{ id: string; athleteOfferStatus: AthleteOfferStatus }>;
      };
      const map: Record<string, AthleteOfferStatus> = {};
      for (const row of data.offers ?? []) {
        map[row.id] = row.athleteOfferStatus;
      }
      setOfferStatusById(map);
    } catch {
      // Keep chat usable even if offer status endpoint is unavailable.
    }
  }, [variant]);

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();
    const channel = supabase.channel(`chat-realtime-${currentUserId}-${Date.now()}`);
    let inboxRefreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshInboxSoon = () => {
      if (inboxRefreshTimer) clearTimeout(inboxRefreshTimer);
      inboxRefreshTimer = setTimeout(() => {
        void fetchInbox(debouncedSearchRef.current);
      }, 350);
    };

    channel.on(
      'postgres_changes',
      { schema: 'public', table: 'chat_messages', event: 'INSERT' },
      (payload) => {
        const parsed = chatMessageFromRealtimeRow(payload.new as Record<string, unknown>);
        if (!parsed) return;

        const { threadId, message } = parsed;
        const activeThreadId = selectedThreadIdRef.current;
        const signedInUserId = currentUserIdRef.current;
        const isSelectedThread = threadId === activeThreadId;
        const isOwnMessage = message.fromUserId === signedInUserId;

        setItems((prev) => {
          let found = false;
          const next = prev.map((item) => {
            if (item.threadId !== threadId) return item;
            found = true;
            return {
              ...item,
              lastMessage: {
                body: message.body,
                createdAt: message.createdAt,
                fromUserId: message.fromUserId,
              },
              unreadCount: isOwnMessage || isSelectedThread ? 0 : item.unreadCount + 1,
              updatedAt: message.createdAt,
            };
          });
          if (!found) refreshInboxSoon();
          return sortInboxItems(next);
        });

        if (isSelectedThread) {
          setMessages((prev) => {
            if (prev.some((existing) => existing.id === message.id)) return prev;
            const optimisticIndex = prev.findIndex(
              (existing) =>
                existing.id.startsWith('tmp-') &&
                existing.fromUserId === message.fromUserId &&
                existing.body === message.body
            );
            if (optimisticIndex >= 0) {
              const next = [...prev];
              next[optimisticIndex] = message;
              return next;
            }
            return [...prev, message];
          });
          markThreadReadLocally(threadId);
          if (variant === 'athlete' && message.messageKind === 'offer') {
            void loadAthleteOfferStatuses();
          }
        }
      }
    );

    channel.on(
      'postgres_changes',
      { schema: 'public', table: 'chat_threads', event: '*' },
      refreshInboxSoon
    );

    void channel.subscribe();

    return () => {
      if (inboxRefreshTimer) clearTimeout(inboxRefreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchInbox, loadAthleteOfferStatuses, markThreadReadLocally, variant]);

  const loadThreadMessages = useCallback(
    async (threadId: string): Promise<void> => {
      const res = await authFetch(`/api/chat/threads/${threadId}/messages`);
      const data = (await res.json()) as { messages?: ChatMessageRow[]; error?: string };
      if (res.ok && data.messages) setMessages(data.messages);
      const readRes = await authFetch(`/api/chat/threads/${threadId}/read`, { method: 'POST' });
      if (readRes.ok) {
        setItems((prev) => prev.map((i) => (i.threadId === threadId ? { ...i, unreadCount: 0 } : i)));
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      setComposerMenuOpen(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setMessagesLoading(true);
      try {
        await loadThreadMessages(selectedThreadId);
        if (variant === 'athlete') await loadAthleteOfferStatuses();
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, loadThreadMessages, loadAthleteOfferStatuses, variant]);

  useEffect(() => {
    if (!selectedThreadId || messagesLoading) return;
    scrollMessagesToBottom('auto');
  }, [messages.length, messagesLoading, selectedThreadId, scrollMessagesToBottom]);

  const subtitle =
    variant === 'business'
      ? 'Conversations with athletes'
      : 'Messages from brands and sponsors';
  const searchPlaceholder = variant === 'business' ? 'Search athletes…' : 'Search brands or industries…';
  const filterAria = variant === 'business' ? 'Filter by sport' : 'Filter by brand';
  const listTitle = variant === 'business' ? 'Athletes' : 'Brands';

  const sendDraft = async () => {
    setComposerMenuOpen(false);
    const text = draft.trim();
    if (!text || !selectedThreadId || !currentUserId) return;
    setDraft('');
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: tempId,
      fromUserId: currentUserId,
      body: text,
      createdAt: new Date().toISOString(),
      messageKind: 'user',
    };
    setMessages((m) => [...m, optimistic]);
    setItems((prev) =>
      prev.map((i) =>
        i.threadId === selectedThreadId
          ? {
              ...i,
              lastMessage: {
                body: text,
                createdAt: optimistic.createdAt,
                fromUserId: currentUserId,
              },
              unreadCount: 0,
              updatedAt: optimistic.createdAt,
            }
          : i
      )
    );

    const res = await authFetch(`/api/chat/threads/${selectedThreadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });

    if (!res.ok) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setDraft(text);
      return;
    }

    const data = (await res.json()) as { message?: ChatMessageRow };
    if (data.message) {
      setMessages((m) => m.map((x) => (x.id === tempId ? data.message! : x)));
    }
    void fetchInbox(debouncedSearch);
  };

  const showAttachmentPendingHint = (forBusiness: boolean) => {
    setAttachmentHint(
      forBusiness
        ? 'Attachment uploads are coming soon for business chats.'
        : 'Attachment uploads are coming soon for athlete chats.'
    );
    window.setTimeout(() => setAttachmentHint(null), 2600);
  };

  const handleAttachmentAction = () => {
    setComposerMenuOpen(false);
    showAttachmentPendingHint(variant === 'business');
  };

  const handleSendDealFromComposer = async () => {
    if (variant !== 'business' || !selectedThreadId || !activeItem?.counterpart.userId) return;
    setComposerMenuOpen(false);
    setSendDealLoading(true);
    try {
      const createRes = await authFetch('/api/offers/from-chat-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteUserId: activeItem.counterpart.userId,
          athleteName: activeItem.counterpart.displayName,
          contextNote: 'Created from chat composer',
        }),
      });
      const createData = (await createRes.json()) as {
        offer?: { id?: string };
        threadId?: string;
        error?: string;
      };
      const offerId = createData.offer?.id;
      const threadId = createData.threadId || selectedThreadId;
      if (!createRes.ok || !offerId) {
        setAttachmentHint(createData.error || 'Could not create deal draft from chat.');
        return;
      }

      const sendRes = await authFetch(`/api/offers/${offerId}/send`, {
        method: 'POST',
      });
      const sendData = (await sendRes.json()) as { error?: string };
      if (!sendRes.ok) {
        setAttachmentHint(sendData.error || 'Deal draft created, but sending failed.');
        return;
      }

      if (threadId !== selectedThreadId) {
        setSelectedThreadId(threadId);
      }
      await loadThreadMessages(threadId);
      await fetchInbox(debouncedSearch);
      setAttachmentHint('Deal sent in chat. The athlete can now review it.');
    } catch {
      setAttachmentHint('Network error while sending deal.');
    } finally {
      setSendDealLoading(false);
      window.setTimeout(() => setAttachmentHint(null), 2600);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setOfferActionLoadingById((prev) => ({ ...prev, [offerId]: 'accept' }));
    try {
      const res = await authFetch(`/api/offers/${offerId}/accept`, { method: 'POST' });
      if (res.ok) {
        setOfferStatusById((prev) => ({ ...prev, [offerId]: 'accepted' }));
      } else {
        setAttachmentHint('Could not accept this offer right now.');
      }
    } catch {
      setAttachmentHint('Network error while accepting offer.');
    } finally {
      setOfferActionLoadingById((prev) => ({ ...prev, [offerId]: null }));
      window.setTimeout(() => setAttachmentHint(null), 2200);
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    setOfferActionLoadingById((prev) => ({ ...prev, [offerId]: 'decline' }));
    try {
      const res = await authFetch(`/api/offers/${offerId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declineReason: 'not_interested', declineNote: 'Declined from chat card' }),
      });
      if (res.ok) {
        setOfferStatusById((prev) => ({ ...prev, [offerId]: 'declined' }));
      } else {
        setAttachmentHint('Could not decline this offer right now.');
      }
    } catch {
      setAttachmentHint('Network error while declining offer.');
    } finally {
      setOfferActionLoadingById((prev) => ({ ...prev, [offerId]: null }));
      window.setTimeout(() => setAttachmentHint(null), 2200);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-nilink-surface text-nilink-ink">
      <div className="dash-main-gutter-x shrink-0 border-b border-gray-100 pb-3 pt-5">
        <DashboardPageHeader title="Inbox" subtitle={subtitle} />
      </div>

      <div className="dash-main-gutter-x flex shrink-0 flex-col gap-3 border-b border-gray-100 py-4 sm:flex-row sm:items-center">
        <div className="relative w-full shrink-0 sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-nilink-accent-border focus:outline-none focus:ring-1 focus:ring-nilink-accent/30"
            aria-label="Search conversations"
          />
        </div>

        <button
          type="button"
          className="hidden shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:flex"
        >
          All filters
        </button>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" role="toolbar" aria-label={filterAria}>
          {filterOptions.map((option) => {
            const isActive = activeFilter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(isActive ? null : option)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-gray-800 bg-gray-100 text-gray-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {variant === 'business' && option === 'Football' && <FootballIcon className="h-4 w-4" />}
                {variant === 'business' && (option === 'Baseball' || option === 'Softball') && (
                  <BaseballIcon className="h-4 w-4" />
                )}
                {(variant === 'athlete' ||
                  (option !== 'Football' && option !== 'Baseball' && option !== 'Softball')) && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px] opacity-50">
                    ✦
                  </span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden py-4 dash-main-gutter-x lg:flex-row lg:py-6">
        {/* Thread list */}
        <div
          className={`flex h-full w-full shrink-0 flex-col lg:w-[320px] lg:min-w-[320px] ${selectedThreadId ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              {listTitle}{' '}
              <span className="text-sm font-normal text-gray-400">
                {listCount} {listCount === 1 ? 'chat' : 'chats'}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setShowUnread(!showUnread)}
              className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                showUnread
                  ? 'border-nilink-accent-border bg-nilink-accent-soft text-nilink-ink'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Unread only
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="scrollbar-hide flex-1 overflow-y-auto py-2">
              {inboxError ? (
                <div className="flex h-52 flex-col items-center justify-center gap-2 px-4 text-center">
                  <p className="text-sm font-semibold text-amber-900">{inboxError}</p>
                  {inboxErrorHint ? <p className="max-w-xs text-xs text-amber-800">{inboxErrorHint}</p> : null}
                  <button
                    type="button"
                    onClick={() => void fetchInbox(debouncedSearch)}
                    className="mt-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                  >
                    Retry
                  </button>
                  {inboxErrorCode === 'CHAT_SCHEMA_NOT_READY' ? (
                    <p className="max-w-xs text-[11px] text-gray-500">
                      This usually means chat tables are not provisioned yet.
                    </p>
                  ) : null}
                </div>
              ) : inboxLoading && items.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center px-4 text-center text-sm text-gray-400">
                  Loading conversations…
                </div>
              ) : listCount === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center px-4 text-center text-sm text-gray-400">
                  No matching conversations
                </div>
              ) : (
                displayedItems.map((row) => (
                  <ConversationListRow
                    key={row.threadId}
                    selected={selectedThreadId === row.threadId}
                    onSelect={() => setSelectedThreadId(row.threadId)}
                    title={row.counterpart.displayName}
                    subtitle={
                      row.lastMessage?.body
                        ? getRenderableMessagePreview(row.lastMessage.body)
                        : 'No messages yet'
                    }
                    image={row.counterpart.avatarUrl || PLACEHOLDER_AVATAR}
                    verified={row.counterpart.verified === true}
                    online={false}
                    unread={row.unreadCount > 0}
                    unreadCount={row.unreadCount}
                    time={row.lastMessage ? formatShortTime(row.lastMessage.createdAt) : undefined}
                    meta={[row.counterpart.sport, row.counterpart.school].filter(Boolean).join(' · ')}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className={`flex h-full min-w-0 flex-1 flex-col ${selectedThreadId ? 'flex' : 'hidden lg:flex'}`}>
          <div className="mb-3 flex shrink-0 items-center gap-3 px-1">
            {selectedThreadId && (
              <button
                type="button"
                onClick={() => setSelectedThreadId(null)}
                className="flex items-center gap-1 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
                aria-label="Back to inbox list"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">Chat</h2>
          </div>

          <div className="relative flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex h-14 w-full shrink-0 items-center justify-between bg-nilink-ink px-4 text-white">
              {selectedThreadId ? (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <ImageWithFallback
                      src={counterpartImage}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                    <span className="truncate text-[15px] font-bold">{counterpartName}</span>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 transition-colors hover:text-white"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <div className="h-8 w-full" />
              )}
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col bg-white">
              {selectedThreadId && messagesLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-28 text-gray-500">
                  <p className="text-sm">Loading messages…</p>
                </div>
              ) : selectedThreadId && messages.length > 0 ? (
                <div ref={messagesScrollRef} className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-6 pb-28">
                  <div className="text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Today</span>
                  </div>
                  {messages.map((msg) => (
                    <MessageBlock
                      key={msg.id}
                      msg={msg}
                      self={currentUserId !== null && msg.fromUserId === currentUserId}
                      peerAvatar={counterpartImage}
                      variant={variant}
                      offerStatus={msg.offerId ? offerStatusById[msg.offerId] : undefined}
                      offerActionLoading={msg.offerId ? offerActionLoadingById[msg.offerId] ?? null : null}
                      onAcceptOffer={handleAcceptOffer}
                      onDeclineOffer={handleDeclineOffer}
                    />
                  ))}
                </div>
              ) : selectedThreadId ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-28 text-gray-500">
                  <p className="text-sm">No messages yet. Say hello.</p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-28 text-gray-500">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium">Select a conversation</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-gray-100 bg-white p-4">
                {attachmentHint ? (
                  <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                    {attachmentHint}
                  </p>
                ) : null}
                <div className="relative flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <button
                    type="button"
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                    aria-label="Composer actions"
                    onClick={() => setComposerMenuOpen((v) => !v)}
                    disabled={!selectedThreadId || sendDealLoading}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  {composerMenuOpen && selectedThreadId ? (
                    <div className="absolute bottom-16 left-4 z-20 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      {variant === 'business' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSendDealFromComposer()}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            disabled={sendDealLoading}
                          >
                            <BriefcaseBusiness className="h-4 w-4 text-nilink-accent" />
                            {sendDealLoading ? 'Sending deal...' : 'Send deal'}
                          </button>
                          <button
                            type="button"
                            onClick={handleAttachmentAction}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            Attachment
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAttachmentAction}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          Attachment
                        </button>
                      )}
                    </div>
                  ) : null}
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendDraft();
                      }
                    }}
                    placeholder="Send a message…"
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-800 outline-none placeholder:text-gray-400"
                    aria-label="Message"
                    disabled={!selectedThreadId}
                  />
                  <button
                    type="button"
                    onClick={() => void sendDraft()}
                    disabled={!draft.trim() || !selectedThreadId}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nilink-accent text-white transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send className="ml-0.5 h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationListRow({
  selected,
  onSelect,
  title,
  subtitle,
  image,
  verified,
  online,
  unread,
  unreadCount,
  time,
  meta,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  image: string;
  verified: boolean;
  online: boolean;
  unread: boolean;
  unreadCount: number;
  time?: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        selected ? 'border-l-2 border-nilink-accent bg-nilink-accent-soft' : 'border-l-2 border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="relative shrink-0">
        <div className="relative h-12 w-12 rounded-full border border-gray-100 p-0.5">
          <ImageWithFallback src={image} alt="" className="h-full w-full rounded-full object-cover" />
          {online ? (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          ) : null}
        </div>
      </div>
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-1">
          <h3 className="truncate text-sm font-bold text-gray-900">{title}</h3>
          {verified ? <VerifiedBadge className="h-4 w-4 shrink-0" /> : null}
        </div>
        {meta ? (
          <p className="truncate text-xs text-gray-500">{meta}</p>
        ) : null}
        <p className={`truncate text-[13px] ${unread ? 'font-medium text-gray-900' : 'text-gray-500'}`}>{subtitle}</p>
        {time ? <p className="mt-0.5 text-[11px] text-gray-400">{time}</p> : null}
      </div>
      {unread &&
        (unreadCount > 1 ? (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-nilink-accent px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-nilink-accent" />
        ))}
    </button>
  );
}

function MessageBlock({
  msg,
  self,
  peerAvatar,
  variant,
  offerStatus,
  offerActionLoading,
  onAcceptOffer,
  onDeclineOffer,
}: {
  msg: ChatMessageRow;
  self: boolean;
  peerAvatar: string;
  variant: InboxVariant;
  offerStatus?: AthleteOfferStatus;
  offerActionLoading: 'accept' | 'decline' | 'send' | null;
  onAcceptOffer: (offerId: string) => void;
  onDeclineOffer: (offerId: string) => void;
}) {
  const ts = formatShortTime(msg.createdAt);
  const renderable = getRenderableMessageBody(msg);
  const isOfferMessage = msg.messageKind === 'offer' && Boolean(msg.offerId);

  const renderOfferActions = (tone: 'light' | 'dark') => {
    if (!isOfferMessage || !msg.offerId) return null;
    const actionTone =
      tone === 'dark'
        ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
        : 'border-gray-200 bg-white text-nilink-accent hover:bg-gray-50';
    const secondaryTone =
      tone === 'dark'
        ? 'border-white/25 bg-transparent text-white/90 hover:bg-white/10'
        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';

    return (
      <div className="mt-2 rounded-lg border border-black/5 bg-black/5 p-2.5 text-xs">
        <p className={`${tone === 'dark' ? 'text-white/85' : 'text-gray-600'}`}>
          Personal deal shared in chat.
          {offerStatus ? ` Status: ${offerStatus}.` : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={`/dashboard/offers?offer=${encodeURIComponent(msg.offerId)}`}
            className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${actionTone}`}
          >
            View full deal
          </a>
          {variant === 'athlete' && offerStatus !== 'accepted' && offerStatus !== 'declined' ? (
            <>
              <button
                type="button"
                onClick={() => onAcceptOffer(msg.offerId!)}
                disabled={offerActionLoading !== null}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${actionTone} disabled:opacity-60`}
              >
                {offerActionLoading === 'accept' ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                onClick={() => onDeclineOffer(msg.offerId!)}
                disabled={offerActionLoading !== null}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${secondaryTone} disabled:opacity-60`}
              >
                {offerActionLoading === 'decline' ? 'Declining...' : 'Decline'}
              </button>
              <a
                href={`/dashboard/offers?offer=${encodeURIComponent(msg.offerId)}`}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${secondaryTone}`}
              >
                Revise
              </a>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  if (renderable.isApplicationApprovedNotice) {
    return (
      <div className="flex justify-center">
        <div className="max-w-md rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center shadow-sm">
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Application approved
          </div>
          <p className="text-sm text-emerald-900">{renderable.text}</p>
          <p className="mt-1 text-xs text-emerald-700/80">{ts}</p>
        </div>
      </div>
    );
  }

  if (self) {
    return (
      <div className="flex justify-end">
        <div className="max-w-md">
          <div className="rounded-2xl rounded-tr-sm bg-nilink-sidebar-muted px-4 py-3 text-[13px] leading-relaxed text-white shadow-sm">
            {renderable.text}
            {renderOfferActions('dark')}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400">
            <span>{ts}</span>
            <CheckCheck className="h-3.5 w-3.5 text-nilink-accent" aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <ImageWithFallback src={peerAvatar} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover" />
      <div className="max-w-md">
        <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-gray-100 px-4 py-2.5 text-[13px] leading-relaxed text-gray-800 shadow-sm">
          {renderable.text}
          {renderOfferActions('light')}
        </div>
        <p className="mt-1 text-xs text-gray-400">{ts}</p>
      </div>
    </div>
  );
}
