-- HarvestHub — farmer business details + verification packet.
--
-- farmer_profiles and farmer_verification are created as near-empty stubs by
-- the signup trigger (see 0005) the instant the farmer's auth account
-- exists, then filled in via authenticated UPDATEs during the in-app
-- onboarding wizard — because verification file uploads need auth.uid(),
-- which only exists after the farmer confirms their email and logs in.
-- This is also why most columns below stay nullable at the DB level:
-- "required" is enforced client-side (zod) and in submit_farmer_verification()
-- (see 0007) before the farmer is allowed to submit.

create table if not exists farmer_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  farm_name text not null,
  address_street text,
  address_city text,
  address_state text,
  address_zip text check (address_zip is null or address_zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  farm_types text[] not null default '{}'
    check (farm_types <@ array['produce', 'dairy', 'livestock']::text[]),
  years_in_operation integer check (years_in_operation is null or years_in_operation between 0 and 150),
  -- Sensitive: no public/select-all policy touches this table at all, so
  -- this is "admin-only visible" purely by virtue of the self-only RLS
  -- policy below plus Supabase Studio's dashboard access bypassing RLS.
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table farmer_profiles enable row level security;

create policy "farmers can view their own farm profile"
  on farmer_profiles for select
  using (auth.uid() = id);

create policy "farmers can update their own farm profile"
  on farmer_profiles for update
  using (auth.uid() = id);

create trigger farmer_profiles_set_updated_at
  before update on farmer_profiles
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------

create table if not exists farmer_verification (
  id uuid primary key references profiles (id) on delete cascade,
  business_license_number text,
  business_license_file_path text,
  insurance_file_path text,
  insurance_expiration_date date,
  food_safety_cert_file_path text, -- optional, "if applicable"
  gov_id_file_path text,
  land_proof_file_path text,
  references_text text,
  -- Bank/payment info is explicitly OUT OF SCOPE for this table — that
  -- belongs to a future payments-setup migration, not signup.
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table farmer_verification enable row level security;

create policy "farmers can view their own verification record"
  on farmer_verification for select
  using (auth.uid() = id);

create policy "farmers can update their own verification record"
  on farmer_verification for update
  using (auth.uid() = id);

create trigger farmer_verification_set_updated_at
  before update on farmer_verification
  for each row execute procedure public.set_updated_at();

-- Farmers may edit their own submission fields but must never approve or
-- reject themselves, or touch the admin's notes — same column-grant
-- technique used for profiles.role/status in 0002.
revoke update on farmer_verification from authenticated;
grant update (
  business_license_number, business_license_file_path,
  insurance_file_path, insurance_expiration_date,
  food_safety_cert_file_path, gov_id_file_path, land_proof_file_path,
  references_text, submitted_at
) on farmer_verification to authenticated;

-- ---------------------------------------------------------------------
-- Certifications are genuinely variable-length (a farmer can attach one or
-- more: organic, USDA, state ag registration, ...), so unlike the other
-- tables here this needs a real client-facing insert/delete policy rather
-- than relying solely on the signup trigger.

create table if not exists farmer_certifications (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references profiles (id) on delete cascade,
  cert_type text not null check (cert_type in ('organic', 'usda', 'state_ag_registration', 'other')),
  cert_name text not null,
  file_path text,
  created_at timestamptz not null default now()
);

create index if not exists farmer_certifications_farmer_id_idx on farmer_certifications (farmer_id);

alter table farmer_certifications enable row level security;

create policy "farmers can manage their own certifications"
  on farmer_certifications for all
  using (auth.uid() = farmer_id)
  with check (auth.uid() = farmer_id);

-- ---------------------------------------------------------------------
-- Sync profiles.status whenever farmer_verification.status changes (e.g. an
-- admin editing it directly in Supabase Studio), so app code never has to
-- keep the two in sync itself. One-directional by design: an admin can still
-- directly set profiles.status = 'suspended' on an already-approved farmer
-- without touching farmer_verification — that's a separate lever.

create or replace function public.sync_profile_status_from_verification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.profiles
    set status = case new.status
      when 'approved' then 'active'
      when 'rejected' then 'rejected'
      else 'pending_verification'
    end
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_farmer_verification_status_change on farmer_verification;
create trigger on_farmer_verification_status_change
  after update on farmer_verification
  for each row execute procedure public.sync_profile_status_from_verification();
