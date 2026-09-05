-- HarvestHub — initial migration: profiles + role-based access
-- Run this against your Supabase project (SQL Editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- profiles extends Supabase's built-in auth.users with app-specific fields.
-- One row per user, created automatically on sign-up (see trigger below).
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'customer' check (role in ('customer', 'farmer', 'admin')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Everyone can read basic profile info (needed to show a farmer's name on a
-- listing, etc.) but can only ever modify their own row.
create policy "profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Automatically create a profiles row whenever someone signs up, pulling
-- role and full_name out of the metadata passed to supabase.auth.signUp().
-- This runs with elevated privileges (security definer) specifically so the
-- client never needs direct insert access to `profiles` — closing off a
-- class of bugs where someone could otherwise self-assign role = 'admin'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Signup metadata is fully client-controlled, so 'admin' is deliberately
  -- excluded here — someone editing the signup request could otherwise pass
  -- role: 'admin' and self-promote. Admin accounts get created by directly
  -- updating this table from the Supabase dashboard (service_role access),
  -- never through the public signup flow.
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'role' in ('customer', 'farmer') then new.raw_user_meta_data ->> 'role'
      else 'customer'
    end,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
