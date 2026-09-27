-- HarvestHub — product tax classification for jurisdiction-based checkout tax.
--
-- Phase 1 (pickup-only) checkout tax is computed per line item from a
-- shared raw/prepared classification, applied against the FARM's own
-- jurisdiction (farmer_profiles.address_state) — there's no delivery
-- address to key off of yet. See harvesthub-backend/app/core/tax.py for
-- the actual DC/MD/VA rate table; VA's prepared rate there is an explicit
-- temporary placeholder pending the exact published rate. Any state
-- outside DC/MD/VA taxes at 0% until that jurisdiction's rules are
-- actually researched — not guessed at.
--
-- No farmer-facing product editor exists yet, so this column is set by
-- hand in Supabase Studio for now (same stopgap already used for
-- farmer_certifications) — every product defaults to 'raw' until edited.

alter table products add column if not exists tax_category text not null default 'raw';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_tax_category_check') then
    alter table products add constraint products_tax_category_check check (tax_category in ('raw', 'prepared'));
  end if;
end $$;
