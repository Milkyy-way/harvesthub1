-- HarvestHub — extend the signup trigger to also create the role-specific
-- child row (customer_profiles, or farmer_profiles + a farmer_verification
-- stub), reading the extra fields out of the same signup metadata payload
-- that already carries role/full_name (see 0001).
--
-- IMPORTANT: this runs inside the same transaction GoTrue uses to create the
-- auth.users row. If any insert below fails a CHECK constraint (e.g. a
-- dietary_preferences value the client sent isn't in the allowed list), the
-- ENTIRE signup rolls back — the auth account never gets created, and the
-- client sees a generic "Database error saving new user" with no field-level
-- detail. The option lists behind every multi-select here (dietary
-- preferences, produce interests, farm types) must stay in lock-step with
-- the zod enums in app/lib/validation/schemas.ts — there's no way to share
-- a literal list across the TS/SQL boundary, so treat any change to one as
-- requiring a matching change to the other.

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
    else 'customer'
  end;

  insert into public.profiles (id, role, full_name, phone, status)
  values (
    new.id,
    v_role,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    case when v_role = 'farmer' then 'pending_verification' else 'active' end
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

  return new;
end;
$$;
