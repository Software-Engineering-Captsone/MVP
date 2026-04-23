import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoredApplication, StoredCampaign } from '@/lib/campaigns/localCampaignStore';
import type { ChatInboxItem, ChatMessageKind, ChatMessageRow, ChatThreadKind, ChatThreadRow } from './types';

const THREAD_SELECT =
  'id, application_id, brand_user_id, athlete_user_id, thread_kind, campaign_id, created_at, updated_at';

function athleteDisplayName(app: StoredApplication): string {
  const snap = app.athleteSnapshot as Record<string, unknown> | undefined;
  const name = snap && typeof snap.name === 'string' ? snap.name.trim() : '';
  return name || 'Athlete';
}

function brandDisplayName(campaign: StoredCampaign): string {
  const n = campaign.brandDisplayName;
  return typeof n === 'string' && n.trim() ? n.trim() : 'Brand';
}

function mapThreadRow(data: Record<string, unknown>): ChatThreadRow {
  const rawKind = String(data.thread_kind ?? 'application_approved');
  const thread_kind: ChatThreadKind =
    rawKind === 'brand_outreach' ? 'brand_outreach' : 'application_approved';
  return {
    id: String(data.id),
    application_id: data.application_id != null ? String(data.application_id) : null,
    brand_user_id: String(data.brand_user_id),
    athlete_user_id: String(data.athlete_user_id),
    thread_kind,
    campaign_id: data.campaign_id != null ? String(data.campaign_id) : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function getThreadByApplicationId(
  supabase: SupabaseClient,
  applicationId: string
): Promise<ChatThreadRow | null> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select(THREAD_SELECT)
    .eq('application_id', applicationId)
    .eq('thread_kind', 'application_approved')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapThreadRow(data as Record<string, unknown>);
}

/**
 * True if the participant has posted at least one user (non-system) message in the thread.
 */
export async function threadHasUserMessageFromParticipant(
  supabase: SupabaseClient,
  threadId: string,
  fromUserId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .eq('from_user_id', fromUserId)
    .eq('message_kind', 'user');
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

/**
 * Creates or returns the application-linked campaign thread.
 * Declined applications cannot use messaging. Brand may bootstrap a thread for any non-declined status.
 */
export async function ensureApplicationCampaignThread(
  supabase: SupabaseClient,
  applicationId: string,
  app: StoredApplication,
  campaign: StoredCampaign
): Promise<ChatThreadRow> {
  if (String(app.status ?? '') === 'declined') {
    throw new Error('Messaging is not available for declined applications');
  }

  const brandUserId = String(campaign.brandUserId ?? '');
  const athleteUserId = String(app.athleteUserId ?? '');
  const brandName = brandDisplayName(campaign);
  const athleteName = athleteDisplayName(app);

  const existing = await getThreadByApplicationId(supabase, applicationId);
  if (existing) {
    await supabase.from('chat_participants').upsert(
      [
        { thread_id: existing.id, user_id: brandUserId, display_name: brandName },
        { thread_id: existing.id, user_id: athleteUserId, display_name: athleteName },
      ],
      { onConflict: 'thread_id,user_id' }
    );
    return existing;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('chat_threads')
    .insert({
      application_id: applicationId,
      brand_user_id: brandUserId,
      athlete_user_id: athleteUserId,
      thread_kind: 'application_approved',
    })
    .select(THREAD_SELECT)
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      const again = await getThreadByApplicationId(supabase, applicationId);
      if (again) return again;
    }
    throw new Error(insErr.message);
  }

  const row = mapThreadRow(inserted as Record<string, unknown>);

  const { error: partErr } = await supabase.from('chat_participants').insert([
    { thread_id: row.id, user_id: brandUserId, display_name: brandName },
    { thread_id: row.id, user_id: athleteUserId, display_name: athleteName },
  ]);
  if (partErr) throw new Error(partErr.message);

  return row;
}

/** @deprecated Use ensureApplicationCampaignThread — kept for call sites that expect the old name. */
export async function ensureApprovedApplicationThread(
  supabase: SupabaseClient,
  applicationId: string,
  app: StoredApplication,
  campaign: StoredCampaign
): Promise<ChatThreadRow> {
  return ensureApplicationCampaignThread(supabase, applicationId, app, campaign);
}

export type BrandOutreachThreadArgs = {
  brandUserId: string;
  athleteUserId: string;
  athleteDisplayName?: string;
  campaignId?: string | null;
};

/**
 * Idempotent brand → athlete outreach thread (no application).
 */
export async function ensureBrandOutreachThread(
  supabase: SupabaseClient,
  args: BrandOutreachThreadArgs
): Promise<ChatThreadRow> {
  const brandUserId = String(args.brandUserId ?? '').trim();
  const athleteUserId = String(args.athleteUserId ?? '').trim();
  if (!brandUserId || !athleteUserId) {
    throw new Error('brandUserId and athleteUserId are required');
  }
  const athleteName = (args.athleteDisplayName ?? '').trim() || 'Athlete';

  const { data: existing, error: exErr } = await supabase
    .from('chat_threads')
    .select(THREAD_SELECT)
    .eq('thread_kind', 'brand_outreach')
    .eq('brand_user_id', brandUserId)
    .eq('athlete_user_id', athleteUserId)
    .maybeSingle();
  if (exErr) throw new Error(exErr.message);
  if (existing) {
    const row = mapThreadRow(existing as Record<string, unknown>);
    await supabase.from('chat_participants').upsert(
      [
        { thread_id: row.id, user_id: brandUserId, display_name: 'Brand' },
        { thread_id: row.id, user_id: athleteUserId, display_name: athleteName },
      ],
      { onConflict: 'thread_id,user_id' }
    );
    return row;
  }

  const insertRow: Record<string, unknown> = {
    application_id: null,
    brand_user_id: brandUserId,
    athlete_user_id: athleteUserId,
    thread_kind: 'brand_outreach',
  };
  const cid = args.campaignId != null ? String(args.campaignId).trim() : '';
  if (cid) insertRow.campaign_id = cid;

  const { data: inserted, error: insErr } = await supabase
    .from('chat_threads')
    .insert(insertRow)
    .select(THREAD_SELECT)
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: again } = await supabase
        .from('chat_threads')
        .select(THREAD_SELECT)
        .eq('thread_kind', 'brand_outreach')
        .eq('brand_user_id', brandUserId)
        .eq('athlete_user_id', athleteUserId)
        .maybeSingle();
      if (again) {
        const row = mapThreadRow(again as Record<string, unknown>);
        await supabase.from('chat_participants').upsert(
          [
            { thread_id: row.id, user_id: brandUserId, display_name: 'Brand' },
            { thread_id: row.id, user_id: athleteUserId, display_name: athleteName },
          ],
          { onConflict: 'thread_id,user_id' }
        );
        return row;
      }
    }
    throw new Error(insErr.message);
  }

  const row = mapThreadRow(inserted as Record<string, unknown>);
  const { error: partErr } = await supabase.from('chat_participants').insert([
    { thread_id: row.id, user_id: brandUserId, display_name: 'Brand' },
    { thread_id: row.id, user_id: athleteUserId, display_name: athleteName },
  ]);
  if (partErr) throw new Error(partErr.message);
  return row;
}

/** Validates that thread is brand_outreach and matches the brand + athlete pair. */
export async function assertBrandOutreachThreadForPair(
  supabase: SupabaseClient,
  threadId: string,
  brandUserId: string,
  athleteUserId: string
): Promise<boolean> {
  const thread = await getThreadById(supabase, threadId);
  if (!thread) return false;
  if (thread.thread_kind !== 'brand_outreach') return false;
  return thread.brand_user_id === brandUserId && thread.athlete_user_id === athleteUserId;
}

export const APPLICATION_APPROVED_NOTICE_MARKER = '[nilink-notice:application_approved]';

export async function insertApplicationApprovedNoticeOnce(
  supabase: SupabaseClient,
  threadId: string,
  brandUserId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('thread_id', threadId)
    .eq('message_kind', 'system')
    .like('body', `${APPLICATION_APPROVED_NOTICE_MARKER}%`)
    .maybeSingle();
  if (existing) return;
  await insertMessage(
    supabase,
    threadId,
    brandUserId,
    `${APPLICATION_APPROVED_NOTICE_MARKER} Application approved — you can coordinate here.`,
    { messageKind: 'system' }
  );
}

export async function listMessagesForThread(
  supabase: SupabaseClient,
  threadId: string
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, from_user_id, body, created_at, message_kind, offer_id')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: String(m.id),
    fromUserId: String(m.from_user_id),
    body: String(m.body),
    createdAt: String(m.created_at),
    messageKind: (m.message_kind != null ? String(m.message_kind) : 'user') as ChatMessageKind,
    offerId: m.offer_id != null ? String(m.offer_id) : null,
  }));
}

export async function insertMessage(
  supabase: SupabaseClient,
  threadId: string,
  fromUserId: string,
  body: string,
  meta?: { messageKind?: ChatMessageKind; offerId?: string | null }
): Promise<ChatMessageRow> {
  const messageKind = meta?.messageKind ?? 'user';
  const row: Record<string, unknown> = {
    thread_id: threadId,
    from_user_id: fromUserId,
    body,
    message_kind: messageKind,
  };
  if (meta?.offerId != null && String(meta.offerId).trim()) {
    row.offer_id = String(meta.offerId).trim();
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(row)
    .select('id, from_user_id, body, created_at, message_kind, offer_id')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: String(data.id),
    fromUserId: String(data.from_user_id),
    body: String(data.body),
    createdAt: String(data.created_at),
    messageKind: (data.message_kind != null ? String(data.message_kind) : 'user') as ChatMessageKind,
    offerId: data.offer_id != null ? String(data.offer_id) : null,
  };
}

export async function markThreadRead(
  supabase: SupabaseClient,
  threadId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('chat_thread_read_state').upsert(
    { thread_id: threadId, user_id: userId, last_read_at: now },
    { onConflict: 'thread_id,user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function countUnreadForThread(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
  lastReadIso: string | null
): Promise<number> {
  let q = supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .neq('from_user_id', userId);
  if (lastReadIso) {
    q = q.gt('created_at', lastReadIso);
  }
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getThreadById(
  supabase: SupabaseClient,
  threadId: string
): Promise<ChatThreadRow | null> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select(THREAD_SELECT)
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapThreadRow(data as Record<string, unknown>);
}

type LastMsgView = {
  thread_id: string;
  body: string | null;
  from_user_id: string | null;
  created_at: string | null;
};

export async function loadInboxItems(
  supabase: SupabaseClient,
  userId: string,
  searchQ?: string
): Promise<ChatInboxItem[]> {
  const { data: myRows, error: pErr } = await supabase
    .from('chat_participants')
    .select('thread_id')
    .eq('user_id', userId);
  if (pErr) throw new Error(pErr.message);

  const threadIds = [...new Set((myRows ?? []).map((r) => String(r.thread_id)))];
  if (threadIds.length === 0) return [];

  const { data: readRows, error: rErr } = await supabase
    .from('chat_thread_read_state')
    .select('thread_id, last_read_at')
    .eq('user_id', userId)
    .in('thread_id', threadIds);
  if (rErr) throw new Error(rErr.message);
  const readMap = new Map<string, string | null>();
  for (const row of readRows ?? []) {
    readMap.set(String(row.thread_id), row.last_read_at != null ? String(row.last_read_at) : null);
  }

  const { data: threads, error: tErr } = await supabase
    .from('chat_threads')
    .select(THREAD_SELECT)
    .in('id', threadIds);
  if (tErr) throw new Error(tErr.message);

  const { data: allParticipants, error: apErr } = await supabase
    .from('chat_participants')
    .select('thread_id, user_id, display_name')
    .in('thread_id', threadIds);
  if (apErr) throw new Error(apErr.message);

  const { data: lastMsgs, error: lErr } = await supabase
    .from('chat_thread_last_message')
    .select('thread_id, body, from_user_id, created_at')
    .in('thread_id', threadIds);
  if (lErr) throw new Error(lErr.message);

  const lastByThread = new Map<string, LastMsgView>();
  for (const row of lastMsgs ?? []) {
    lastByThread.set(String(row.thread_id), row as LastMsgView);
  }

  const participantsByThread = new Map<string, { userId: string; displayName: string }[]>();
  for (const row of allParticipants ?? []) {
    const tid = String(row.thread_id);
    const list = participantsByThread.get(tid) ?? [];
    list.push({ userId: String(row.user_id), displayName: String(row.display_name ?? '') });
    participantsByThread.set(tid, list);
  }

  const items: ChatInboxItem[] = [];
  const qNorm = searchQ?.trim().toLowerCase();

  for (const t of threads ?? []) {
    const threadId = String(t.id);
    const applicationId = t.application_id != null ? String(t.application_id) : null;
    const rawKind = String(t.thread_kind ?? 'application_approved');
    const threadKind: ChatThreadKind =
      rawKind === 'brand_outreach' ? 'brand_outreach' : 'application_approved';
    const updatedAt = String(t.updated_at);

    const participants = participantsByThread.get(threadId) ?? [];
    const counterpart = participants.find((p) => p.userId !== userId);
    const counterpartName = counterpart?.displayName ?? 'Unknown';
    const counterpartId = counterpart?.userId ?? '';

    const last = lastByThread.get(threadId);
    const lastMessage =
      last?.body != null && last.created_at != null
        ? {
            body: String(last.body),
            createdAt: String(last.created_at),
            fromUserId: String(last.from_user_id ?? ''),
          }
        : null;

    if (qNorm) {
      const inName = counterpartName.toLowerCase().includes(qNorm);
      const inBody = (lastMessage?.body ?? '').toLowerCase().includes(qNorm);
      if (!inName && !inBody) continue;
    }

    const lr = readMap.get(threadId);
    const lastReadResolved = lr === undefined ? null : lr;
    const unreadCount = await countUnreadForThread(supabase, threadId, userId, lastReadResolved);

    items.push({
      threadId,
      applicationId,
      threadKind,
      counterpart: { userId: counterpartId, displayName: counterpartName },
      lastMessage,
      unreadCount,
      updatedAt,
    });
  }

  items.sort((a, b) => {
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return items;
}
