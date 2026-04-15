import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { dealContractToJSON } from '@/lib/campaigns/serialization';
import {
  createContractPlaceholderForDeal,
  getDealByIdForUser,
} from '@/lib/campaigns/deals/repository';
import { insertMessage } from '@/lib/chat/service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');
  if (session.role !== 'brand') return jsonError(403, 'Forbidden');

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      body = raw as Record<string, unknown>;
    }
  } catch {
    body = {};
  }
  const fileRef = typeof body.fileRef === 'string' ? body.fileRef : undefined;
  const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl : undefined;

  const { id: dealId } = await context.params;
  const result = await createContractPlaceholderForDeal(dealId, session.id, fileRef, fileUrl);
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }

  try {
    const dealResult = await getDealByIdForUser(dealId, session.id, session.role);
    if (dealResult.ok && dealResult.deal.chatThreadId) {
      await insertMessage(
        supabase,
        dealResult.deal.chatThreadId,
        session.id,
        'Contract is ready for review. Please confirm and accept it in Deals.',
        { messageKind: 'system' }
      );
    }
  } catch (e) {
    console.error('Failed to post contract-ready notification message', e);
  }

  return NextResponse.json({ contract: dealContractToJSON(result.contract) });
}
