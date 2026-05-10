create table if not exists public.deal_contracts (
  id            uuid default gen_random_uuid() primary key,
  deal_id       uuid not null references public.deals(id) on delete cascade,
  file_url      text,
  status        text not null check (status in (
                  'not_added','uploaded','sent_for_signature','signed'
                )) default 'not_added',
  signed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists idx_deal_contracts_deal_unique on public.deal_contracts(deal_id);
drop trigger if exists on_deal_contract_updated on public.deal_contracts;
create trigger on_deal_contract_updated before update on public.deal_contracts for each row execute function public.handle_updated_at();

create table if not exists public.deal_payments (
  id                  uuid default gen_random_uuid() primary key,
  deal_id             uuid not null references public.deals(id) on delete cascade,
  amount              bigint not null default 0,
  currency            text not null default 'USD',
  status              text not null check (status in (
                        'not_configured','awaiting_setup','pending',
                        'ready_to_release','paid','failed','manual'
                      )) default 'not_configured',
  provider            text not null default '',
  provider_reference  text not null default '',
  release_condition   text not null default 'on_completion',
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists idx_deal_payments_deal_unique on public.deal_payments(deal_id);
drop trigger if exists on_deal_payment_updated on public.deal_payments;
create trigger on_deal_payment_updated before update on public.deal_payments for each row execute function public.handle_updated_at();

alter table public.deals drop constraint if exists deals_contract_id_fkey;
alter table public.deals add constraint deals_contract_id_fkey foreign key (contract_id) references public.deal_contracts(id) on delete set null;
alter table public.deals drop constraint if exists deals_payment_id_fkey;
alter table public.deals add constraint deals_payment_id_fkey foreign key (payment_id) references public.deal_payments(id) on delete set null;

alter table public.deal_contracts enable row level security;
alter table public.deal_payments  enable row level security;

drop policy if exists "Participants read deal contracts" on public.deal_contracts;
create policy "Participants read deal contracts" on public.deal_contracts for select using (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)));
drop policy if exists "Participants write deal contracts" on public.deal_contracts;
create policy "Participants write deal contracts" on public.deal_contracts for all using (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id))) with check (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)));

drop policy if exists "Participants read deal payments" on public.deal_payments;
create policy "Participants read deal payments" on public.deal_payments for select using (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)));
drop policy if exists "Participants write deal payments" on public.deal_payments;
create policy "Participants write deal payments" on public.deal_payments for all using (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id))) with check (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) = d.brand_id or (select auth.uid()) = d.athlete_id)));

drop policy if exists "Participants update own deals" on public.deals;
create policy "Participants update own deals" on public.deals for update using ((select auth.uid()) = brand_id or (select auth.uid()) = athlete_id) with check ((select auth.uid()) = brand_id or (select auth.uid()) = athlete_id);
;
