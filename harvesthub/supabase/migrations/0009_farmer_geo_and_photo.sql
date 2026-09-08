-- HarvestHub — farmer geocoding (mirrors customer_profiles' lat/lon/
-- geocoded_at from Checkpoint 1) + a public store/logo photo shown on the
-- customer feed's farmer cards.
--
-- Note on why this lives in a real .sql migration (unlike
-- customer_profiles' geocode columns, which only ever got added via
-- Alembic — see the backend's alembic/versions/ — never captured here):
-- every other substantive table in this project has its schema live here
-- as the source of truth, so farmer geocoding is written the "correct"
-- way rather than repeating that gap.

alter table farmer_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_at timestamptz,
  add column if not exists photo_url text;

-- ---------------------------------------------------------------------
-- Public bucket (unlike farmer-verification-docs) — customers browsing the
-- feed need to load this image without being the owning farmer or even
-- authenticated as anyone in particular, so it must be servable via a
-- plain public URL, not a signed/RLS-gated one.
--
-- This is the farmer's own store/logo photo, uploaded once after
-- verification approval (see app/(farmer)/add-photo.tsx) — NOT per-item
-- product photos, which are a later checkpoint and use a different
-- column (products.image_url) with no upload path yet.
--
-- Path convention (single primary photo per farmer, fixed filename so
-- re-upload is an upsert, same convention as 0006):
--   {uid}/farm-photo.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'farmer-photos',
  'farmer-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/heic']
)
on conflict (id) do nothing;

-- Public read is really enforced by the bucket's public=true flag (the
-- getPublicUrl() endpoint bypasses RLS entirely) — this select policy is
-- defense-in-depth for the supabase-js `.download()`/`.list()` path, not
-- what the feed itself relies on.
drop policy if exists "anyone can read farmer photos" on storage.objects;
create policy "anyone can read farmer photos"
  on storage.objects for select
  using (bucket_id = 'farmer-photos');

drop policy if exists "farmers can upload their own farm photo" on storage.objects;
create policy "farmers can upload their own farm photo"
  on storage.objects for insert
  with check (bucket_id = 'farmer-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "farmers can replace their own farm photo" on storage.objects;
create policy "farmers can replace their own farm photo"
  on storage.objects for update
  using (bucket_id = 'farmer-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'farmer-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "farmers can remove their own farm photo" on storage.objects;
create policy "farmers can remove their own farm photo"
  on storage.objects for delete
  using (bucket_id = 'farmer-photos' and auth.uid()::text = (storage.foldername(name))[1]);
