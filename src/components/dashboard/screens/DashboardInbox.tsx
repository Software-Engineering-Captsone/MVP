'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Send,
  User,
  Trash2,
  Plus,
  ChevronLeft,
  CheckCheck,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import type { ChatMessage } from '@/lib/mockData';
import { mockAthletes, mockAthleteBrandThreads, mockConversations } from '@/lib/mockData';

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

export type InboxVariant = 'business' | 'athlete';

function isFromSelf(msg: ChatMessage, variant: InboxVariant): boolean {
  if (variant === 'business') return msg.sender === 'brand';
  return msg.sender === 'athlete';
}

export function DashboardInbox({ variant }: { variant: InboxVariant }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [showUnread, setShowUnread] = useState(false);
  const [draft, setDraft] = useState('');

  const industryOptions = useMemo(
    () => [...new Set(mockAthleteBrandThreads.map((t) => t.industry))].sort(),
    []
  );

  const businessFiltered = useMemo(() => {
    return mockConversations.filter((c) => {
      const athlete = mockAthletes.find((a) => a.id === c.athleteId);
      const matchesSearch =
        c.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSport = activeFilter && athlete ? athlete.sport === activeFilter : activeFilter ? false : true;
      const matchesUnread = showUnread ? c.unread : true;
      return matchesSearch && matchesSport && matchesUnread;
    });
  }, [searchQuery, activeFilter, showUnread]);

  const athleteFiltered = useMemo(() => {
    return mockAthleteBrandThreads.filter((t) => {
      const matchesSearch =
        t.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.industry.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = activeFilter ? t.industry === activeFilter : true;
      const matchesUnread = showUnread ? t.unread : true;
      return matchesSearch && matchesIndustry && matchesUnread;
    });
  }, [searchQuery, activeFilter, showUnread]);

  const filterOptions = variant === 'business' ? sports : industryOptions;
  const filteredBusiness = businessFiltered;
  const filteredAthlete = athleteFiltered;
  const listCount = variant === 'business' ? filteredBusiness.length : filteredAthlete.length;

  const activeBusiness = variant === 'business' && selectedId ? mockConversations.find((c) => c.id === selectedId) : null;
  const activeAthleteThread =
    variant === 'athlete' && selectedId ? mockAthleteBrandThreads.find((t) => t.id === selectedId) : null;

  const counterpartName =
    variant === 'business'
      ? activeBusiness?.athleteName
      : activeAthleteThread?.brandName;
  const counterpartImage = variant === 'business' ? activeBusiness?.image : activeAthleteThread?.image;
  const counterpartVerified =
    variant === 'business' ? activeBusiness?.verified : activeAthleteThread?.verified;
  const activeMessages =
    variant === 'business' ? activeBusiness?.messages ?? [] : activeAthleteThread?.messages ?? [];

  const subtitle =
    variant === 'business'
      ? 'Conversations with athletes'
      : 'Messages from brands and sponsors';
  const searchPlaceholder = variant === 'business' ? 'Search athletes…' : 'Search brands or industries…';
  const filterAria = variant === 'business' ? 'Filter by sport' : 'Filter by industry';
  const listTitle = variant === 'business' ? 'Athletes' : 'Brands';

  const sendDraft = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
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
          className={`flex h-full w-full shrink-0 flex-col lg:w-[320px] lg:min-w-[320px] ${selectedId ? 'hidden lg:flex' : 'flex'}`}
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
              {listCount === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center px-4 text-center text-sm text-gray-400">
                  No matching conversations
                </div>
              ) : variant === 'business' ? (
                filteredBusiness.map((conv) => (
                  <ConversationListRow
                    key={conv.id}
                    variant="business"
                    selected={selectedId === conv.id}
                    onSelect={() => setSelectedId(conv.id)}
                    title={conv.athleteName}
                    subtitle={conv.lastMessage}
                    image={conv.image}
                    verified={conv.verified}
                    online={conv.online}
                    unread={conv.unread}
                    unreadCount={conv.unread ? 1 : 0}
                    time={conv.messages[conv.messages.length - 1]?.timestamp}
                  />
                ))
              ) : (
                filteredAthlete.map((t) => (
                  <ConversationListRow
                    key={t.id}
                    variant="athlete"
                    selected={selectedId === t.id}
                    onSelect={() => setSelectedId(t.id)}
                    title={t.brandName}
                    subtitle={t.lastMessage}
                    image={t.image}
                    verified={t.verified}
                    online={t.online}
                    unread={t.unread}
                    unreadCount={t.unreadCount}
                    time={t.lastMessageTime}
                    meta={t.industry}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className={`flex h-full min-w-0 flex-1 flex-col ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
          <div className="mb-3 flex shrink-0 items-center gap-3 px-1">
            {selectedId && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
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
              {counterpartName && counterpartImage ? (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <ImageWithFallback
                      src={counterpartImage}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                    <span className="truncate text-[15px] font-bold">{counterpartName}</span>
                    {counterpartVerified ? <VerifiedBadge className="h-4 w-4 shrink-0 text-white" /> : null}
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
              {selectedId && activeMessages.length > 0 ? (
                <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-6 pb-28">
                  <div className="text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Today</span>
                  </div>
                  {activeMessages.map((msg) => (
                    <MessageBlock key={msg.id} msg={msg} variant={variant} peerAvatar={counterpartImage ?? ''} />
                  ))}
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
                <div className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <button type="button" className="shrink-0 text-gray-400 hover:text-gray-600" aria-label="Attach">
                    <Plus className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendDraft();
                      }
                    }}
                    placeholder="Send a message…"
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-800 outline-none placeholder:text-gray-400"
                    aria-label="Message"
                  />
                  <button
                    type="button"
                    onClick={sendDraft}
                    disabled={!draft.trim()}
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
  variant,
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
  variant: InboxVariant;
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
        {variant === 'athlete' && meta ? (
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
  variant,
  peerAvatar,
}: {
  msg: ChatMessage;
  variant: InboxVariant;
  peerAvatar: string;
}) {
  const self = isFromSelf(msg, variant);

  if (msg.type === 'deal_offer' && msg.dealTerms) {
    const body = (
      <>
        <p className={`mb-2 font-semibold ${self ? 'text-white' : 'text-nilink-ink'}`}>{msg.dealTerms.duration}</p>
        <ul className={`mb-4 ml-1 space-y-1 ${self ? 'text-gray-300' : 'text-gray-600'}`}>
          {msg.dealTerms.deliverables.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p className={self ? 'text-gray-300' : 'text-gray-600'}>
          Compensation:{' '}
          <span className={`font-semibold ${self ? 'text-white' : 'text-nilink-ink'}`}>
            {msg.dealTerms.compensation}
          </span>
        </p>
        <p className={`mt-2 text-xs ${self ? 'text-gray-400' : 'text-gray-400'}`}>{msg.timestamp}</p>
      </>
    );
    if (self) {
      return <div className="flex justify-end"><div className="max-w-[340px] rounded-2xl rounded-tr-sm bg-nilink-sidebar-muted px-5 py-4 text-[13px] leading-relaxed shadow-sm">{body}</div></div>;
    }
    return (
      <div className="flex items-start gap-3">
        <ImageWithFallback src={peerAvatar} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover" />
        <div className="max-w-[340px] rounded-2xl rounded-tl-sm border border-nilink-accent-border bg-nilink-accent-soft px-5 py-4 text-[13px] leading-relaxed text-gray-800 shadow-sm">
          {body}
        </div>
      </div>
    );
  }

  if (self) {
    return (
      <div className="flex justify-end">
        <div className="max-w-md">
          <div className="rounded-2xl rounded-tr-sm bg-nilink-sidebar-muted px-4 py-3 text-[13px] leading-relaxed text-white shadow-sm">
            {msg.content}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400">
            <span>{msg.timestamp}</span>
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
          {msg.content}
        </div>
        <p className="mt-1 text-xs text-gray-400">{msg.timestamp}</p>
      </div>
    </div>
  );
}
