drop policy if exists "Athletes create own deals on offer accept" on public.deals;
create policy "Athletes create own deals on offer accept"
  on public.deals for insert
  with check (
    (select auth.uid()) = athlete_id
    and exists (
      select 1 from public.offers o
      where o.id = offer_id
        and o.athlete_id = (select auth.uid())
        and o.status = 'sent'
    )
  );;
