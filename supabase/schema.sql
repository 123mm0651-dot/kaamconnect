-- KaamConnect database schema for Supabase (PostgreSQL)
-- Run this file in Supabase SQL Editor.
-- Never expose the service_role key in browser code.

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'provider', 'admin');
create type public.booking_status as enum ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');
create type public.provider_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  description text,
  starting_price numeric(10,2) check (starting_price is null or starting_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.provider_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  city text not null,
  area text,
  bio text,
  experience_years integer not null default 0 check (experience_years between 0 and 60),
  status public.provider_status not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid references public.provider_profiles(id) on delete set null,
  service_id uuid references public.services(id) on delete restrict,
  service_name text not null,
  customer_name text not null,
  customer_phone text not null,
  service_area text not null,
  preferred_time text not null,
  notes text,
  status public.booking_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_customer_created_idx on public.bookings(customer_id, created_at desc);
create index bookings_provider_created_idx on public.bookings(provider_id, created_at desc);
create index provider_profiles_status_city_idx on public.provider_profiles(status, city);

-- New auth users receive a customer profile. Role is deliberately not read
-- from user-editable metadata; only an administrator can grant admin role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger provider_profiles_updated_at before update on public.provider_profiles
for each row execute procedure public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
for each row execute procedure public.set_updated_at();

-- Helper checks the trusted role stored in profiles.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.bookings enable row level security;

-- Profiles: users can read/update their own profile; admins can read all.
create policy "profiles_select_own_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.is_admin())
with check (
  public.is_admin()
  or (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())))
);

-- Public catalog is readable; only admins can manage it.
create policy "services_read_active" on public.services
for select to anon, authenticated
using (active or public.is_admin());
create policy "services_admin_manage" on public.services
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Public can see approved provider listings. Providers manage their own application.
create policy "providers_read_approved_or_own" on public.provider_profiles
for select to anon, authenticated
using (status = 'approved' or id = (select auth.uid()) or public.is_admin());
create policy "providers_insert_own" on public.provider_profiles
for insert to authenticated
with check (id = (select auth.uid()) and status = 'pending');
create policy "providers_update_own_pending" on public.provider_profiles
for update to authenticated
using (id = (select auth.uid()) and status = 'pending')
with check (id = (select auth.uid()) and status = 'pending');
create policy "providers_admin_manage" on public.provider_profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Customers create/read their own bookings. Assigned providers see their jobs.
create policy "bookings_customer_create" on public.bookings
for insert to authenticated
with check (customer_id = (select auth.uid()) and status = 'requested' and provider_id is null);
create policy "bookings_read_participants_or_admin" on public.bookings
for select to authenticated
using (
  customer_id = (select auth.uid())
  or provider_id = (select auth.uid())
  or public.is_admin()
);
create policy "bookings_customer_cancel_requested" on public.bookings
for update to authenticated
using (customer_id = (select auth.uid()) and status = 'requested')
with check (customer_id = (select auth.uid()) and status in ('requested', 'cancelled'));
create policy "bookings_provider_update_assigned" on public.bookings
for update to authenticated
using (provider_id = (select auth.uid()))
with check (provider_id = (select auth.uid()) and status in ('accepted', 'in_progress', 'completed', 'cancelled'));
create policy "bookings_admin_manage" on public.bookings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.provider_profiles to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant insert, update, delete on public.services to authenticated;
