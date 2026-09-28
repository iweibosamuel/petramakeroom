-- Giving tiers (Burden Bearer / Centurion) and donor profile fields.
--
-- Every flow now collects phone, location, whether the giver is a Petra
-- member, and (if so) which campus they attend. Existing rows predate tiers
-- and are backfilled as Burden Bearer. The new profile columns stay nullable
-- so older rows remain valid; the app requires them for new gifts.

alter table pledges
  add column tier text not null default 'burden_bearer'
    check (tier in ('burden_bearer', 'centurion')),
  add column location text,
  add column is_petra_member boolean,
  add column campus text;

alter table groups
  add column tier text not null default 'burden_bearer'
    check (tier in ('burden_bearer', 'centurion')),
  add column organizer_phone text,
  add column organizer_location text,
  add column organizer_is_petra_member boolean,
  add column organizer_campus text;

alter table group_members
  add column location text,
  add column is_petra_member boolean,
  add column campus text;

-- Centurion gifts start at ₦10,000,000.
alter table pledges
  add constraint pledges_centurion_minimum
    check (tier <> 'centurion' or kind <> 'individual' or amount_naira >= 10000000);

alter table groups
  add constraint groups_centurion_minimum
    check (tier <> 'centurion' or total_units >= 10);
