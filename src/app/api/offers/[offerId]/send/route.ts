import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/campaigns/getAuthUser';
import { sendOfferDraftByBrand } from '@/lib/campaigns/repository';
import { offerToJSON } from '@/lib/campaigns/serialization';
import { jsonError } from '@/lib/api/jsonError';

type RouteContext = { params: Promise<{ offerId: string }> };

/** Brand: publish draft offer to the athlete (`draft` → `sent`). */
export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) return jsonError(401, 'Unauthorized');
  if (user.role !== 'brand') return jsonError(403, 'Forbidden');

  const { offerId } = await context.params;
  if (!offerId) return jsonError(400, 'Missing offerId');

  try {
    const sent = await sendOfferDraftByBrand(offerId, user.userId);
    if (!sent) return jsonError(404, 'Offer not found');
    return NextResponse.json({ offer: offerToJSON(sent) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Send failed';
    return jsonError(400, msg);
  }
}
