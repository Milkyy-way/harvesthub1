# HarvestHub — checkout fee policy.
#
# These are PLACEHOLDER values, not researched or legally reviewed figures,
# except for tax (see app/core/tax.py — real jurisdiction/category rates
# now apply, DC/MD/VA only, farm-jurisdiction-based for the pickup-only
# phase). Real delivery pricing likely needs a mileage tier once
# farm-to-customer distance is factored in (farmer_profiles/
# customer_profiles already have the coordinates for that — see
# app/core/geo.py's haversine_km — this just isn't wired up yet). An open
# business decision, not something to guess into "done."
#
# Centralized here so replacing any of these later is a one-file change,
# not a hunt through every place that touches money.

SERVICE_FEE_RATE = 0.05  # 5% of subtotal — placeholder platform fee
DELIVERY_FEE_FLAT = 4.99  # flat fee for delivery orders — not mileage-based yet

# Farmer payout commission — flat 12% of (subtotal - promo_discount) at the
# time a store order is marked completed (see app/payouts/service.py).
# Snapshotted onto each farmer_ledger_entries row at creation time, so a
# future rate change here never retroactively alters historical entries.
FARMER_COMMISSION_RATE = 0.12
