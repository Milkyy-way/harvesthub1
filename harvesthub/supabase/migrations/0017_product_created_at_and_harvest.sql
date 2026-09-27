-- HarvestHub — products.created_at, powering the Home feed's "This week's
-- harvest" section (see app/products/service.py::get_harvest_picks).
--
-- No farmer-facing product editor exists yet, so the harvest tags shown
-- to customers (Just picked / Farmer favorite / Limited) are derived
-- algorithmically rather than farmer-set:
--   - "Just picked"     -> created_at within the last N days
--   - "Farmer favorite" -> that farm's most-ordered product (from real
--                          order history — see app/orders/models.py)
--   - "Limited"         -> low quantity_available (same <11 threshold
--                          the farm detail page's ProductCard already uses)
-- Existing rows backfill to now() — they'll all read as "just picked" for
-- a little while after this migration runs, which is an expected,
-- harmless one-time quirk of introducing the column retroactively.

alter table products add column if not exists created_at timestamptz not null default now();
