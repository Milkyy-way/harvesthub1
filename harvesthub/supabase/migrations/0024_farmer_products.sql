-- HarvestHub — farmer product management (Farmer F2).
--
-- Farmers now add, edit, and hide their own products in the farmer app,
-- through FastAPI (/farmers/me/products), which checks the caller is an
-- APPROVED farmer, validates price/stock/category/photo, and scopes every
-- write to their own farmer_id. 0008's "farmers can manage their own
-- products" policy let ANY logged-in user — a customer, or a farmer still
-- pending review — insert/update/delete rows with their own id as
-- farmer_id straight through supabase-js, skipping all of that. Nothing in
-- the app writes products that way, so the policy is dropped. Reads are
-- unchanged (0008's select policy stays).
--
-- Product photos: one per product (plan decision), stored in the existing
-- public farmer-photos bucket at {farmer uid}/products/{product id}.<ext>.
-- 0009's storage policies already let a farmer write anywhere under their
-- own {uid}/ folder, so no storage change is needed; FastAPI only accepts
-- an image_url pointing into that farmer's own products/ folder.

drop policy if exists "farmers can manage their own products" on products;
