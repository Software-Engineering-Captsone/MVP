import { NextRequest, NextResponse } from 'next/server';
import { getChatSessionUser } from '@/lib/chat/session';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/jsonError';
import { dealContractToJSON, dealToJSON } from '@/lib/campaigns/serialization';
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/campaigns/deals/types';
import { patchContractStatusForUser } from '@/lib/campaigns/deals/repository';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set<string>(CONTRACT_STATUSES);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const session = await getChatSessionUser(supabase);
  if (!session) return jsonError(401, 'Unauthorized');

  const { id: contractId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!status || !ALLOWED.has(status)) {
    return jsonError(400, 'Invalid contract status');
  }

  const result = await patchContractStatusForUser(
    contractId,
    session.id,
    session.role,
    status as ContractStatus
  );
  if (!result.ok) {
    return jsonError(result.status, result.error);
  }
  return NextResponse.json({
    contract: dealContractToJSON(result.contract),
    ...(result.deal ? { deal: dealToJSON(result.deal) } : {}),
  });
}
