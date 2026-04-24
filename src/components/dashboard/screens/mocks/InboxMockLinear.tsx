'use client';

import { useState } from 'react';
import { Search, Send, Paperclip, BriefcaseBusiness, CheckCheck, Inbox, Star, Archive, Filter } from 'lucide-react';

type Thread = {
  id: string;
  name: string;
  role: string;
  preview: string;
  time: string;
  unread: number;
  pinned?: boolean;
  status?: 'negotiating' | 'pending' | 'active';
};

type Msg = { id: string; self: boolean; body: string; time: string };

const THREADS: Thread[] = [
  { id: '1', name: 'Maya Chen', role: 'Guard · Stanford', preview: 'Sounds great — send the deck over.', time: '2m', unread: 2, status: 'negotiating', pinned: true },
  { id: '2', name: 'Jordan Ortiz', role: 'WR · Oregon', preview: "Can we push the shoot to Friday?", time: '1h', unread: 0, status: 'active' },
  { id: '3', name: 'Priya Shah', role: 'Gymnast · UCLA', preview: 'Thanks for the offer!', time: '3h', unread: 0, status: 'pending' },
  { id: '4', name: 'Luis Romero', role: 'Pitcher · Texas', preview: 'Attached my rate card.', time: 'Yesterday', unread: 0 },
  { id: '5', name: 'Ava Patel', role: 'Swimmer · UF', preview: 'Looking forward to it.', time: 'Mon', unread: 0 },
  { id: '6', name: 'Dominic Reed', role: 'LB · Alabama', preview: 'Let me check with my compliance office.', time: 'Mon', unread: 0 },
];

const MESSAGES: Msg[] = [
  { id: 'm1', self: false, body: "Hey — saw your campaign brief. The budget and timeline both look workable from my side.", time: '9:41 AM' },
  { id: 'm2', self: true, body: 'Great. Want me to send over the content spec and contract draft?', time: '9:44 AM' },
  { id: 'm3', self: false, body: 'Yes please. Also — do you have flexibility on the exclusivity window?', time: '9:45 AM' },
  { id: 'm4', self: true, body: 'We can drop it from 90 to 60 days. Sending the deck over now.', time: '9:46 AM' },
  { id: 'm5', self: false, body: 'Sounds great — send the deck over.', time: '9:48 AM' },
];

const STATUS_TONES: Record<NonNullable<Thread['status']>, string> = {
  negotiating: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-gray-50 text-gray-600 ring-gray-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function InboxMockLinear() {
  const [active, setActive] = useState('1');
  const [draft, setDraft] = useState('');
  const activeThread = THREADS.find((t) => t.id === active) ?? THREADS[0];

  return (
    <div className="grid h-full grid-cols-[260px_340px_1fr] bg-white font-sans text-gray-900">
      <aside className="flex flex-col border-r border-gray-200 bg-gray-50/60 px-3 py-4">
        <div className="px-2 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">NILINK · Inbox</p>
        </div>
        <NavItem icon={<Inbox className="h-3.5 w-3.5" />} label="All conversations" count={14} active />
        <NavItem icon={<Star className="h-3.5 w-3.5" />} label="Starred" count={3} />
        <NavItem icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="Active deals" count={5} />
        <NavItem icon={<Archive className="h-3.5 w-3.5" />} label="Archived" />
        <div className="mt-5 px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Filters</div>
        <NavItem label="Negotiating" dot="bg-amber-400" />
        <NavItem label="Pending response" dot="bg-gray-300" />
        <NavItem label="Active campaign" dot="bg-emerald-400" />
      </aside>

      <section className="flex min-w-0 flex-col border-r border-gray-200">
        <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search or jump to…"
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-12 text-[13px] placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              ⌘K
            </kbd>
          </div>
          <button className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Filter">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="scrollbar-hide flex-1 overflow-y-auto">
          {THREADS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors ${
                active === t.id ? 'bg-gray-50' : 'hover:bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {t.unread > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nilink-accent" />}
                  <h3 className={`truncate text-[13px] ${t.unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                    {t.name}
                  </h3>
                </div>
                <span className="shrink-0 text-[11px] text-gray-400">{t.time}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">{t.role}</p>
              <p className={`mt-1.5 truncate text-[12px] ${t.unread > 0 ? 'text-gray-800' : 'text-gray-500'}`}>{t.preview}</p>
              {t.status && (
                <span className={`mt-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${STATUS_TONES[t.status]}`}>
                  {t.status}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
          <div>
            <h2 className="text-[14px] font-semibold">{activeThread.name}</h2>
            <p className="text-[11px] text-gray-500">{activeThread.role} · replies typically in 1h</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50">
              View profile
            </button>
            <button className="rounded-md bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-800">
              Send deal
            </button>
          </div>
        </header>
        <div className="scrollbar-hide flex-1 overflow-y-auto bg-white px-6 py-6">
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              Today
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            {MESSAGES.map((m) => (
              <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg ${m.self ? 'text-right' : ''}`}>
                  <div
                    className={`rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.self ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-800'
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className={`mt-1 flex items-center gap-1 text-[10px] text-gray-400 ${m.self ? 'justify-end' : ''}`}>
                    <span>{m.time}</span>
                    {m.self && <CheckCheck className="h-3 w-3 text-nilink-accent" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <footer className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:border-gray-400">
            <button className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Attach">
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder="Reply to Maya…  ⌘⏎ to send"
              className="min-h-[22px] flex-1 resize-none bg-transparent text-[13px] leading-6 text-gray-800 outline-none placeholder:text-gray-400"
            />
            <button className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-800 disabled:opacity-40" disabled={!draft.trim()}>
              <span className="inline-flex items-center gap-1.5">Send <Send className="h-3 w-3" /></span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function NavItem({ icon, label, count, active, dot }: { icon?: React.ReactNode; label: string; count?: number; active?: boolean; dot?: string }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] ${
        active ? 'bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'
      }`}
    >
      {icon ? <span className="text-gray-400">{icon}</span> : null}
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> : null}
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[11px] text-gray-400">{count}</span>}
    </button>
  );
}
