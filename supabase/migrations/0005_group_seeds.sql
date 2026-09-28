-- Simpler groups: one seed given together by several people.
--
-- The organiser lists everyone giving and each person's share. The seed is a
-- single pledge with kind 'group' that anyone in the group can pay. There are
-- no invite links or email confirmations any more; members are just a record
-- of who is giving together (and who gets an email about their share).
--
-- 'group_member' pledges from the old join-link flow stay valid.

alter table group_members
  add column is_organizer boolean not null default false;

alter table pledges drop constraint pledges_kind_check;
alter table pledges
  add constraint pledges_kind_check
    check (kind in ('individual', 'group', 'group_member'));

-- Centurion seeds (individual or group) start at ₦10,000,000.
alter table pledges drop constraint pledges_centurion_minimum;
alter table pledges
  add constraint pledges_centurion_minimum
    check (tier <> 'centurion' or kind = 'group_member' or amount_naira >= 10000000);
