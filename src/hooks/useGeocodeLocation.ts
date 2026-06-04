import { useQuery } from "@tanstack/react-query";

export interface GeocodeMatch {
  displayName: string;
  lat: number;
  lng: number;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

async function fetchGeocode(q: string, signal?: AbortSignal): Promise<GeocodeMatch[]> {
  const url = `${NOMINATIM}?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("geocode failed");
  const data = (await r.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data.map((d) => ({
    displayName: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}

export function useGeocodeLocation(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["geocode", q],
    queryFn: ({ signal }) => fetchGeocode(q, signal),
    enabled: q.length >= 3,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
