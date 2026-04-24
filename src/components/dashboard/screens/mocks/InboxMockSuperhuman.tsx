'use client';

import { useState } from 'react';
import { Command, Reply, Forward, Archive, Star, MoreHorizontal, ArrowLeft, ArrowRight, Zap } from 'lucide-react';

type Thread = {
  id: string;
  name: string;
  orgOrRole: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  starred?: boolean;
  needsReply?: boolean;
  stage?: 'Negotiating' | 'Offer sent' | 'Awaiting signature' | 'Active' | 'Intro';
};

type Msg = {
  id: string;
  self: boolean;
  author: string;
  time: string;
  body: string;
  kind?: 'text' | 'offer' | 'system';
};

const THREADS: Thread[] = [
  { id: '1', name: 'Maya Chen', orgOrRole: 'Guard · Stanford Basketball', subject: 'Re: Spring apparel campaign — exclusivity window', snippet: 'Sounds great — send the deck over and I\'ll loop in my compliance rep by EOD.', time: '2m', unread: true, needsReply: true, stage: 'Negotiating' },
  { id: '2', name: 'Jordan Ortiz', orgOrRole: 'WR · Oregon Football', subject: 'Shoot reschedule request — Friday availability', snippet: "Can we push the shoot to Friday? I have a team film session Thursday.", time: '1h', unread: false, needsReply: true, stage: 'Active' },
  { id: '3', name: 'Priya Shah', orgOrRole: 'Gymnast · UCLA', subject: 'Offer accepted — next steps', snippet: 'Thanks for the offer! Countersigning tonight.', time: '3h', unread: false, starred: true, stage: 'Awaiting signature' },
  { id: '4', name: 'Luis Romero', orgOrRole: 'Pitcher · Texas Baseball', subject: 'Rate card + availability for summer', snippet: 'Attached my rate card. Reach rate is ~4.8%, audience 68% male 18–24.', time: 'Yesterday', unread: false, stage: 'Offer sent' },
  { id: '5', name: 'Ava Patel', orgOrRole: 'Swimmer · Florida', subject: 'Intro — interested in your hydration brand', snippet: 'Looking forward to it. I have two posts already planned around training season.', time: 'Mon', unread: false, stage: 'Intro' },
  { id: '6', name: 'Dominic Reed', orgOrRole: 'LB · Alabama Football', subject: 'Compliance review — boosters clause', snippet: 'Let me check with my compliance office on the booster-adjacency language.', time: 'Mon', unread: false, stage: 'Negotiating' },
  { id: '7', name: 'Sofia Delgado', orgOrRole: 'Forward · USC Soccer', subject: 'Content calendar — April', snippet: 'Here\'s the draft calendar. Flagging two dates that conflict with travel.', time: 'Apr 18', unread: false, stage: 'Active' },
];

const MESSAGES: Msg[] = [
  { id: 'm1', self: false, author: 'Maya Chen', time: 'Mon 9:41 AM', body: "Hey — saw your campaign brief. Budget and timeline both workable from my side.", kind: 'text' },
  { id: 'm2', self: true, author: 'You', time: 'Mon 9:44 AM', body: 'Great. Want me to send over the content spec and contract draft?', kind: 'text' },
  { id: 'm3', self: false, author: 'Maya Chen', time: 'Mon 9:45 AM', body: 'Yes please. Also — do you have flexibility on the exclusivity window?', kind: 'text' },
  { id: 'sys1', self: false, author: 'NILINK', time: 'Mon 9:46 AM', body: 'Offer v2 sent: $4,800 · 2 posts + 1 reel · 60-day exclusivity', kind: 'offer' },
  { id: 'm4', self: true, author: 'You', time: 'Mon 9:46 AM', body: 'Dropped exclusivity from 90 to 60 days. Deck coming over next.', kind: 'text' },
  { id: 'm5', self: false, author: 'Maya Chen', time: 'Today 9:48 AM', body: 'Sounds great — send the deck over and I\'ll loop in my compliance rep by EOD.', kind: 'text' },
];

const STAGE_TONE: Record<NonNullable<Thread['stage']>, string> = {
  Negotiating: 'text-amber-700',
  'Offer sent': 'text-sky-700',
  'Awaiting signature': 'text-violet-700',
  Active: 'text-emerald-700',
  Intro: 'text-gray-500',
};

export function InboxMockSuperhuman() {
  const [active, setActive] = useState('1');
  const activeThread = THREADS.find((t) => t.id === active) ?? THREADS[0];

  return (
    <div className="flex h-full flex-col bg-white font-sans text-gray-900 antialiased">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-2.5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-white">
              <Zap className="h-3 w-3" />
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-gray-900">NILINK</span>
            <span className="text-[13px] text-gray-300">/</span>
            <span className="text-[13px] text-gray-500">Inbox</span>
            <span className="text-[13px] text-gray-300">/</span>
            <span className="text-[13px] font-medium text-gray-700">Needs reply</span>
            <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">12</span>
          </div>
          <nav className="flex items-center gap-4 text-[12.5px] text-gray-500">
            <button className="font-semibold text-gray-900">Needs reply</button>
            <button className="hover:text-gray-900">All</button>
            <button className="hover:text-gray-900">Offers</button>
            <button className="hover:text-gray-900">Starred</button>
            <button className="hover:text-gray-900">Done</button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600 hover:bg-gray-50">
            <Command className="h-3 w-3" />
            <span>K</span>
            <span className="text-gray-400">Command menu</span>
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,0.9fr)_1.4fr]">
        <section className="flex min-w-0 flex-col border-r border-gray-100">
          <div className="flex shrink-0 items-center justify-between px-6 py-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[13px] font-semibold text-gray-900">Needs reply</h2>
              <span className="text-[11px] text-gray-400">7 of 14</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <KbdPair label="j" />
              <KbdPair label="k" />
              <span className="text-[10.5px] text-gray-400">navigate</span>
            </div>
          </div>
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
            {THREADS.map((t) => {
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={`group relative block w-full border-b border-gray-100 px-6 py-3 text-left transition-colors ${
                    isActive ? 'bg-[#fcfbf8]' : 'hover:bg-gray-50/70'
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-0 h-full w-[2px] bg-gray-900" />}
                  <div className="flex items-center gap-2">
                    {t.unread ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nilink-accent" aria-hidden />
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0" aria-hidden />
                    )}
                    <h3 className={`truncate text-[13.5px] tracking-tight ${t.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {t.name}
                    </h3>
                    {t.starred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-gray-400">{t.time}</span>
                  </div>
                  <p className="mt-0.5 pl-[14px] text-[11px] text-gray-400">{t.orgOrRole}</p>
                  <p className={`mt-1 truncate pl-[14px] text-[12.5px] ${t.unread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {t.subject}
                  </p>
                  <p className="mt-0.5 truncate pl-[14px] text-[12px] text-gray-500">{t.snippet}</p>
                  <div className="mt-1.5 flex items-center gap-2 pl-[14px]">
                    {t.stage && (
                      <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${STAGE_TONE[t.stage]}`}>
                        {t.stage}
                      </span>
                    )}
                    {t.needsReply && (
                      <span className="inline-flex items-center gap-1 rounded bg-gray-900 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-white">
                        Needs reply
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex min-w-0 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-6 border-b border-gray-100 px-10 py-5">
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold tracking-tight text-gray-900">
                {activeThread.subject}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-gray-500">
                <span className="font-medium text-gray-700">{activeThread.name}</span>
                <span>·</span>
                <span>{activeThread.orgOrRole}</span>
                {activeThread.stage && (
                  <>
                    <span>·</span>
                    <span className={`font-semibold uppercase tracking-wider ${STAGE_TONE[activeThread.stage]}`}>
                      {activeThread.stage}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-gray-500">
              <HeaderAction icon={<ArrowLeft className="h-3.5 w-3.5" />} label="Previous" hint="k" />
              <HeaderAction icon={<ArrowRight className="h-3.5 w-3.5" />} label="Next" hint="j" />
              <div className="mx-1 h-4 w-px bg-gray-200" />
              <HeaderAction icon={<Reply className="h-3.5 w-3.5" />} label="Reply" hint="r" />
              <HeaderAction icon={<Forward className="h-3.5 w-3.5" />} label="Forward" hint="f" />
              <HeaderAction icon={<Archive className="h-3.5 w-3.5" />} label="Done" hint="e" />
              <HeaderAction icon={<Star className="h-3.5 w-3.5" />} label="Star" hint="s" />
              <HeaderAction icon={<MoreHorizontal className="h-3.5 w-3.5" />} label="More" />
            </div>
          </header>

          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-10 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
              {MESSAGES.map((m) => {
                if (m.kind === 'offer') {
                  return (
                    <div key={m.id} className="rounded-md border border-gray-200 bg-[#fcfbf8] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-sky-700">Offer</span>
                        <span className="text-[11px] text-gray-400">{m.time}</span>
                      </div>
                      <p className="mt-1 text-[13.5px] text-gray-800">{m.body}</p>
                      <div className="mt-3 flex gap-2">
                        <button className="rounded-md bg-gray-900 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-black">View full deal</button>
                        <button className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-gray-700 hover:bg-gray-50">Revise</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id}>
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">{m.author}</span>
                        {m.self && <span className="text-[10.5px] text-gray-400">you</span>}
                      </div>
                      <span className="text-[11px] tabular-nums text-gray-400">{m.time}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-gray-800">
                      {m.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="shrink-0 border-t border-gray-100 bg-white px-10 py-4">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-lg border border-gray-200 bg-white focus-within:border-gray-400">
                <textarea
                  rows={2}
                  placeholder="Reply to Maya…"
                  className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-6 text-gray-900 outline-none placeholder:text-gray-400"
                />
                <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                  <div className="flex items-center gap-2 text-[11.5px] text-gray-500">
                    <button className="rounded-md px-2 py-1 hover:bg-gray-50">Attach</button>
                    <button className="rounded-md px-2 py-1 hover:bg-gray-50">Insert deal</button>
                    <button className="rounded-md px-2 py-1 hover:bg-gray-50">Snippet</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      <KbdPair label="⌘" /> <KbdPair label="↵" /> to send
                    </span>
                    <button className="rounded-md bg-gray-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-black">
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function HeaderAction({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <button
      type="button"
      className="group flex items-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
      {hint && (
        <kbd className="ml-1 hidden rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-gray-500 group-hover:inline">
          {hint}
        </kbd>
      )}
    </button>
  );
}

function KbdPair({ label }: { label: string }) {
  return (
    <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-gray-200 bg-white px-1 text-[10px] font-semibold text-gray-600">
      {label}
    </kbd>
  );
}
