export type ChatApiInfraError = {
  status: number;
  body: {
    error: string;
    errorCode: 'CHAT_SCHEMA_NOT_READY' | 'CHAT_SERVICE_UNAVAILABLE';
    hint?: string;
  };
};

function isSchemaErrorMessage(msg: string): boolean {
  return (
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist') && msg.includes('chat_'))
  );
}

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

export function isChatSchemaNotReadyError(error: unknown): boolean {
  return isSchemaErrorMessage(messageFromUnknown(error).toLowerCase());
}

/**
 * Maps infrastructure-level chat errors into stable API responses.
 * This prevents raw DB/PostgREST internals from leaking to users.
 */
export function mapChatInfraError(error: unknown): ChatApiInfraError | null {
  const msg = messageFromUnknown(error).toLowerCase();
  const missingSchema = isSchemaErrorMessage(msg);

  if (missingSchema) {
    return {
      status: 503,
      body: {
        error: 'Messaging setup is still in progress. Please try again shortly.',
        errorCode: 'CHAT_SCHEMA_NOT_READY',
        hint: 'Apply the chat Supabase migration before using inbox features.',
      },
    };
  }

  const unavailable =
    msg.includes('connection refused') ||
    msg.includes('timeout') ||
    msg.includes('temporarily unavailable');
  if (unavailable) {
    return {
      status: 503,
      body: {
        error: 'Messaging is temporarily unavailable. Please retry in a moment.',
        errorCode: 'CHAT_SERVICE_UNAVAILABLE',
      },
    };
  }

  return null;
}
