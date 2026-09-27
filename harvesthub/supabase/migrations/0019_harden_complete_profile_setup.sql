-- HarvestHub — harden complete_profile_setup() against blank/whitespace
-- input, not just NULL.
--
-- 0018's version only checked `is null` for required fields (address,
-- farm name). Since this RPC is security definer and callable directly
-- by any authenticated client with arbitrary arguments (not just through
-- the one screen that calls it today), an empty string '' or a
-- whitespace-only value would sail past that check and create a
-- customer_profiles row with a blank address, or overwrite full_name/
-- phone with nothing. The frontend already validates non-blank input
-- before submitting, but this RPC shouldn't rely solely on that — same
-- "don't trust client-supplied values past a real check" discipline as
-- every other write path in this project.
--
-- Same signature as 0018 (create or replace, not a new function) — only
-- the body changes: every text input is trimmed and blank-collapsed-to-
-- null (nullif(trim(x), '')) before either the required-field checks or
-- the writes themselves.

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
  v_farm_name text := nullif(trim(p_farm_name), '');
begin
  select role into v_current_role from profiles where id = v_uid;

  if v_current_role is not null then
    raise exception 'Profile already set up';
  end if;

  if p_role not in ('customer', 'farmer') then
    raise exception 'Invalid role';
  end if;

  if v_full_name is null or v_phone is null then
    raise exception 'Name and phone are required';
  end if;

  if p_role = 'customer' and (
    v_address_street is null or v_address_city is null or v_address_state is null or v_address_zip is null
  ) then
    raise exception 'Address is required';
  end if;

  if p_role = 'farmer' and v_farm_name is null then
    raise exception 'Farm name is required';
  end if;

  update profiles
  set role = p_role,
      full_name = v_full_name,
      phone = v_phone,
      status = case when p_role = 'farmer' then 'pending_verification' else 'active' end
  where id = v_uid;

  if p_role = 'customer' then
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
  else
    insert into farmer_profiles (id, farm_name) values (v_uid, v_farm_name)
    on conflict (id) do update set farm_name = excluded.farm_name;

    insert into farmer_verification (id) values (v_uid) on conflict (id) do nothing;
  end if;
end;
$$;

grant execute on function public.complete_profile_setup(
  text, text, text, text, text, text, text, text[], text[], text, text, text
) to authenticated;
