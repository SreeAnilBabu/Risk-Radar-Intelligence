/**
 * geography.ts — turns a matter's lat/lng into a "City, ST" string for the
 * Matter List Geography column. The seed already carries jurisdiction-grade
 * coordinates; we keep the lookup table in one place so it can be replaced
 * with a real `P_JURISDICTION` join the moment Passport data lands.
 */
const CITIES: Array<{ city: string; state: string; lat: number; lng: number }> = [
  { city: "Los Angeles", state: "CA", lat: 34.05, lng: -118.24 },
  { city: "San Francisco", state: "CA", lat: 37.77, lng: -122.41 },
  { city: "San Jose", state: "CA", lat: 37.33, lng: -121.88 },
  { city: "New York", state: "NY", lat: 40.71, lng: -74.0 },
  { city: "Chicago", state: "IL", lat: 41.85, lng: -87.65 },
  { city: "Miami", state: "FL", lat: 25.76, lng: -80.19 },
  { city: "Washington", state: "DC", lat: 38.89, lng: -77.03 },
  { city: "Dallas", state: "TX", lat: 32.77, lng: -96.79 },
  { city: "Houston", state: "TX", lat: 29.76, lng: -95.36 },
  { city: "Austin", state: "TX", lat: 30.26, lng: -97.74 },
  { city: "Seattle", state: "WA", lat: 47.6, lng: -122.33 },
  { city: "Boston", state: "MA", lat: 42.36, lng: -71.05 },
  { city: "Phoenix", state: "AZ", lat: 33.44, lng: -112.07 },
  { city: "Denver", state: "CO", lat: 39.73, lng: -104.99 },
  { city: "Atlanta", state: "GA", lat: 33.74, lng: -84.38 }
];

export function geographyFor(lat: number, lng: number): string {
  let best = CITIES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return `${best.city}, ${best.state}`;
}
