import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { LocationAutocomplete } from "./LocationAutocomplete";

export interface TripFormData {
  current: string;
  pickup: string;
  dropoff: string;
  cycleUsed: number;
}

interface Props {
  onSubmit: (data: TripFormData) => void;
  loading?: boolean;
}

export function TripForm({ onSubmit, loading }: Props) {
  const [data, setData] = useState<TripFormData>({
    current: "Chicago, IL",
    pickup: "St. Louis, MO",
    dropoff: "Dallas, TX",
    cycleUsed: 12,
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  const cycleRemaining = Math.max(0, 70 - (data.cycleUsed || 0));
  const overUsed = data.cycleUsed >= 60;

  return (
    <form onSubmit={handle} className="space-y-7">
      <section className="space-y-3">
        <h2 className="label-eyebrow">Trip Logistics</h2>
        <LocationAutocomplete
          label="Current Location"
          value={data.current}
          onChange={(v) => setData({ ...data, current: v })}
          placeholder="Start typing a city or address…"
        />
        <LocationAutocomplete
          label="Pickup Destination"
          value={data.pickup}
          onChange={(v) => setData({ ...data, pickup: v })}
          placeholder="Start typing a city or address…"
        />
        <LocationAutocomplete
          label="Final Dropoff"
          value={data.dropoff}
          onChange={(v) => setData({ ...data, dropoff: v })}
          placeholder="Start typing a city or address…"
        />
      </section>

      <section className="space-y-3 pt-5 border-t border-border">
        <h2 className="label-eyebrow">HOS 70hr / 8-Day Cycle</h2>
        <div>
          <label className="block text-xs font-bold text-foreground uppercase mb-2">Cycle Hours Used</label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={70}
              step={0.25}
              value={data.cycleUsed}
              onChange={(e) => setData({ ...data, cycleUsed: parseFloat(e.target.value) || 0 })}
              className="h-11 pr-16 font-mono font-bold text-base bg-surface"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Hours
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>{cycleRemaining.toFixed(1)} hrs remaining</span>
            <span>{((data.cycleUsed / 70) * 100).toFixed(0)}% used</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overUsed ? "bg-warning" : "bg-foreground"}`}
              style={{ width: `${Math.min(100, (data.cycleUsed / 70) * 100)}%` }}
            />
          </div>
          {overUsed && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/40 rounded-lg flex gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-warning uppercase tracking-wider">Recap Warning</p>
                <p className="text-[11px] text-foreground/80 font-medium leading-relaxed mt-0.5">
                  Approaching cycle limit. Smart-routing will prioritize 34-hour resets.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Button
        type="submit"
        disabled={loading}
        size="lg"
        className="w-full h-12 font-bold uppercase tracking-wider text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating Route…
          </>
        ) : (
          <>
            Calculate Compliance Route <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground uppercase mb-1.5">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 bg-surface text-sm font-medium"
      />
    </div>
  );
}
