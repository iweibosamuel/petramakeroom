-- Fix: pledges.amount_paid never updated when a payment was confirmed.
--
-- increment_pledge_amount_paid ran with the caller's (anon) permissions, and
-- RLS has no UPDATE policy on pledges, so the update silently matched zero
-- rows. It now runs as the function owner (security definer) and, rather than
-- adding whatever amount the caller passes, recalculates amount_paid from the
-- pledge's paid installments — so it can't be used to set an arbitrary total
-- and is safe to call more than once. The signature is unchanged, so the app
-- doesn't need updating; p_amount is ignored.

create or replace function increment_pledge_amount_paid(p_pledge_id uuid, p_amount bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update pledges
  set amount_paid = (
    select coalesce(sum(amount), 0)
    from installments
    where pledge_id = p_pledge_id and status = 'paid'
  )
  where id = p_pledge_id;
$$;

grant execute on function increment_pledge_amount_paid(uuid, bigint) to anon, authenticated;

-- Repair any pledges whose payments were confirmed before this fix.
update pledges p
set amount_paid = coalesce(
  (select sum(i.amount) from installments i where i.pledge_id = p.id and i.status = 'paid'),
  0
);
