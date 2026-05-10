create table if not exists public.deals (
  id                  uuid default gen_random_uuid() primary key,
  offer_id            uuid not null unique references public.offers(id) on delete restrict,
  brand_id            uuid not null references public.profiles(id) on delete cascade,
  athlete_id          uuid not null references public.profiles(id) on delete cascade,
  campaign_id         uuid references public.campaigns(id)    on delete set null,
  application_id      uuid references public.applications(id) on delete set null,
  chat_thread_id      uuid,
  terms_snapshot      jsonb not null,
  status              text not null check (status in (
                        'created','contract_pending','active',
                        'submission_in_progress','under_review',
                        'revision_requested','approved_completed',
                        'payment_pending','paid','closed',
                        'cancelled','disputed'
                      )) default 'created',
  contract_id         uuid,
  payment_id          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_deals_brand_updated
  on public.deals(brand_id, updated_at desc);
create index if not exists idx_deals_athlete_updated
  on public.deals(athlete_id, updated_at desc);
create index if not exists idx_deals_brand_status
  on public.deals(brand_id, status, updated_at desc)
  where status not in ('closed','cancelled','disputed');

drop trigger if exists on_deal_updated on public.deals;
create trigger on_deal_updated
  before update on public.deals
  for each row execute function public.handle_updated_at();

create or replace function public.deals_block_terms_snapshot_change()
returns trigger
language plpgsql
as $$
begin
  if old.terms_snapshot is distinct from new.terms_snapshot then
    raise exception 'deals.terms_snapshot is immutable after deal creation';
  end if;
  return new;
end;
$$;

drop trigger if exists on_deal_terms_immutable on public.deals;
create trigger on_deal_terms_immutable
  before update on public.deals
  for each row execute function public.deals_block_terms_snapshot_change();

alter table public.deals enable row level security;

drop policy if exists "Brands read own deals" on public.deals;
create policy "Brands read own deals"
  on public.deals for select
  using ((select auth.uid()) = brand_id);

drop policy if exists "Athletes read own deals" on public.deals;
create policy "Athletes read own deals"
  on public.deals for select
  using ((select auth.uid()) = athlete_id);
;
