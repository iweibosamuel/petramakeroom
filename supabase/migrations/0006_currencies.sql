-- Give in naira, US dollars, pounds or euros.
--
-- A pledge is made in one currency. Its amount, amount_paid, its
-- installments' amounts and (for group seeds) group_members'
-- committed_amount_naira are all in that currency — the old "_naira" column
-- name is kept so nothing has to be renamed.
--
-- ngn_rate is the naira value of 1 unit of the currency, taken from the live
-- exchange rate when the pledge was made and never changed afterwards.
-- amount_naira and units stay in naira (amount × ngn_rate), so the ₦1bn
-- progress and the Centurion ₦10m minimum work the same for every currency.
--
-- Existing pledges are all naira: currency NGN, rate 1, amount = amount_naira.

alter table pledges
  add column currency text not null default 'NGN'
    check (currency in ('NGN', 'USD', 'GBP', 'EUR')),
  add column amount numeric,
  add column ngn_rate numeric not null default 1 check (ngn_rate > 0);

update pledges set amount = amount_naira where amount is null;

alter table pledges alter column amount set not null;
alter table pledges add constraint pledges_amount_positive check (amount > 0);
