// Backend returns distance_km (the natural unit of the Haversine formula
// it computes with) — the mi conversion is display-only and lives here so
// it isn't duplicated anywhere FarmerCard-adjacent gets built later.
export function formatDistance(distanceKm: number): string {
  const miles = distanceKm * 0.621371;
  const rounded = miles < 10 ? miles.toFixed(1) : Math.round(miles).toString();
  return `${rounded} mi`;
}
