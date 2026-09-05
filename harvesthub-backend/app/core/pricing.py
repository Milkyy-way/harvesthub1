# HarvestHub — checkout fee policy.
#
# These are PLACEHOLDER values, not researched or legally reviewed figures.
# Real tax rules are jurisdiction- and product-category-dependent (fresh
# produce is tax-exempt in many US states; eggs/dairy/meat can differ) and
# real delivery pricing likely needs a mileage tier once farm-to-customer
# distance is factored in (farmer_profiles/customer_profiles already have
# the coordinates for that — see app/core/geo.py's haversine_km — this
# just isn't wired up yet). Both are open business decisions, not
# something to guess into "done."
#
# Centralized here so replacing any of these later is a one-file change,
# not a hunt through every place that touches money.

SERVICE_FEE_RATE = 0.05  # 5% of subtotal — placeholder platform fee
DELIVERY_FEE_FLAT = 4.99  # flat fee for delivery orders — not mileage-based yet
TAX_RATE = 0.0  # no tax applied until jurisdiction/category rules are defined
