export type ChatSessionUser = {
  id: string;
  role: 'brand' | 'athlete';
  email?: string;
};

export type ChatThreadKind = 'application_approved' | 'brand_outreach';

export type ChatMessageKind = 'user' | 'system' | 'offer';

export type ChatInboxItem = {
  threadId: string;
  applicationId: string | null;
  threadKind: ChatThreadKind;
  counterpart: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    sport?: string;
    school?: string;
    verified?: boolean;
  };
  lastMessage: { body: string; createdAt: string; fromUserId: string } | null;
  unreadCount: number;
  updatedAt: string;
};

export type ChatMessageRow = {
  id: string;
  fromUserId: string;
  body: string;
  createdAt: string;
  messageKind?: ChatMessageKind;
  offerId?: string | null;
};

export type ChatThreadRow = {
  id: string;
  application_id: string | null;
  brand_user_id: string;
  athlete_user_id: string;
  thread_kind: ChatThreadKind;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
};
