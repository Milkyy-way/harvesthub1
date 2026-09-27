-- HarvestHub — support Google/Apple OAuth signup alongside the existing
-- password flow.
--
-- The problem: password signup's form hands handle_new_user() a full
-- metadata payload (role, address, farm name, ...) in one signUp() call.
-- An OAuth signup can't do that — Google/Apple only ever hand Supabase a
-- name and an email, never a role or the rest. Under the OLD trigger,
-- that missing 'role' key defaulted to 'customer' and then tried to
-- insert a customer_profiles row with no address, which hits a NOT NULL
-- constraint and fails the ENTIRE signup ("Database error saving new
-- user"). So OAuth literally cannot work until this is fixed.
--
-- The fix: any signup that doesn't arrive with a valid role (in
-- practice, that's every OAuth signup, since only our own password-signup
-- form ever sets one) lands as a bare `profiles` row —
-- status = 'pending_role_selection', role = null, nothing else created
-- yet. The app detects that state (same "redirect based on profile
-- status" mechanism already used for farmer onboarding) and sends the
-- user through app/(role-setup)/ to pick a role and fill in whatever's
-- still missing (address for a customer, farm name for a farmer — name/
-- email already came from the provider). That screen calls
-- complete_profile_setup() below, which is the one place allowed to set
-- role/status directly (both are otherwise locked to `authenticated` by
-- 0002's column grant), mirroring the existing
-- submit_farmer_verification() RPC's role as "the one place this
-- transition is checked server-side."
--
-- Password signup's own path through handle_new_user() is UNCHANGED —
-- this only adds a new branch for when role is absent.

-- ---------------------------------------------------------------------
-- profiles.role can no longer default to 'customer' on missing data —
-- that default is exactly the unsafe behavior this migration removes.

alter table profiles alter column role drop default;
alter table profiles alter column role drop not null;

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('active', 'pending_verification', 'rejected', 'suspended', 'pending_role_selection'));

-- ---------------------------------------------------------------------
-- handle_new_user() — same shape as 0005, with one new branch: no valid
-- role in metadata -> bare profile, pending_role_selection, stop there.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  -- Signup metadata is fully client-controlled, so 'admin' is deliberately
  -- excluded here — someone editing the signup request could otherwise pass
  -- role: 'admin' and self-promote. Admin accounts get created by directly
  -- updating this table from the Supabase dashboard (service_role access),
  -- never through the public signup flow.
  v_role := case
    when new.raw_user_meta_data ->> 'role' in ('customer', 'farmer') then new.raw_user_meta_data ->> 'role'
    else null
  end;

  insert into public.profiles (id, role, full_name, phone, status)
  values (
    new.id,
    v_role,
    -- OAuth providers key the display name as 'full_name' or 'name'
    -- depending on provider; our own signup form always sends 'full_name'.
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    case
      when v_role = 'farmer' then 'pending_verification'
      when v_role = 'customer' then 'active'
      else 'pending_role_selection'
    end
  );

  if v_role = 'customer' then
    insert into public.customer_profiles (
      id, address_street, address_city, address_state, address_zip,
      dietary_preferences, produce_interests, referral_source, referral_source_other
    )
    values (
      new.id,
      new.raw_user_meta_data ->> 'address_street',
      new.raw_user_meta_data ->> 'address_city',
      new.raw_user_meta_data ->> 'address_state',
      new.raw_user_meta_data ->> 'address_zip',
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'dietary_preferences', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'produce_interests', '[]'::jsonb))),
      new.raw_user_meta_data ->> 'referral_source',
      new.raw_user_meta_data ->> 'referral_source_other'
    );
  elsif v_role = 'farmer' then
    insert into public.farmer_profiles (id, farm_name)
    values (new.id, new.raw_user_meta_data ->> 'farm_name');

    insert into public.farmer_verification (id) values (new.id);
  end if;
  -- else: v_role is null (OAuth, or any other identity provider that
  -- never sends our custom fields) — bare profile only. Nothing else to
  -- insert until complete_profile_setup() runs.

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- complete_profile_setup() — the one place a pending_role_selection
-- profile gets turned into a real customer or farmer account. security
-- definer because role/status are otherwise locked to `authenticated`
-- (see 0002's column grant) — same reasoning as handle_new_user() itself.
-- Refuses to run a second time (role already set) so this can't be used
-- to change an existing account's role later.

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
begin
  select role into v_current_role from profiles where id = v_uid;

  if v_current_role is not null then
    raise exception 'Profile already set up';
  end if;

  if p_role not in ('customer', 'farmer') then
    raise exception 'Invalid role';
  end if;

  if p_role = 'customer' and (
    p_address_street is null or p_address_city is null or p_address_state is null or p_address_zip is null
  ) then
    raise exception 'Address is required';
  end if;

  if p_role = 'farmer' and p_farm_name is null then
    raise exception 'Farm name is required';
  end if;

  update profiles
  set role = p_role,
      full_name = coalesce(p_full_name, full_name),
      phone = coalesce(p_phone, phone),
      status = case when p_role = 'farmer' then 'pending_verification' else 'active' end
  where id = v_uid;

  if p_role = 'customer' then
    insert into customer_profiles (
      id, address_street, address_city, address_state, address_zip,
      dietary_preferences, produce_interests, referral_source, referral_source_other
    )
    values (v_uid, p_address_street, p_address_city, p_address_state, p_address_zip,
            p_dietary_preferences, p_produce_interests, p_referral_source, p_referral_source_other)
    on conflict (id) do update set
      address_street = excluded.address_street,
      address_city = excluded.address_city,
      address_state = excluded.address_state,
      address_zip = excluded.address_zip,
      dietary_preferences = excluded.dietary_preferences,
      produce_interests = excluded.produce_interests,
      referral_source = excluded.referral_source,
      referral_source_other = excluded.referral_source_other;
  else
    insert into farmer_profiles (id, farm_name) values (v_uid, p_farm_name)
    on conflict (id) do update set farm_name = excluded.farm_name;

    insert into farmer_verification (id) values (v_uid) on conflict (id) do nothing;
  end if;
end;
$$;

grant execute on function public.complete_profile_setup(
  text, text, text, text, text, text, text, text[], text[], text, text, text
) to authenticated;
