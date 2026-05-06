import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ctx, makeUserClient } from '../../../../tests/integration/setup';

// Route handlers call createClient() per request. We intercept the module so
// every call returns whichever client the test currently impersonates.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ctx.client,
}));

const PASSWORD = 'TestPassword!2026';
const stamp = Date.now();
const BRAND_EMAIL = `it-brand-${stamp}@nilink.test`;
const ATHLETE_EMAIL = `it-athlete-${stamp}@nilink.test`;

let brandId = '';
let athleteId = '';
let brandClient: SupabaseClient;
let athleteClient: SupabaseClient;
let campaignId = '';
let applicationId = '';

async function createConfirmedUser(email: string): Promise<string> {
  // @ts-expect-error admin namespace exists on service-role client at runtime
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data?.user) throw new Error(`createUser(${email}) failed: ${error?.message}`);
  return data.user.id;
}

async function deleteUser(userId: string) {
  // @ts-expect-error admin namespace
  await adminClient.auth.admin.deleteUser(userId).catch(() => undefined);
}

describe('deal flow integration: brand approve → offer send → athlete accept', () => {
  beforeAll(async () => {
    brandId = await createConfirmedUser(BRAND_EMAIL);
    athleteId = await createConfirmedUser(ATHLETE_EMAIL);

    // handle_new_user trigger likely created profile rows from auth.users.
    // Force role + email/full_name explicitly via update so we don't depend on metadata.
    const { error: brandProfErr } = await adminClient
      .from('profiles')
      .upsert(
        { id: brandId, email: BRAND_EMAIL, full_name: 'IT Brand', role: 'brand' },
        { onConflict: 'id' },
      );
    if (brandProfErr) throw new Error(`brand profile upsert: ${brandProfErr.message}`);
    const { error: athProfErr } = await adminClient
      .from('profiles')
      .upsert(
        { id: athleteId, email: ATHLETE_EMAIL, full_name: 'IT Athlete', role: 'athlete' },
        { onConflict: 'id' },
      );
    if (athProfErr) throw new Error(`athlete profile upsert: ${athProfErr.message}`);
    const completedAt = new Date().toISOString();
    await adminClient
      .from('profiles')
      .update({ role: 'brand', onboarding_completed_at: completedAt })
      .eq('id', brandId);
    await adminClient
      .from('profiles')
      .update({ role: 'athlete', onboarding_completed_at: completedAt })
      .eq('id', athleteId);

    const { error: bpErr } = await adminClient
      .from('brand_profiles')
      .upsert({ brand_id: brandId, company_name: 'IT Brand Co', industry: 'Other' });
    if (bpErr) throw new Error(`brand_profiles insert failed: ${bpErr.message}`);

    const { data: camp, error: campErr } = await adminClient
      .from('campaigns')
      .insert({
        brand_id: brandId,
        name: `IT Campaign ${stamp}`,
        status: 'Open for Applications',
        visibility: 'Public',
        accept_applications: true,
      })
      .select('id')
      .single();
    if (campErr || !camp) throw new Error(`campaign insert failed: ${campErr?.message}`);
    campaignId = camp.id as string;

    const { data: app, error: appErr } = await adminClient
      .from('applications')
      .insert({
        campaign_id: campaignId,
        athlete_id: athleteId,
        status: 'pending',
        pitch: 'integration test pitch',
        athlete_snapshot: { fullName: 'IT Athlete' },
      })
      .select('id')
      .single();
    if (appErr || !app) throw new Error(`application insert failed: ${appErr?.message}`);
    applicationId = app.id as string;

    brandClient = await makeUserClient(BRAND_EMAIL, PASSWORD);
    athleteClient = await makeUserClient(ATHLETE_EMAIL, PASSWORD);
  }, 60_000);

  afterAll(async () => {
    if (campaignId) {
      const { data: deals } = await adminClient.from('deals').select('id').eq('campaign_id', campaignId);
      const dealIds = (deals ?? []).map((d: { id: string }) => d.id);
      if (dealIds.length > 0) {
        await adminClient.from('deal_deliverables').delete().in('deal_id', dealIds);
        await adminClient.from('deal_activities').delete().in('deal_id', dealIds).then(() => undefined, () => undefined);
        await adminClient.from('deal_payments').delete().in('deal_id', dealIds);
        await adminClient.from('deals').delete().in('id', dealIds);
      }
      await adminClient.from('offers').delete().eq('campaign_id', campaignId);
      await adminClient.from('applications').delete().eq('campaign_id', campaignId);
      await adminClient.from('campaigns').delete().eq('id', campaignId);
    }
    if (brandId) await deleteUser(brandId);
    if (athleteId) await deleteUser(athleteId);
  }, 60_000);

  it('drives the full path and lands a deal with payment', async () => {
    ctx.client = brandClient;
    const { PATCH: patchApp } = await import('@/app/api/applications/[id]/route');
    const approveRes = await patchApp(
      new Request('http://test/api/applications/' + applicationId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      }) as never,
      { params: Promise.resolve({ id: applicationId }) },
    );
    expect(approveRes.status).toBe(200);

    const { POST: postCampaignOffers } = await import('@/app/api/campaigns/[id]/offers/route');
    const draftRes = await postCampaignOffers(
      new Request('http://test/api/campaigns/' + campaignId + '/offers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ applicationIds: [applicationId] }),
      }) as never,
      { params: Promise.resolve({ id: campaignId }) },
    );
    if (draftRes.status !== 200) {
      const errBody = await draftRes.clone().json().catch(() => ({}));
      const { data: dbg } = await adminClient
        .from('profiles')
        .select('id, email, role')
        .in('id', [brandId, athleteId]);
      throw new Error(
        `draft offer POST got ${draftRes.status}: ${JSON.stringify(errBody)} | profiles=${JSON.stringify(dbg)}`,
      );
    }
    const draftJson = (await draftRes.json()) as { offers: Array<{ id: string }> };
    expect(draftJson.offers).toHaveLength(1);
    const offerId = draftJson.offers[0].id;

    const { POST: postSend } = await import('@/app/api/offers/[offerId]/send/route');
    const sendRes = await postSend(
      new Request('http://test/api/offers/' + offerId + '/send', { method: 'POST' }) as never,
      { params: Promise.resolve({ offerId }) },
    );
    expect(sendRes.status).toBe(200);

    ctx.client = athleteClient;
    const { POST: postAccept } = await import('@/app/api/offers/[offerId]/accept/route');
    const acceptRes = await postAccept(
      new Request('http://test/api/offers/' + offerId + '/accept', { method: 'POST' }) as never,
      { params: Promise.resolve({ offerId }) },
    );
    expect([200, 201]).toContain(acceptRes.status);
    const acceptJson = (await acceptRes.json()) as {
      ok: boolean;
      dealId: string;
      paymentId?: string;
    };
    expect(acceptJson.ok).toBe(true);
    expect(acceptJson.dealId).toBeTruthy();
    expect(acceptJson.paymentId).toBeTruthy();

    const { data: deal } = await adminClient
      .from('deals')
      .select('id, status, offer_id, payment_id')
      .eq('id', acceptJson.dealId)
      .single();
    expect(deal?.offer_id).toBe(offerId);
    expect(deal?.payment_id).toBe(acceptJson.paymentId);

    const { data: pay } = await adminClient
      .from('deal_payments')
      .select('id, deal_id')
      .eq('id', acceptJson.paymentId!)
      .single();
    expect(pay?.deal_id).toBe(acceptJson.dealId);

    const { data: offer } = await adminClient
      .from('offers')
      .select('status, deal_id')
      .eq('id', offerId)
      .single();
    expect(offer?.status).toBe('accepted');
    expect(offer?.deal_id).toBe(acceptJson.dealId);
  }, 60_000);
});
