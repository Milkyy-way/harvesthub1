import requests
from collections import defaultdict
from datetime import datetime
from sqlalchemy import and_, exists
from sqlalchemy.orm import Session

from app.core.geo import haversine_km
from app.core.models import Profile
from app.farmers.models import FarmerProfile, FarmerCertification
from app.products.models import Product
from app.categories.models import Category
from app.ratings import service as ratings_service

# Spotlight ranking weights — a placeholder blend, not a researched
# formula: rating matters slightly more than raw proximity (a spotlight is
# meant to showcase good farms, not just the nearest ones), but nothing
# here is tuned against real usage yet. Adjust freely.
_SPOTLIGHT_RATING_WEIGHT = 0.6
_SPOTLIGHT_PROXIMITY_WEIGHT = 0.4
# A farmer with zero ratings yet gets this neutral score (slightly above
# the 1-5 midpoint) rather than being penalized for simply being new —
# distance ends up doing most of the ranking work until real ratings
# accumulate.
_SPOTLIGHT_NEUTRAL_RATING = 3.5
# Smooths proximity into a 0-1 score with no hard cutoff radius — a farm
# 10km away still gets half credit rather than being excluded outright.
_SPOTLIGHT_PROXIMITY_DECAY_KM = 10.0


def get_or_geocode_farmer(db: Session, farmer_id: str) -> FarmerProfile:
    """Mirrors app/customers/service.py's get_or_geocode_profile(): full-
    address Census geocode first, zip-centroid fallback if that misses,
    geocoded_at marked either way so a bad/ungeocodable address is only
    ever attempted once, not retried on every feed request."""
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer or farmer.latitude is not None or farmer.geocoded_at is not None:
        return farmer

    if farmer.address_street and farmer.address_city and farmer.address_state and farmer.address_zip:
        address = f"{farmer.address_street}, {farmer.address_city}, {farmer.address_state} {farmer.address_zip}"
        resp = requests.get(
            "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
            params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
            timeout=5,
        )
        matches = resp.json().get("result", {}).get("addressMatches", [])
        if matches:
            coords = matches[0]["coordinates"]
            farmer.latitude = coords["y"]
            farmer.longitude = coords["x"]

    if farmer.latitude is None and farmer.address_zip:
        resp = requests.get(f"https://api.zippopotam.us/us/{farmer.address_zip}", timeout=5)
        if resp.status_code == 200:
            place = resp.json()["places"][0]
            farmer.latitude = float(place["latitude"])
            farmer.longitude = float(place["longitude"])

    farmer.geocoded_at = datetime.utcnow()
    db.commit()
    db.refresh(farmer)
    return farmer


def list_farmer_feed(
    db: Session,
    customer_lat: float,
    customer_lon: float,
    category: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[dict], int]:
    q = (
        db.query(FarmerProfile)
        .join(Profile, Profile.id == FarmerProfile.id)
        .filter(Profile.role == "farmer", Profile.status == "active")
    )

    category_id = None
    if category:
        category_row = db.query(Category.id).filter(Category.slug == category).first()
        if category_row is None:
            return [], 0  # unknown slug — no matches, not a 500
        category_id = category_row.id
        q = q.filter(
            exists().where(
                and_(
                    Product.farmer_id == FarmerProfile.id,
                    Product.is_active.is_(True),
                    Product.category_id == category_id,
                )
            )
        )

    if search:
        like = f"%{search}%"
        q = q.filter(
            exists().where(
                and_(
                    Product.farmer_id == FarmerProfile.id,
                    Product.is_active.is_(True),
                    Product.name.ilike(like),
                )
            )
        )

    farmers = q.all()
    if not farmers:
        return [], 0

    # matched_categories: trivial for a category tap; for a search term,
    # the distinct category slugs among that farmer's matching active
    # products; empty when browsing with no filter (FarmerCard only
    # renders this caption when a filter is active).
    matched_by_farmer: dict = defaultdict(set)
    if search:
        farmer_ids = [f.id for f in farmers]
        rows = (
            db.query(Product.farmer_id, Category.slug)
            .join(Category, Category.id == Product.category_id)
            .filter(
                Product.farmer_id.in_(farmer_ids),
                Product.is_active.is_(True),
                Product.name.ilike(f"%{search}%"),
            )
            .distinct()
            .all()
        )
        for farmer_id, slug in rows:
            matched_by_farmer[farmer_id].add(slug)

    results = []
    for farmer in farmers:
        if farmer.latitude is None or farmer.longitude is None:
            farmer = get_or_geocode_farmer(db, farmer.id)
            if farmer is None or farmer.latitude is None:
                continue  # still ungeocoded (bad address / API down) — exclude, don't crash the feed

        distance = haversine_km(customer_lat, customer_lon, farmer.latitude, farmer.longitude)

        if category:
            matched = [category]
        elif search:
            matched = sorted(matched_by_farmer.get(farmer.id, []))
        else:
            matched = []

        results.append(
            {
                "id": str(farmer.id),
                "farm_name": farmer.farm_name,
                "photo_url": farmer.photo_url,
                "distance_km": round(distance, 2),
                "matched_categories": matched,
            }
        )

    results.sort(key=lambda r: r["distance_km"])
    total = len(results)
    return results[offset : offset + limit], total


def get_spotlight_farmers(
    db: Session, customer_lat: float, customer_lon: float, limit: int
) -> list[dict]:
    """Ranks active farmers by a blend of collective rating and distance —
    not distance alone (that's plain list_farmer_feed) and not rating
    alone (a great farm across town shouldn't bury every nearby one)."""
    farmers = (
        db.query(FarmerProfile)
        .join(Profile, Profile.id == FarmerProfile.id)
        .filter(Profile.role == "farmer", Profile.status == "active")
        .all()
    )
    if not farmers:
        return []

    summaries = ratings_service.get_rating_summaries(db, [f.id for f in farmers])

    scored = []
    for farmer in farmers:
        if farmer.latitude is None or farmer.longitude is None:
            farmer = get_or_geocode_farmer(db, farmer.id)
            if farmer is None or farmer.latitude is None:
                continue

        distance = haversine_km(customer_lat, customer_lon, farmer.latitude, farmer.longitude)
        avg_rating, rating_count = summaries.get(farmer.id, (None, 0))

        rating_score = ((avg_rating if avg_rating is not None else _SPOTLIGHT_NEUTRAL_RATING) - 1) / 4
        proximity_score = 1 / (1 + distance / _SPOTLIGHT_PROXIMITY_DECAY_KM)
        score = _SPOTLIGHT_RATING_WEIGHT * rating_score + _SPOTLIGHT_PROXIMITY_WEIGHT * proximity_score

        scored.append(
            {
                "id": str(farmer.id),
                "farm_name": farmer.farm_name,
                "photo_url": farmer.photo_url,
                "distance_km": round(distance, 2),
                "average_rating": avg_rating,
                "rating_count": rating_count,
                "_score": score,
            }
        )

    scored.sort(key=lambda r: r["_score"], reverse=True)
    for r in scored:
        del r["_score"]
    return scored[:limit]


def get_farmer_detail(
    db: Session,
    farmer_id: str,
    customer_lat: float | None,
    customer_lon: float | None,
) -> dict | None:
    """Powers the farm detail page's header (photo, location, bio,
    certifications) — visibility rule mirrors list_farmer_feed's (active
    farmers only), so a customer can't land on a suspended/unapproved
    farmer's page via a stale or hand-typed link."""
    farmer = (
        db.query(FarmerProfile)
        .join(Profile, Profile.id == FarmerProfile.id)
        .filter(FarmerProfile.id == farmer_id, Profile.role == "farmer", Profile.status == "active")
        .first()
    )
    if not farmer:
        return None

    if farmer.latitude is None or farmer.longitude is None:
        farmer = get_or_geocode_farmer(db, farmer.id)

    distance = None
    if farmer.latitude is not None and farmer.longitude is not None and customer_lat is not None and customer_lon is not None:
        distance = round(haversine_km(customer_lat, customer_lon, farmer.latitude, farmer.longitude), 2)

    certifications = (
        db.query(FarmerCertification).filter(FarmerCertification.farmer_id == farmer_id).all()
    )
    average_rating, rating_count = ratings_service.get_farmer_rating_summary(db, farmer.id)

    return {
        "id": str(farmer.id),
        "farm_name": farmer.farm_name,
        "photo_url": farmer.photo_url,
        "bio": farmer.bio,
        "address_city": farmer.address_city,
        "address_state": farmer.address_state,
        "distance_km": distance,
        "farm_types": farmer.farm_types or [],
        "years_in_operation": farmer.years_in_operation,
        "average_rating": average_rating,
        "rating_count": rating_count,
        "certifications": [
            {"cert_type": c.cert_type, "cert_name": c.cert_name} for c in certifications
        ],
    }
