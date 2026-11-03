begin;
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create unique index organizations_owner_name on public.organizations(owner_id, lower(btrim(name)));
create table public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  amount numeric(12,2) not null check (amount >= 0 and amount <= 1000000),
  paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index members_organization on public.members(organization_id);
alter table public.organizations enable row level security;
alter table public.members enable row level security;
revoke all on public.organizations, public.members from anon, authenticated;
grant select, insert on public.organizations to authenticated;
grant select, insert, delete on public.members to authenticated;
grant update (paid) on public.members to authenticated;
create policy organization_read on public.organizations for select to authenticated
  using (owner_id = (select auth.uid()));
create policy organization_create on public.organizations for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy member_access on public.members for all to authenticated
  using (exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid())));
commit;
