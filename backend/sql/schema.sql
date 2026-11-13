-- Run once against the Render PostgreSQL database using a secure SQL client.
create extension if not exists pgcrypto;
create table if not exists users (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 email text not null unique,
 password_hash text not null,
 phone text,
 role text not null default 'customer' check (role in ('customer','provider','admin')),
 created_at timestamptz not null default now()
);
create table if not exists services (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 category text not null,
 description text,
 starting_price numeric(10,2) check(starting_price is null or starting_price>=0),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists providers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references users(id) on delete cascade,
 service_id uuid references services(id) on delete set null,
 service_name text not null,
 city text not null,
 area text,
 bio text,
 experience_years integer not null default 0 check(experience_years between 0 and 60),
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 reviewed_at timestamptz,
 reviewed_by uuid references users(id),
 created_at timestamptz not null default now()
);
create table if not exists bookings (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references users(id),
 provider_id uuid references providers(id) on delete set null,
 service_id uuid references services(id) on delete set null,
 service_name text not null,
 customer_name text not null,
 customer_phone text not null,
 service_area text not null,
 preferred_time text not null,
 notes text,
 status text not null default 'requested' check(status in ('requested','accepted','in_progress','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists bookings_customer_idx on bookings(customer_id,created_at desc);
create index if not exists bookings_provider_idx on bookings(provider_id,created_at desc);
create index if not exists providers_city_status_idx on providers(city,status);
insert into services(name,category,description,starting_price) values
('Home deep cleaning','Cleaning','Kitchen, bathroom and full-home cleaning',799),
('Plumbing services','Home repair','Leaking taps, drains and fittings',199),
('Electrical work','Home repair','Fans, switches and household electrical repairs',249),
('AC service & repair','Electronics','AC servicing and installation',499),
('Appliance & electronics repair','Electronics','TV, washing machine and refrigerator repair',199),
('Car repair & service','Vehicle','Routine maintenance and diagnostics',599),
('Bike & scooter service','Vehicle','Two-wheeler servicing and repairs',299),
('Pest control','Home care','Household pest control services',699)
on conflict(name) do nothing;
