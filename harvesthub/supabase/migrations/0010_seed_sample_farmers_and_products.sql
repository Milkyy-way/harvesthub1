-- HarvestHub — DEV/TEST SEED DATA, not schema. Run manually like the
-- other numbered migrations, but this file exists purely so the customer
-- feed has something real to sort/filter/display during development —
-- delete these rows (or just don't run this file) once real farmers
-- exist and this checkpoint is no longer being manually tested.
--
-- profiles.id has a hard FK to auth.users(id) (see 0001), so a fake
-- farmer needs a real (if non-functional) auth.users row too — these
-- accounts have no usable password and are not meant to ever log in;
-- nothing in this checkpoint needs them to. If your Supabase project's
-- auth.users schema rejects this insert (column set can vary slightly
-- by project/GoTrue version), open Table Editor > auth.users and drop
-- any columns this INSERT doesn't recognize, or comment out the
-- offending column from both the column list and VALUES.
--
-- IMPORTANT: inserting into auth.users fires the existing
-- on_auth_user_created -> handle_new_user() trigger (0001/0005), the same
-- one that runs on a real signup. raw_user_meta_data below deliberately
-- carries role:"farmer" + farm_name so that trigger creates the
-- profiles/farmer_profiles/farmer_verification rows itself, exactly like a
-- real farmer signup would (leaving it empty, as an earlier version of
-- this file did, makes the trigger default to role:"customer" and then
-- fail inserting a customer_profiles row with no address — don't do that).
-- This file only fills in the rest: geocoded location, farm details, and
-- flips farmer_verification to 'approved' (which the existing
-- sync_profile_status_from_verification trigger turns into
-- profiles.status = 'active' automatically).
--
-- Coordinates cluster around Fresno, CA (36.7378, -119.7871). For
-- distance sorting to look meaningful during manual testing, your test
-- CUSTOMER account's address should geocode somewhere near this area —
-- if it doesn't, distances will still compute and sort correctly, they
-- just won't look like a "nearby farms" list. Adjust the lat/lon values
-- below to cluster around your actual test customer's address if you'd
-- rather do that instead.

do $$
declare
  farmer1 uuid := '11111111-1111-1111-1111-111111111101';
  farmer2 uuid := '11111111-1111-1111-1111-111111111102';
  farmer3 uuid := '11111111-1111-1111-1111-111111111103';
  farmer4 uuid := '11111111-1111-1111-1111-111111111104';
  farmer5 uuid := '11111111-1111-1111-1111-111111111105';
begin

-- ---------------------------------------------------------------------
-- auth.users (minimal, non-functional accounts — see header note). The
-- role:"farmer" + farm_name in raw_user_meta_data are read by
-- handle_new_user() (0005) exactly like a real signup's metadata payload.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', farmer1, 'authenticated', 'authenticated', 'seed-green-acres@harvesthub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"farmer","full_name":"Green Acres Farm","phone":"555-0101","farm_name":"Green Acres Farm"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', farmer2, 'authenticated', 'authenticated', 'seed-sunny-valley@harvesthub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"farmer","full_name":"Sunny Valley Orchards","phone":"555-0102","farm_name":"Sunny Valley Orchards"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', farmer3, 'authenticated', 'authenticated', 'seed-riverside-dairy@harvesthub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"farmer","full_name":"Riverside Dairy","phone":"555-0103","farm_name":"Riverside Dairy"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', farmer4, 'authenticated', 'authenticated', 'seed-blue-sky-apiary@harvesthub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"farmer","full_name":"Blue Sky Apiary","phone":"555-0104","farm_name":"Blue Sky Apiary"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', farmer5, 'authenticated', 'authenticated', 'seed-heritage-livestock@harvesthub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"farmer","full_name":"Heritage Livestock Co","phone":"555-0105","farm_name":"Heritage Livestock Co"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Fill in the rest of farmer_profiles — handle_new_user() only inserted
-- (id, farm_name); address/geo/photo need a direct UPDATE.

update farmer_profiles set
  address_street = '100 Harvest Ln', address_city = 'Fresno', address_state = 'CA', address_zip = '93701',
  farm_types = array['produce'], years_in_operation = 8,
  latitude = 36.7378, longitude = -119.7871, geocoded_at = now(),
  photo_url = 'https://placehold.co/400x300?text=Green+Acres+Farm'
where id = farmer1;

update farmer_profiles set
  address_street = '220 Orchard Rd', address_city = 'Fresno', address_state = 'CA', address_zip = '93702',
  farm_types = array['produce'], years_in_operation = 12,
  latitude = 36.7550, longitude = -119.7700, geocoded_at = now(),
  photo_url = 'https://placehold.co/400x300?text=Sunny+Valley+Orchards'
where id = farmer2;

update farmer_profiles set
  address_street = '340 River Rd', address_city = 'Fresno', address_state = 'CA', address_zip = '93703',
  farm_types = array['dairy'], years_in_operation = 15,
  latitude = 36.7200, longitude = -119.8100, geocoded_at = now(),
  photo_url = null
where id = farmer3;

update farmer_profiles set
  address_street = '410 Meadow Way', address_city = 'Fresno', address_state = 'CA', address_zip = '93704',
  farm_types = array['produce'], years_in_operation = 5,
  latitude = 36.7800, longitude = -119.7500, geocoded_at = now(),
  photo_url = 'https://placehold.co/400x300?text=Blue+Sky+Apiary'
where id = farmer4;

update farmer_profiles set
  address_street = '560 Pasture Dr', address_city = 'Fresno', address_state = 'CA', address_zip = '93705',
  farm_types = array['livestock'], years_in_operation = 20,
  latitude = 36.6900, longitude = -119.8400, geocoded_at = now(),
  photo_url = null
where id = farmer5;

-- ---------------------------------------------------------------------
-- Flip verification to approved — the existing
-- sync_profile_status_from_verification trigger (0004) turns this into
-- profiles.status = 'active' automatically, same as a real admin approval.

update farmer_verification set status = 'approved', submitted_at = now(), reviewed_at = now()
where id in (farmer1, farmer2, farmer3, farmer4, farmer5);

-- ---------------------------------------------------------------------
-- Products — spread across categories so category/search filtering has
-- something meaningful to narrow down. category_id looked up by slug
-- since categories.id is a random uuid generated in 0008.
--
-- Explicit fixed ids (not the column default gen_random_uuid()) so
-- `on conflict (id) do nothing` actually works — without a fixed id, a
-- re-run of this file would silently insert 15 duplicate products every
-- time, since a fresh random id never collides with anything.

insert into products (id, farmer_id, category_id, name, description, price, unit, quantity_available, is_active)
values
  ('22222222-2222-2222-2222-222222222001', farmer1, (select id from categories where slug = 'vegetables'), 'Heirloom Tomatoes', 'Vine-ripened, mixed heirloom varieties', 4.50, 'lb', 40, true),
  ('22222222-2222-2222-2222-222222222002', farmer1, (select id from categories where slug = 'vegetables'), 'Sweet Corn',         'Picked daily', 0.75, 'each', 120, true),
  ('22222222-2222-2222-2222-222222222003', farmer1, (select id from categories where slug = 'herbs'),      'Basil Bunch',        'Genovese basil', 2.50, 'bunch', 30, true),

  ('22222222-2222-2222-2222-222222222004', farmer2, (select id from categories where slug = 'fruits'),  'Fuji Apples',   'Crisp and sweet', 3.00, 'lb', 80, true),
  ('22222222-2222-2222-2222-222222222005', farmer2, (select id from categories where slug = 'fruits'),  'Bartlett Pears','Orchard-fresh', 3.25, 'lb', 50, true),
  ('22222222-2222-2222-2222-222222222006', farmer2, (select id from categories where slug = 'flowers'),'Sunflower Bunch','Locally grown', 6.00, 'bunch', 20, true),

  ('22222222-2222-2222-2222-222222222007', farmer3, (select id from categories where slug = 'dairy'), 'Whole Milk',   'Grass-fed, half gallon', 4.00, 'each', 60, true),
  ('22222222-2222-2222-2222-222222222008', farmer3, (select id from categories where slug = 'dairy'), 'Farmstead Cheddar','Aged 6 months', 8.50, 'lb', 25, true),
  ('22222222-2222-2222-2222-222222222009', farmer3, (select id from categories where slug = 'eggs'),  'Free-Range Eggs','Dozen, brown', 5.50, 'dozen', 45, true),

  ('22222222-2222-2222-2222-222222222010', farmer4, (select id from categories where slug = 'honey'),   'Wildflower Honey','Raw, unfiltered', 9.00, 'jar', 35, true),
  ('22222222-2222-2222-2222-222222222011', farmer4, (select id from categories where slug = 'honey'),   'Clover Honey',     'Light and mild', 8.00, 'jar', 35, true),
  ('22222222-2222-2222-2222-222222222012', farmer4, (select id from categories where slug = 'flowers'),'Lavender Bundle',  'Dried, fragrant', 5.00, 'bundle', 15, true),

  ('22222222-2222-2222-2222-222222222013', farmer5, (select id from categories where slug = 'meat'), 'Grass-Fed Ground Beef', 'From pasture-raised cattle', 9.50, 'lb', 40, true),
  ('22222222-2222-2222-2222-222222222014', farmer5, (select id from categories where slug = 'meat'), 'Pasture-Raised Pork Chops', 'Bone-in', 11.00, 'lb', 25, true),
  ('22222222-2222-2222-2222-222222222015', farmer5, (select id from categories where slug = 'eggs'), 'Duck Eggs', 'Dozen', 7.00, 'dozen', 18, true)
on conflict (id) do nothing;

end $$;
