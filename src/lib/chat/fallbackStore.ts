import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { ChatInboxItem, ChatMessageKind, ChatMessageRow, ChatSessionUser, ChatThreadKind } from './types';

const FALLBACK_STORE_PATH = path.join(process.cwd(), 'data', 'local-chat-fallback-store.json');

export const DEMO_BRAND_EMAIL = 'brand.demo.nilink+1776131106676@example.com';
export const DEMO_ATHLETE_EMAIL = 'athlete.demo.nilink+1776131106676@example.com';
const DEFAULT_DEMO_ATHLETE_USER_ID = 'cd9279de-b6fb-4c84-b486-20b5b72b4e48';

type FallbackThread = {
  id: string;
  applicationId: string | null;
  threadKind: ChatThreadKind;
  brandUserId: string;
  athleteUserId: string;
  createdAt: string;
  updatedAt: string;
};

type FallbackParticipant = {
  threadId: string;
  userId: string;
  displayName: string;
};

type FallbackMessage = {
  id: string;
  threadId: string;
  fromUserId: string;
  body: string;
  createdAt: string;
  messageKind: ChatMessageKind;
  offerId: string | null;
};

type FallbackReadState = {
  threadId: string;
  userId: string;
  lastReadAt: string | null;
};

type FallbackStore = {
  aliases: {
    brandDemoUserId?: string;
    athleteDemoUserId?: string;
  };
  threads: FallbackThread[];
  participants: FallbackParticipant[];
  messages: FallbackMessage[];
  reads: FallbackReadState[];
  seededAt?: string;
};

const EMPTY: FallbackStore = {
  aliases: {},
  threads: [],
  participants: [],
  messages: [],
  reads: [],
};

let writeChain: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readStore(): Promise<FallbackStore> {
  try {
    const raw = await fs.readFile(FALLBACK_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as FallbackStore;
    return {
      aliases: parsed.aliases ?? {},
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      reads: Array.isArray(parsed.reads) ? parsed.reads : [],
      seededAt: parsed.seededAt,
    };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') return { ...EMPTY };
    throw e;
  }
}

async function writeStore(store: FallbackStore): Promise<void> {
  await fs.mkdir(path.dirname(FALLBACK_STORE_PATH), { recursive: true });
  await fs.writeFile(FALLBACK_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

async function mutateStore(mutator: (draft: FallbackStore) => void | Promise<void>): Promise<FallbackStore> {
  return withLock(async () => {
    const draft = await readStore();
    await mutator(draft);
    await writeStore(draft);
    return draft;
  });
}

function ensureDemoSeed(draft: FallbackStore): void {
  const brandUserId = draft.aliases.brandDemoUserId;
  const athleteUserId = draft.aliases.athleteDemoUserId ?? DEFAULT_DEMO_ATHLETE_USER_ID;
  if (!brandUserId || !athleteUserId) return;
  if (draft.seededAt) return;

  const now = new Date();
  const t1 = now.toISOString();
  const t2 = new Date(now.getTime() + 30_000).toISOString();
  const t3 = new Date(now.getTime() + 60_000).toISOString();
  const t4 = new Date(now.getTime() + 90_000).toISOString();

  const outreachThreadId = randomUUID();
  const approvedThreadId = randomUUID();

  draft.threads.push(
    {
      id: outreachThreadId,
      applicationId: null,
      threadKind: 'brand_outreach',
      brandUserId,
      athleteUserId,
      createdAt: t1,
      updatedAt: t4,
    },
    {
      id: approvedThreadId,
      applicationId: 'demo-approved-application-1',
      threadKind: 'application_approved',
      brandUserId,
      athleteUserId,
      createdAt: t1,
      updatedAt: t3,
    }
  );

  draft.participants.push(
    { threadId: outreachThreadId, userId: brandUserId, displayName: 'NILINK Demo Brand' },
    { threadId: outreachThreadId, userId: athleteUserId, displayName: 'Demo Athlete' },
    { threadId: approvedThreadId, userId: brandUserId, displayName: 'NILINK Demo Brand' },
    { threadId: approvedThreadId, userId: athleteUserId, displayName: 'Demo Athlete' }
  );

  draft.messages.push(
    {
      id: randomUUID(),
      threadId: outreachThreadId,
      fromUserId: brandUserId,
      body: 'Hi! We loved your content style and want to discuss a potential NIL partnership.',
      createdAt: t1,
      messageKind: 'user',
      offerId: null,
    },
    {
      id: randomUUID(),
      threadId: outreachThreadId,
      fromUserId: athleteUserId,
      body: 'Thanks! Happy to chat. What deliverables are you looking for?',
      createdAt: t2,
      messageKind: 'user',
      offerId: null,
    },
    {
      id: randomUUID(),
      threadId: outreachThreadId,
      fromUserId: brandUserId,
      body: 'Great — two IG story frames and one reel. I can send a draft offer now.',
      createdAt: t3,
      messageKind: 'user',
      offerId: null,
    },
    {
      id: randomUUID(),
      threadId: approvedThreadId,
      fromUserId: brandUserId,
      body: '[nilink-notice:application_approved] Application approved — you can coordinate here.',
      createdAt: t1,
      messageKind: 'system',
      offerId: null,
    },
    {
      id: randomUUID(),
      threadId: approvedThreadId,
      fromUserId: athleteUserId,
      body: 'Awesome, thank you! I am available this week to kick this off.',
      createdAt: t2,
      messageKind: 'user',
      offerId: null,
    }
  );

  draft.seededAt = new Date().toISOString();
}

function registerAlias(draft: FallbackStore, session: ChatSessionUser): void {
  const email = (session.email ?? '').toLowerCase().trim();
  if (email === DEMO_BRAND_EMAIL) {
    draft.aliases.brandDemoUserId = session.id;
  }
  if (email === DEMO_ATHLETE_EMAIL) {
    draft.aliases.athleteDemoUserId = session.id;
  }
}

function hasParticipant(store: FallbackStore, threadId: string, userId: string): boolean {
  return store.participants.some((p) => p.threadId === threadId && p.userId === userId);
}

function threadById(store: FallbackStore, threadId: string): FallbackThread | null {
  return store.threads.find((t) => t.id === threadId) ?? null;
}

function unreadCountFor(store: FallbackStore, threadId: string, userId: string): number {
  const rs = store.reads.find((r) => r.threadId === threadId && r.userId === userId);
  const lastRead = rs?.lastReadAt ? new Date(rs.lastReadAt).getTime() : null;
  return store.messages.filter((m) => {
    if (m.threadId !== threadId) return false;
    if (m.fromUserId === userId) return false;
    if (lastRead == null) return true;
    return new Date(m.createdAt).getTime() > lastRead;
  }).length;
}

export async function fallbackLoadInbox(session: ChatSessionUser, q?: string): Promise<ChatInboxItem[]> {
  const store = await mutateStore((draft) => {
    registerAlias(draft, session);
    ensureDemoSeed(draft);
  });
  const search = q?.trim().toLowerCase() ?? '';
  const mine = store.threads.filter((t) => hasParticipant(store, t.id, session.id));
  const items: ChatInboxItem[] = mine.map((t) => {
    const counterpart = store.participants.find((p) => p.threadId === t.id && p.userId !== session.id);
    const msgs = store.messages
      .filter((m) => m.threadId === t.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const last = msgs[msgs.length - 1] ?? null;
    return {
      threadId: t.id,
      applicationId: t.applicationId,
      threadKind: t.threadKind,
      counterpart: {
        userId: counterpart?.userId ?? '',
        displayName: counterpart?.displayName ?? 'Conversation',
      },
      lastMessage: last
        ? { body: last.body, createdAt: last.createdAt, fromUserId: last.fromUserId }
        : null,
      unreadCount: unreadCountFor(store, t.id, session.id),
      updatedAt: t.updatedAt,
    };
  });

  const filtered = search
    ? items.filter((i) => {
        const n = i.counterpart.displayName.toLowerCase();
        const b = (i.lastMessage?.body ?? '').toLowerCase();
        return n.includes(search) || b.includes(search);
      })
    : items;

  filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return filtered;
}

export async function fallbackListMessages(session: ChatSessionUser, threadId: string): Promise<ChatMessageRow[] | null> {
  const store = await mutateStore((draft) => {
    registerAlias(draft, session);
    ensureDemoSeed(draft);
  });
  const thread = threadById(store, threadId);
  if (!thread) return null;
  if (!hasParticipant(store, threadId, session.id)) return null;
  return store.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => ({
      id: m.id,
      fromUserId: m.fromUserId,
      body: m.body,
      createdAt: m.createdAt,
      messageKind: m.messageKind,
      offerId: m.offerId,
    }));
}

export async function fallbackAppendMessage(
  session: ChatSessionUser,
  threadId: string,
  body: string
): Promise<ChatMessageRow | null> {
  let created: ChatMessageRow | null = null;
  await mutateStore((draft) => {
    registerAlias(draft, session);
    ensureDemoSeed(draft);
    const thread = threadById(draft, threadId);
    if (!thread) return;
    if (!hasParticipant(draft, threadId, session.id)) return;
    const row: FallbackMessage = {
      id: randomUUID(),
      threadId,
      fromUserId: session.id,
      body,
      createdAt: new Date().toISOString(),
      messageKind: 'user',
      offerId: null,
    };
    draft.messages.push(row);
    thread.updatedAt = row.createdAt;
    created = {
      id: row.id,
      fromUserId: row.fromUserId,
      body: row.body,
      createdAt: row.createdAt,
      messageKind: row.messageKind,
      offerId: row.offerId,
    };
  });
  return created;
}

export async function fallbackMarkRead(session: ChatSessionUser, threadId: string): Promise<boolean> {
  let ok = false;
  await mutateStore((draft) => {
    registerAlias(draft, session);
    ensureDemoSeed(draft);
    const thread = threadById(draft, threadId);
    if (!thread) return;
    if (!hasParticipant(draft, threadId, session.id)) return;
    const now = new Date().toISOString();
    const idx = draft.reads.findIndex((r) => r.threadId === threadId && r.userId === session.id);
    if (idx >= 0) draft.reads[idx].lastReadAt = now;
    else draft.reads.push({ threadId, userId: session.id, lastReadAt: now });
    ok = true;
  });
  return ok;
}

export async function fallbackEnsureOutreachThread(
  session: ChatSessionUser,
  athleteUserId: string,
  athleteName?: string
): Promise<string> {
  let threadId = '';
  await mutateStore((draft) => {
    registerAlias(draft, session);
    ensureDemoSeed(draft);
    const existing = draft.threads.find(
      (t) =>
        t.threadKind === 'brand_outreach' &&
        t.brandUserId === session.id &&
        t.athleteUserId === athleteUserId
    );
    if (existing) {
      threadId = existing.id;
      return;
    }
    const now = new Date().toISOString();
    const createdId = randomUUID();
    draft.threads.push({
      id: createdId,
      applicationId: null,
      threadKind: 'brand_outreach',
      brandUserId: session.id,
      athleteUserId,
      createdAt: now,
      updatedAt: now,
    });
    draft.participants.push(
      { threadId: createdId, userId: session.id, displayName: 'Brand' },
      { threadId: createdId, userId: athleteUserId, displayName: athleteName?.trim() || 'Athlete' }
    );
    threadId = createdId;
  });
  return threadId;
}
