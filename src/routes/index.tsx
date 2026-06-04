import { createFileRoute } from "@tanstack/react-router";
import { useState, lazy, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  AlertTriangle,
  Calendar,
  Fuel,
  Gauge,
  Route as RouteIcon,
  MapPin,
  Printer,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { TripForm, type TripFormData } from "@/components/TripForm";
import { EldLogSheet } from "@/components/EldLogSheet";
import {
  geocode,
  route as fetchRoute,
  metersToMiles,
  pointAtFraction,
  type GeoPoint,
  type RouteResult,
} from "@/lib/routing";
import { planTrip, fmtHM, type HosPlan } from "@/lib/hos";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { MapStop } from "@/components/RouteMap";

const RouteMap = lazy(() => import("@/components/RouteMap").then((m) => ({ default: m.RouteMap })));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELD Trip Planner — HOS-Compliant Route & Daily Logs" },
      {
        name: "description",
        content:
          "Professional HOS-compliant trip planning for property-carrying drivers. Generate FMCSA-compliant routes with fuel and rest stops, plus auto-filled DOT daily log sheets.",
      },
      { property: "og:title", content: "ELD Trip Planner — Fleet Operations" },
      {
        property: "og:description",
        content: "FMCSA-compliant route planning with auto-generated ELD daily logs.",
      },
    ],
  }),
  component: Index,
});

interface Result {
  current: GeoPoint;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  route: RouteResult;
  plan: HosPlan;
  totalMiles: number;
  stops: MapStop[];
}

function Index() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TripFormData) => {
    setLoading(true);
    setError(null);
    try {
      const [current, pickup, dropoff] = await Promise.all([
        geocode(data.current),
        geocode(data.pickup),
        geocode(data.dropoff),
      ]);
      const r = await fetchRoute([current, pickup, dropoff]);
      const totalMiles = metersToMiles(r.distanceMeters);
      const plan = planTrip({ totalMiles, cycleUsedHrs: data.cycleUsed });

      const stops: MapStop[] = [];
      for (const seg of plan.segments) {
        if (seg.label === "Fuel stop" || seg.label === "10h rest") {
          const f = (seg.miles ?? 0) / Math.max(totalMiles, 1);
          const [lng, lat] = pointAtFraction(r.coordinates, f);
          stops.push({
            position: [lat, lng],
            kind: seg.label === "Fuel stop" ? "fuel" : "rest",
            label: seg.label,
            atMile: seg.miles ?? 0,
          });
        }
      }

      setResult({ current, pickup, dropoff, route: r, plan, totalMiles, stops });
      toast.success(`Route calculated · ${plan.days.length} day${plan.days.length > 1 ? "s" : ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-6 max-w-[1400px]">
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-surface border border-border rounded-xl shadow-card h-fit lg:sticky lg:top-20 overflow-hidden"
          >
            <div className="p-6">
              <TripForm onSubmit={handleSubmit} loading={loading} />
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                </motion.div>
              )}
            </div>
          </motion.aside>

          {/* Main */}
          <section className="space-y-6 min-w-0">
            <AnimatePresence mode="wait">
              {!result ? <EmptyState key="empty" /> : <ResultView key="result" result={result} />}
            </AnimatePresence>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="h-16 border-b border-border bg-surface sticky top-0 z-30">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1400px] h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-foreground rounded-md flex items-center justify-center">
            <Truck className="h-4.5 w-4.5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight uppercase leading-none">
              ELD Trip Planner
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">
              FMCSA · HOS Compliance
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="label-eyebrow text-[10px]">System Status</span>
            <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_oklch(0.66_0.16_152_/_0.6)]" />
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-xs font-bold text-foreground">Unit 4022-B</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                Driver Active
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-bold text-xs">
              YS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-surface border border-border rounded-xl shadow-card min-h-[520px] flex items-center justify-center p-12"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-muted rounded-3xl rotate-6 border border-border" />
          <div className="absolute inset-0 bg-surface rounded-3xl border-2 border-border shadow-sm flex items-center justify-center">
            <RouteIcon className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Ready for Routing</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your trip origin and destination on the left to generate an HOS-compliant route
            with automated fuel and rest stop planning.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Pill label="Protocol" value="ELD-v2.1" />
          <Pill label="Compliance" value="DOT 395.8" />
          <Pill label="Cycle" value="70hr / 8-day" />
        </div>
      </div>
    </motion.div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full border border-border">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[10px] font-black text-foreground uppercase tracking-tight">
        {value}
      </span>
    </div>
  );
}

function ResultView({ result }: { result: Result }) {
  const { plan, route: r, current, pickup, dropoff, stops, totalMiles } = result;

  const fromTo = useMemo(() => {
    const a = current.label.split(",").slice(0, 2).join(",");
    const b = dropoff.label.split(",").slice(0, 2).join(",");
    return `${a} → ${b}`;
  }, [current, dropoff]);

  const drivePct = Math.min(100, (plan.drivingMinutes / 60 / 11) * 100);
  const dayPct = Math.min(100, (plan.days.length / 8) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Stat strip */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          <Stat
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Total Distance"
            value={Math.round(totalMiles).toLocaleString()}
            unit="MI"
            barPct={Math.min(100, (totalMiles / 3000) * 100)}
            barTone="foreground"
          />
          <Stat
            icon={<RouteIcon className="h-3.5 w-3.5" />}
            label="Drive Time"
            value={fmtHM(plan.drivingMinutes)}
            unit="HRS"
            barPct={drivePct}
            barTone="success"
          />
          <Stat
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Days Required"
            value={plan.days.length.toString()}
            unit={`/ 8`}
            barPct={dayPct}
            barTone="foreground"
          />
          <Stat
            icon={<Fuel className="h-3.5 w-3.5" />}
            label="Fuel Stops"
            value={plan.fuelStops.toString()}
            unit="STOPS"
            barPct={Math.min(100, plan.fuelStops * 25)}
            barTone="warning"
          />
        </div>
      </div>

      {plan.warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/40 rounded-lg p-3.5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/90 font-medium">
            {plan.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-success" />
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
              Route & Compliance Stops
            </h3>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <Legend color="#0f172a" label="Current" />
            <Legend color="#059669" label="Pickup" />
            <Legend color="#dc2626" label="Drop-off" />
            <Legend color="#f59e0b" label="Fuel" />
            <Legend color="#7c3aed" label="10h Rest" />
          </div>
        </div>
        <div style={{ height: 460 }}>
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading map…
              </div>
            }
          >
            <RouteMap
              current={current}
              pickup={pickup}
              dropoff={dropoff}
              route={r}
              stops={stops}
            />
          </Suspense>
        </div>
        <div className="px-5 py-3 border-t border-border bg-surface-strong flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-foreground">{fromTo}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] hover:text-foreground transition-colors">
              <Printer className="h-3.5 w-3.5" /> Print Logs
            </button>
            <button className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] hover:text-foreground transition-colors">
              <Share2 className="h-3.5 w-3.5" /> Share Dispatch
            </button>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-foreground" />
            Daily Log Sheets
            <span className="text-muted-foreground font-mono text-[11px]">
              · {plan.days.length} day{plan.days.length > 1 ? "s" : ""}
            </span>
          </h3>
        </div>
        {plan.days.map((day) => {
          const d = new Date();
          d.setDate(d.getDate() + (day.day - 1));
          return (
            <EldLogSheet
              key={day.day}
              day={day}
              date={d}
              driverName="Your Signature"
              driverInitials="YS"
              driverNumber="1224213"
              truckNumber="48872"
              trailerNumber="TA939200"
              carrier="ELD Trip Planner Co."
              homeTerminal={current.label.split(",").slice(-3, -1).join(",").trim()}
              shipper={pickup.label.split(",")[0]}
              commodity="General freight"
              loadNo={`ST${(day.day * 1000 + 132415).toString()}`}
              fromTo={fromTo}
              startOdometer={Math.round(
                (day.day - 1) * (totalMiles / Math.max(plan.days.length, 1)),
              )}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

const BAR_TONE: Record<string, string> = {
  foreground: "bg-foreground",
  success: "bg-success",
  warning: "bg-warning",
};

function Stat({
  icon,
  label,
  value,
  unit,
  barPct,
  barTone = "foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  barPct: number;
  barTone?: keyof typeof BAR_TONE;
}) {
  return (
    <div className="p-5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-foreground tabular-nums">{value}</span>
        {unit && <span className="text-[11px] font-bold text-muted-foreground">{unit}</span>}
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${BAR_TONE[barTone]}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
      <div>Routing · OSRM · Geocoding · Nominatim/OSM</div>
      <div>Built with Django + React · DOT 395.8</div>
    </footer>
  );
}
