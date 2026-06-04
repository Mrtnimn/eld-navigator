/**
 * Free-tier routing + geocoding.
 *  - Geocoding: Nominatim (OpenStreetMap)
 *  - Routing:   OSRM public demo server (no API key required)
 *
 * Both APIs are free for low-volume demo use. Respect their usage policies.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSRM = "https://router.project-osrm.org/route/v1/driving";

export async function geocode(query: string): Promise<GeoPoint> {
  const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Geocoding failed for "${query}"`);
  const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) throw new Error(`Couldn't find location: "${query}"`);
  const hit = data[0];
  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    label: hit.display_name,
  };
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** [lng, lat] coordinates of the route polyline */
  coordinates: Array<[number, number]>;
}

export async function route(points: GeoPoint[]): Promise<RouteResult> {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Routing failed");
  const data = await r.json();
  if (!data.routes?.length) throw new Error("No route found");
  const rt = data.routes[0];
  return {
    distanceMeters: rt.distance,
    durationSeconds: rt.duration,
    coordinates: rt.geometry.coordinates,
  };
}

export const metersToMiles = (m: number) => m / 1609.344;

/** Interpolate a point at a given fraction (0..1) along a polyline. */
export function pointAtFraction(
  coords: Array<[number, number]>,
  fraction: number,
): [number, number] {
  if (coords.length === 0) return [0, 0];
  const f = Math.max(0, Math.min(1, fraction));
  // approximate: use distance along by index proportion (good enough for stop markers)
  const idx = (coords.length - 1) * f;
  const i = Math.floor(idx);
  const t = idx - i;
  if (i >= coords.length - 1) return coords[coords.length - 1];
  const [x1, y1] = coords[i];
  const [x2, y2] = coords[i + 1];
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}
