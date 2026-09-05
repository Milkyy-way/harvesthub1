import requests
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import Depends, HTTPException, status
from app.customers.models import CustomerProfile
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.models import Profile

def _geocode_full_address(street, city, state, zip_code):
    address = f"{street}, {city}, {state} {zip_code}"
    resp = requests.get(
        "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
        params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
        timeout=5,
    )
    matches = resp.json().get("result", {}).get("addressMatches", [])
    if matches:
        coords = matches[0]["coordinates"]
        return coords["y"], coords["x"]
    return None

def _geocode_zip_centroid(zip_code):
    resp = requests.get(f"https://api.zippopotam.us/us/{zip_code}", timeout=5)
    if resp.status_code == 200:
        place = resp.json()["places"][0]
        return float(place["latitude"]), float(place["longitude"])
    return None

def get_or_geocode_profile(db: Session, user_id: str) -> CustomerProfile:
    profile = db.query(CustomerProfile).filter(CustomerProfile.id == user_id).first()
    if not profile:
        raise ValueError("Customer profile not found")

    # geocoded_at (not latitude) is the "have we tried yet" marker — an
    # address that fails both the full-address and zip-centroid lookups
    # still gets geocoded_at set, so it's only ever attempted once rather
    # than re-hitting the Census/zippopotam APIs on every request.
    if profile.geocoded_at is None:
        coords = _geocode_full_address(
            profile.address_street, profile.address_city, profile.address_state, profile.address_zip
        )
        if coords is None:
            coords = _geocode_zip_centroid(profile.address_zip)

        if coords is not None:
            profile.latitude, profile.longitude = coords
        profile.geocoded_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)

    return profile

def get_current_customer(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
) -> CustomerProfile:
    profile = db.query(Profile).filter(Profile.id == user["id"]).first()
    if not profile or profile.role != "customer" or profile.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account required")
    return get_or_geocode_profile(db, user["id"])