-- Petra "Make Room" giving platform schema.
--
-- Security model: there is no login/auth system in this MVP. Group members
-- are identified by an invite link (group id) and a confirmation token
-- (group_members.confirmation_token), not a signed-in session. RLS below is
-- therefore permissive (anyone with the anon key can read/write) rather than
-- keyed to auth.uid(). This matches "share a link, anyone with the link can
-- see/join" — the same trust model as a shared Google Doc link. If stronger
-- per-person access control is needed later (e.g. only the person who made a
-- pledge can edit it), add Supabase Auth and tighten these policies.

create extension if not exists "pgcrypto";

create table campaigns (
  id text primary key,
  title text not null,
  description text not null default '',
  goal_naira bigint not null,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references campaigns(id),
  organizer_name text not null,
  organizer_email text not null,
  total_units numeric not null check (total_units > 0),
  deadline date not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  committed_amount_naira bigint not null check (committed_amount_naira > 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  confirmation_token uuid not null default gen_random_uuid(),
  pledge_id uuid,
  created_at timestamptz not null default now()
);

create table pledges (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references campaigns(id),
  kind text not null check (kind in ('individual', 'group_member')),
  group_id uuid references groups(id) on delete cascade,
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  units numeric not null check (units > 0),
  amount_naira bigint not null check (amount_naira > 0),
  deadline date not null,
  payment_plan_type text not null check (payment_plan_type in ('full', 'installments')),
  amount_paid bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table group_members
  add constraint group_members_pledge_id_fkey
  foreign key (pledge_id) references pledges(id);

create table installments (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null references pledges(id) on delete cascade,
  amount bigint not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);

create index pledges_campaign_id_idx on pledges(campaign_id);
create index pledges_group_id_idx on pledges(group_id);
create index installments_pledge_id_idx on installments(pledge_id);
create index group_members_group_id_idx on group_members(group_id);
create index group_members_confirmation_token_idx on group_members(confirmation_token);
create index groups_invite_code_idx on groups(invite_code);

-- Atomic "mark installment paid" increment, called from the app after
-- flipping the installment's own status to 'paid'.
create or replace function increment_pledge_amount_paid(p_pledge_id uuid, p_amount bigint)
returns void
language sql
as $$
  update pledges set amount_paid = amount_paid + p_amount where id = p_pledge_id;
$$;

grant execute on function increment_pledge_amount_paid(uuid, bigint) to anon, authenticated;

-- Seed the one campaign this site currently runs.
insert into campaigns (id, title, description, goal_naira)
values (
  'make-room-2026',
  'Make Room — Lagos x Abuja',
  'Help us clear ground, make room, and welcome the multitudes God is bringing across Lagos and Abuja.',
  1000000000
);

alter table campaigns enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table pledges enable row level security;
alter table installments enable row level security;

create policy "campaigns are publicly readable" on campaigns
  for select using (true);

create policy "groups are publicly readable" on groups
  for select using (true);
create policy "anyone can create a group" on groups
  for insert with check (true);

create policy "group members are publicly readable" on group_members
  for select using (true);
create policy "anyone can join a group" on group_members
  for insert with check (true);
create policy "group members can be updated (confirm/link pledge)" on group_members
  for update using (true);

create policy "pledges are publicly readable" on pledges
  for select using (true);
create policy "anyone can create a pledge" on pledges
  for insert with check (true);

create policy "installments are publicly readable" on installments
  for select using (true);
create policy "anyone can create installments" on installments
  for insert with check (true);
create policy "installments can be marked paid" on installments
  for update using (true);
