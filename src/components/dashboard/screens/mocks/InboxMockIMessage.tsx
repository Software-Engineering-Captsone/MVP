'use client';

import { useState } from 'react';
import { Search, Send, Plus, Smile, CheckCheck, Phone, Video, Info } from 'lucide-react';

type Thread = {
  id: string;
  name: string;
  role: string;
  preview: string;
  time: string;
  unread: number;
  color: string;
};

type Msg = { id: string; self: boolean; body: string; time: string };

const THREADS: Thread[] = [
  { id: '1', name: 'Maya Chen', role: 'Guard · Stanford', preview: 'Sounds great — send the deck over.', time: '2m', unread: 2, color: 'bg-gradient-to-br from-rose-400 to-pink-500' },
  { id: '2', name: 'Jordan Ortiz', role: 'WR · Oregon', preview: "Can we push the shoot to Friday?", time: '1h', unread: 0, color: 'bg-gradient-to-br from-emerald-400 to-teal-500' },
  { id: '3', name: 'Priya Shah', role: 'Gymnast · UCLA', preview: 'Thanks for the offer!', time: '3h', unread: 0, color: 'bg-gradient-to-br from-violet-400 to-indigo-500' },
  { id: '4', name: 'Luis Romero', role: 'Pitcher · Texas', preview: 'Attached my rate card.', time: 'Yesterday', unread: 0, color: 'bg-gradient-to-br from-amber-400 to-orange-500' },
  { id: '5', name: 'Ava Patel', role: 'Swimmer · UF', preview: 'Looking forward to it.', time: 'Mon', unread: 0, color: 'bg-gradient-to-br from-sky-400 to-blue-500' },
  { id: '6', name: 'Dominic Reed', role: 'LB · Alabama', preview: 'Let me check with compliance.', time: 'Mon', unread: 0, color: 'bg-gradient-to-br from-slate-400 to-gray-500' },
];

const MESSAGES: Msg[] = [
  { id: 'm1', self: false, body: "Hey — saw your campaign brief. The budget and timeline both look workable from my side.", time: '9:41 AM' },
  { id: 'm2', self: true, body: 'Great. Want me to send over the content spec and contract draft?', time: '9:44 AM' },
  { id: 'm3', self: false, body: 'Yes please. Also — do you have flexibility on the exclusivity window?', time: '9:45 AM' },
  { id: 'm4', self: true, body: 'We can drop it from 90 to 60 days. Sending the deck over now.', time: '9:46 AM' },
  { id: 'm5', self: false, body: 'Sounds great — send the deck over 🙌', time: '9:48 AM' },
];

export function InboxMockIMessage() {
  const [active, setActive] = useState('1');
  const [draft, setDraft] = useState('');
  const activeThread = THREADS.find((t) => t.id === active) ?? THREADS[0];

  return (
    <div className="grid h-full grid-cols-[360px_1fr] bg-gradient-to-b from-gray-50 to-white font-sans text-gray-900">
      <section className="flex min-w-0 flex-col border-r border-gray-200 bg-white/80 backdrop-blur">
        <header className="shrink-0 px-5 pb-3 pt-6">
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Messages</h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search"
              className="w-full rounded-full border border-gray-200 bg-gray-100/70 py-2 pl-9 pr-4 text-[14px] placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none"
            />
          </div>
        </header>
        <div className="scrollbar-hide flex-1 overflow-y-auto px-2 pb-4">
          {THREADS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                active === t.id ? 'bg-nilink-accent-soft' : 'hover:bg-gray-100/70'
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white shadow-sm ${t.color}`}>
                {t.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`truncate text-[14.5px] ${t.unread > 0 ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                    {t.name}
                  </h3>
                  <span className="shrink-0 text-[11px] text-gray-400">{t.time}</span>
                </div>
                <p className={`truncate text-[13px] ${t.unread > 0 ? 'text-gray-800' : 'text-gray-500'}`}>{t.preview}</p>
              </div>
              {t.unread > 0 && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nilink-accent text-[10px] font-bold text-white">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200/70 bg-white/70 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-sm ${activeThread.color}`}>
              {activeThread.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">{activeThread.name}</h2>
              <p className="text-[12px] text-gray-500">{activeThread.role} · Active now</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <button className="rounded-full p-2 hover:bg-gray-100" aria-label="Call"><Phone className="h-4 w-4" /></button>
            <button className="rounded-full p-2 hover:bg-gray-100" aria-label="Video"><Video className="h-4 w-4" /></button>
            <button className="rounded-full p-2 hover:bg-gray-100" aria-label="Info"><Info className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="scrollbar-hide flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl space-y-1.5">
            <div className="py-3 text-center text-[11px] font-medium text-gray-400">
              iMessage · Today 9:40 AM
            </div>
            {MESSAGES.map((m, i) => {
              const prev = MESSAGES[i - 1];
              const continuation = prev && prev.self === m.self;
              return (
                <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'} ${continuation ? 'mt-1' : 'mt-3'}`}>
                  {!m.self && !continuation && (
                    <div className={`mr-2 flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-[10px] font-semibold text-white ${activeThread.color}`}>
                      {activeThread.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  {!m.self && continuation && <div className="mr-2 w-7 shrink-0" />}
                  <div className={`max-w-md ${m.self ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-[22px] px-4 py-2 text-[14.5px] leading-relaxed shadow-sm ${
                        m.self ? 'text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                      style={m.self ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' } : undefined}
                    >
                      {m.body}
                    </div>
                    {!continuation && (
                      <div className={`mt-1 flex items-center gap-1 px-1 text-[10.5px] text-gray-400 ${m.self ? 'self-end' : ''}`}>
                        <span>{m.time}</span>
                        {m.self && <CheckCheck className="h-3 w-3 text-blue-500" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="shrink-0 bg-transparent px-6 pb-5">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-gray-300">
            <button className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Attach">
              <Plus className="h-4 w-4" />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="iMessage"
              className="min-w-0 flex-1 bg-transparent text-[14.5px] text-gray-800 outline-none placeholder:text-gray-400"
            />
            <button className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Emoji">
              <Smile className="h-4 w-4" />
            </button>
            <button
              disabled={!draft.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition-all hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
              aria-label="Send"
            >
              <Send className="ml-0.5 h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
