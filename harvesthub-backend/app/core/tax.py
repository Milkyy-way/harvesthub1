# HarvestHub — checkout sales tax, Phase 1 (pickup only).
#
# Jurisdiction is the FARM's own state (farmer_profiles.address_state), not
# the customer's — there's no delivery address to key off of yet in the
# pickup-only phase. Revisit for destination-based tax once delivery ships.
#
# Rates are sourced from the payment-logic doc's DC/MD/VA breakdown, keyed
# by a shared raw/prepared product classification (products.tax_category).
# VA's "staple"/"other" wording in that doc maps to raw/prepared here.
# VA's prepared rate is an explicit TEMPORARY PLACEHOLDER — the doc states
# "~6%", not an exact figure — kept as one easily-changed line until the
# real published rate is confirmed.
#
# Any jurisdiction outside DC/MD/VA has no defined rate — 0% is an explicit
# fallback, not a guess, until that state's rules are actually researched.

TAX_RATES = {
    "DC": {"raw": 0.0, "prepared": 0.10},
    "MD": {"raw": 0.0, "prepared": 0.06},
    "VA": {"raw": 0.01, "prepared": 0.06},  # prepared: temporary placeholder, confirm exact VA rate later
}


def compute_item_tax(state: str | None, tax_category: str, taxable_amount: float) -> float:
    """Returns the unrounded tax amount for one line item's taxable portion —
    callers should sum across a farm's items and round the aggregate once,
    not round per item (avoids compounding cent-level drift)."""
    rates = TAX_RATES.get((state or "").strip().upper())
    if not rates:
        return 0.0
    return rates.get(tax_category, 0.0) * taxable_amount
