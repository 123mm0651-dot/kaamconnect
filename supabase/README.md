# KaamConnect backend (Supabase)

This folder contains the initial production-oriented database foundation for KaamConnect. The current GitHub Pages website is still a frontend demo until a Supabase project is created and its public project URL/key are configured in the site.

## Backend included

- Supabase PostgreSQL schema for profiles, services, professional applications and bookings
- Supabase Auth user-profile trigger
- Customer, provider and admin roles
- Row Level Security (RLS) policies for all tables
- Public read access only to active services and approved professional listings
- Customers can create and view their own bookings; assigned professionals can view their jobs; admins can manage marketplace records

## 1. Create a Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Choose a strong database password and save it securely.
3. Wait for the database to finish provisioning.

## 2. Create the database tables and policies

1. Open **SQL Editor** in your Supabase project.
2. Open this repository's `supabase/schema.sql`.
3. Copy the complete SQL into a new query and run it.
4. Check the Table Editor for `profiles`, `services`, `provider_profiles`, and `bookings`.

The SQL creates an initial empty service catalog. Add service rows through the Supabase dashboard before enabling booking flows.

## 3. Configure the frontend safely

The site is hosted as static files on GitHub Pages. It cannot safely hold a database secret or server-side environment variable.

1. In Supabase, open **Project Settings → API** (or **Data API**) and copy the Project URL and anon/publishable key.
2. Copy `supabase-config.example.js` to `supabase-config.js`.
3. Put the Project URL and anon/publishable key in that file.
4. Keep `supabase-config.js` untracked. It is ignored by Git.
5. Do not use the service_role/secret key in the browser or commit it to GitHub.

The frontend still needs its authentication and data-access screens wired to this project; the current forms and dashboards remain demo/local-browser behavior until that integration is completed.

## 4. First admin account

New accounts are created as `customer`. Do not allow users to select their own admin role. After creating your own account, grant admin role from the Supabase SQL Editor as the project owner:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_AUTH_USER_UUID';
```

Find the UUID in **Authentication → Users**. Never expose database owner credentials or the service_role key.

## 5. Initial service catalog example

Run in SQL Editor and adjust the names/prices for your launch area:

```sql
insert into public.services (name, category, description, starting_price) values
('Home deep cleaning', 'Cleaning', 'Kitchen, bathroom and full-home cleaning', 799),
('Plumbing services', 'Home repair', 'Leaking taps, drains and fittings', 199),
('Electrical work', 'Home repair', 'Fans, switches and household electrical repairs', 249),
('AC service & repair', 'Electronics', 'AC servicing and installation', 499),
('Appliance & electronics repair', 'Electronics', 'TV, washing machine and refrigerator repair', 199),
('Car repair & service', 'Vehicle', 'Routine maintenance and diagnostics', 599),
('Bike & scooter service', 'Vehicle', 'Two-wheeler servicing and repairs', 299),
('Pest control', 'Personal', 'Household pest control services', 699)
on conflict (name) do nothing;
```

## Security notes and next implementation step

- RLS is enabled on every application table.
- Admin privileges are stored in the protected `profiles.role` column, not user-editable signup metadata.
- The anon/publishable key is designed for browser use only when RLS is correctly configured.
- Do not store payment card data in this database.
- Before public launch, add email/phone verification, rate limiting/abuse controls, audit logging, backups, and security review.
- Next coding step: wire the existing booking/provider forms and dashboards to Supabase Auth and the tables above, replacing localStorage demo storage. Then test customer/provider/admin permissions using separate accounts.
