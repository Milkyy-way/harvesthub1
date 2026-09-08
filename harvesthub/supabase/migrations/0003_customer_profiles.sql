-- HarvestHub — customer profile data (delivery address + preferences).
-- One row per customer, inserted in full by handle_new_user() at signup
-- time (see 0005) — customers never need an authenticated follow-up step,
-- unlike farmers whose verification documents require a logged-in session.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists customer_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  address_street text not null,
  address_city text not null,
  address_state text not null,
  address_zip text not null check (address_zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  dietary_preferences text[] not null default '{}'
    check (dietary_preferences <@ array['organic', 'local_only', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[]),
  produce_interests text[] not null default '{}'
    check (produce_interests <@ array['vegetables', 'fruits', 'eggs', 'dairy', 'meat', 'herbs', 'flowers', 'honey']::text[]),
  referral_source text
    check (referral_source is null or referral_source in ('friend', 'social_media', 'search', 'market_event', 'other')),
  referral_source_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customer_profiles enable row level security;

-- Unlike profiles, there is no "viewable by everyone" policy here — address
-- and dietary data are private, not something farmers or other customers
-- need to read.
drop policy if exists "customers can view their own customer profile" on customer_profiles;
create policy "customers can view their own customer profile"
  on customer_profiles for select
  using (auth.uid() = id);

drop policy if exists "customers can update their own customer profile" on customer_profiles;
create policy "customers can update their own customer profile"
  on customer_profiles for update
  using (auth.uid() = id);

drop trigger if exists customer_profiles_set_updated_at on customer_profiles;
create trigger customer_profiles_set_updated_at
  before update on customer_profiles
  for each row execute procedure public.set_updated_at();
