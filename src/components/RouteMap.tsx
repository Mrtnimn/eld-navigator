import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint, RouteResult } from "@/lib/routing";

// Fix default markers (Leaflet asset path issue with bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const colorIcon = (hex: string, glyph: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${hex};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.25), 0 0 0 1px rgba(15,23,42,.06);"><span style="transform:rotate(45deg);font-size:16px;line-height:1;">${glyph}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });

export interface MapStop {
  position: [number, number];
  kind: "fuel" | "rest" | "break";
  label: string;
  atMile: number;
}

interface Props {
  current: GeoPoint;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  route: RouteResult;
  stops: MapStop[];
}

function FitBounds({ coords }: { coords: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (!coords.length) return;
    const bounds = L.latLngBounds(coords.map(([lng, lat]) => [lat, lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [coords, map]);
  return null;
}

export function RouteMap({ current, pickup, dropoff, route, stops }: Props) {
  const polyline = route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);

  const stopMeta: Record<MapStop["kind"], { title: string; desc: string }> = {
    fuel: {
      title: "Fuel Stop",
      desc: "Refuel break — required at least every 1,000 miles per company policy.",
    },
    rest: {
      title: "10-Hour Rest",
      desc: "Mandatory off-duty period to reset the 11-hour driving limit (FMCSA §395.3).",
    },
    break: {
      title: "30-Minute Break",
      desc: "Required break after 8 cumulative hours of driving (FMCSA §395.3(a)(3)(ii)).",
    },
  };

  return (
    <MapContainer
      center={[current.lat, current.lng]}
      zoom={5}
      style={{ height: "100%", width: "100%", minHeight: 420 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyline} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.95 }} />
      <Polyline positions={polyline} pathOptions={{ color: "#0f172a", weight: 4, opacity: 1 }} />
      <Marker position={[current.lat, current.lng]} icon={colorIcon("#0f172a", "🚚")}>
        <Tooltip direction="top" offset={[0, -28]} opacity={1}>
          <strong>Current Location</strong>
          <br />
          Where the trip begins — the driver&apos;s starting position.
        </Tooltip>
        <Popup>
          <strong>🚚 Current Location</strong>
          <br />
          <span style={{ color: "#475569" }}>{current.label}</span>
          <br />
          <em>Trip origin point.</em>
        </Popup>
      </Marker>
      <Marker position={[pickup.lat, pickup.lng]} icon={colorIcon("#059669", "📦")}>
        <Tooltip direction="top" offset={[0, -28]} opacity={1}>
          <strong>Pickup</strong>
          <br />
          Load the freight here. Allow 1 hour on-duty (not driving).
        </Tooltip>
        <Popup>
          <strong>📦 Pickup</strong>
          <br />
          <span style={{ color: "#475569" }}>{pickup.label}</span>
          <br />
          <em>Freight loading — counts as on-duty time.</em>
        </Popup>
      </Marker>
      <Marker position={[dropoff.lat, dropoff.lng]} icon={colorIcon("#dc2626", "🏁")}>
        <Tooltip direction="top" offset={[0, -28]} opacity={1}>
          <strong>Drop-off</strong>
          <br />
          Final destination — unload the freight (1 hour on-duty).
        </Tooltip>
        <Popup>
          <strong>🏁 Drop-off</strong>
          <br />
          <span style={{ color: "#475569" }}>{dropoff.label}</span>
          <br />
          <em>Final delivery point.</em>
        </Popup>
      </Marker>
      {stops.map((s, i) => (
        <Marker
          key={i}
          position={s.position}
          icon={colorIcon(
            s.kind === "fuel" ? "#f59e0b" : s.kind === "rest" ? "#7c3aed" : "#64748b",
            s.kind === "fuel" ? "⛽" : s.kind === "rest" ? "🛏" : "☕",
          )}
        >
          <Tooltip direction="top" offset={[0, -28]} opacity={1}>
            <strong>{stopMeta[s.kind].title}</strong>
            <br />
            {stopMeta[s.kind].desc}
            <br />
            <span style={{ opacity: 0.8 }}>Mile {Math.round(s.atMile)}</span>
          </Tooltip>
          <Popup>
            <strong>
              {s.kind === "fuel" ? "⛽" : s.kind === "rest" ? "🛏" : "☕"}{" "}
              {stopMeta[s.kind].title}
            </strong>
            <br />
            <span style={{ color: "#475569" }}>{stopMeta[s.kind].desc}</span>
            <br />
            <em>Scheduled at mile {Math.round(s.atMile)}.</em>
          </Popup>
        </Marker>
      ))}
      <FitBounds coords={route.coordinates} />
    </MapContainer>
  );
}
