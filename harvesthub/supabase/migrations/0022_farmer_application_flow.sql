-- HarvestHub — farmer self-signup flow (Farmer F0): resubmission after
-- rejection, optional certifications, Google sign-ups customer-only.
--
-- The flow (decided with the user, 2026-10-03): a farmer signs up with
-- email/password, completes the in-app application (farm details +
-- verification documents), then uses a restricted farmer app until an
-- admin approves or rejects them in Studio by editing
-- farmer_verification.status (0004's sync trigger mirrors that onto
-- profiles.status, which is what the app unlocks on). This migration
-- adjusts the server side of that flow:
--
-- 1. submit_farmer_verification() (0007):
--    - Certifications are now OPTIONAL — many small farms hold none — so
--      the "at least one farmer_certifications row" check is dropped.
--      Every other required document is unchanged, blank strings now count
--      as missing, and the farm's address (step 1 of the application) must
--      be on file too.
--    - A REJECTED farmer can fix their application and resubmit: this puts
--      farmer_verification.status back to 'pending_verification' (and, via
--      0004's sync trigger, profiles.status). That's a write to `status`,
--      which `authenticated` can't do directly (0004's column grant), so
--      the function becomes SECURITY DEFINER — still scoped to auth.uid()'s
--      own row, and still the one place this transition is validated.
--      reviewer_notes is left as-is so the reviewer can see what they asked
--      to have fixed.
--    - Refuses to run for an already-approved application, so an approved
--      farmer can't knock themselves back to pending.
-- 2. submitted_at is no longer directly writable by `authenticated` — the
--    RPC above is the only way to submit, so a client can't mark an
--    incomplete application as submitted by writing the column itself.
-- 3. complete_profile_setup() (0018/0019, the Google/OAuth role-setup RPC)
--    now only creates customers: farmers sign up with email/password, so
--    the app no longer offers "farmer" there and this enforces it server-
--    side. Same signature as 0019 (p_farm_name is kept, now unused, so the
--    existing grant and any caller stay valid); body otherwise unchanged
--    minus the farmer branch.

create or replace function public.submit_farmer_verification()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_verification record;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  if not exists (select 1 from profiles where id = v_uid and role = 'farmer') then
    raise exception 'Only farmer accounts can submit an application';
  end if;

  select * into v_verification from farmer_verification where id = v_uid;
  if not found then
    raise exception 'No verification record found for the current user';
  end if;

  if v_verification.status = 'approved' then
    raise exception 'Application already approved';
  end if;

  if not exists (
    select 1 from farmer_profiles
    where id = v_uid
      and nullif(trim(address_street), '') is not null
      and nullif(trim(address_city), '') is not null
      and nullif(trim(address_state), '') is not null
      and nullif(trim(address_zip), '') is not null
  ) then
    raise exception 'Farm details are incomplete';
  end if;

  if nullif(trim(v_verification.business_license_number), '') is null
     or v_verification.business_license_file_path is null
     or v_verification.insurance_file_path is null
     or v_verification.insurance_expiration_date is null
     or v_verification.gov_id_file_path is null
     or v_verification.land_proof_file_path is null
  then
    raise exception 'Application is missing required documents';
  end if;

  update farmer_verification
  set submitted_at = now(),
      status = 'pending_verification'
  where id = v_uid;
end;
$$;

grant execute on function public.submit_farmer_verification() to authenticated;

revoke update (submitted_at) on farmer_verification from authenticated;

-- ---------------------------------------------------------------------

create or replace function public.complete_profile_setup(
  p_role text,
  p_full_name text,
  p_phone text,
  p_address_street text default null,
  p_address_city text default null,
  p_address_state text default null,
  p_address_zip text default null,
  p_dietary_preferences text[] default '{}',
  p_produce_interests text[] default '{}',
  p_referral_source text default null,
  p_referral_source_other text default null,
  p_farm_name text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current_role text;
  v_full_name text := nullif(trim(p_full_name), '');
  v_phone text := nullif(trim(p_phone), '');
  v_address_street text := nullif(trim(p_address_street), '');
  v_address_city text := nullif(trim(p_address_city), '');
  v_address_state text := nullif(trim(p_address_state), '');
  v_address_zip text := nullif(trim(p_address_zip), '');
begin
  select role into v_current_role from profiles where id = v_uid;

  if v_current_role is not null then
    raise exception 'Profile already set up';
  end if;

  if p_role = 'farmer' then
    raise exception 'Farmer accounts sign up with email and password';
  end if;

  if p_role is distinct from 'customer' then
    raise exception 'Invalid role';
  end if;

  if v_full_name is null or v_phone is null then
    raise exception 'Name and phone are required';
  end if;

  if v_address_street is null or v_address_city is null or v_address_state is null or v_address_zip is null then
    raise exception 'Address is required';
  end if;

  update profiles
  set role = 'customer',
      full_name = v_full_name,
      phone = v_phone,
      status = 'active'
  where id = v_uid;

  insert into customer_profiles (
    id, address_street, address_city, address_state, address_zip,
    dietary_preferences, produce_interests, referral_source, referral_source_other
  )
  values (v_uid, v_address_street, v_address_city, v_address_state, v_address_zip,
          p_dietary_preferences, p_produce_interests,
          nullif(trim(p_referral_source), ''), nullif(trim(p_referral_source_other), ''))
  on conflict (id) do update set
    address_street = excluded.address_street,
    address_city = excluded.address_city,
    address_state = excluded.address_state,
    address_zip = excluded.address_zip,
    dietary_preferences = excluded.dietary_preferences,
    produce_interests = excluded.produce_interests,
    referral_source = excluded.referral_source,
    referral_source_other = excluded.referral_source_other;
end;
$$;

grant execute on function public.complete_profile_setup(
  text, text, text, text, text, text, text, text[], text[], text, text, text
) to authenticated;
