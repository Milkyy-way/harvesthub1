-- HarvestHub — private storage bucket for farmer verification documents
-- (business license, insurance certificate, certifications, government ID,
-- land ownership/lease proof). Private because these are sensitive personal
-- and business documents — never a public bucket.
--
-- Path convention (fixed filenames per document type, so re-upload is just
-- an upsert rather than a new object each time):
--   {uid}/business-license.<ext>
--   {uid}/insurance.<ext>
--   {uid}/food-safety.<ext>
--   {uid}/gov-id.<ext>
--   {uid}/land-proof.<ext>
--   {uid}/certifications/{farmer_certifications.id}.<ext>   -- genuinely 1:many

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'farmer-verification-docs',
  'farmer-verification-docs',
  false,
  10485760, -- 10 MB per file
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase; adding policies here
-- is the standard supported pattern, no ALTER TABLE needed.
--
-- NOTE: auth.uid() returns uuid and storage.foldername() returns text[] —
-- the ::text cast below is required. Omitting it doesn't error, it just
-- makes the policy silently always-false (confusing "permission denied"
-- with no useful message), so don't drop it.

create policy "farmers can read their own verification documents"
  on storage.objects for select
  using (bucket_id = 'farmer-verification-docs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "farmers can upload their own verification documents"
  on storage.objects for insert
  with check (bucket_id = 'farmer-verification-docs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "farmers can replace their own verification documents"
  on storage.objects for update
  using (bucket_id = 'farmer-verification-docs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'farmer-verification-docs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "farmers can remove their own verification documents"
  on storage.objects for delete
  using (bucket_id = 'farmer-verification-docs' and auth.uid()::text = (storage.foldername(name))[1]);

-- No admin storage policy needed: Supabase Studio's storage browser and SQL
-- editor use a privileged connection that bypasses RLS entirely, so an
-- admin can browse {uid}/... paths directly for manual review.
