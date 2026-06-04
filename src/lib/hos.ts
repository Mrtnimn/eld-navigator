/**
 * FMCSA Hours-of-Service calculator (Property-carrying, 70hrs/8days).
 *
 * Rules implemented:
 *  - 11-hour driving limit per shift
 *  - 14-hour on-duty window per shift
 *  - 30-minute break required after 8 cumulative hours of driving
 *  - 10 consecutive hours off-duty required to reset shift
 *  - 70-hour / 8-day rolling on-duty cap
 *  - 1 hour on-duty (not driving) for pickup AND drop-off
 *  - Fuel stop (15 min on-duty) at least every 1,000 miles
 *
 * Mirrored on the Django backend at /backend/api/hos.py
 */

export type DutyStatus = "off" | "sleeper" | "driving" | "onDuty";

export interface Segment {
  status: DutyStatus;
  /** minutes since start of trip */
  start: number;
  /** minutes since start of trip */
  end: number;
  label?: string;
  /** miles accumulated at end of segment */
  miles?: number;
}

export interface DayLog {
  /** day index (1-based) */
  day: number;
  /** segments clipped to this 24h window, minutes 0..1440 */
  segments: Segment[];
  totals: { off: number; sleeper: number; driving: number; onDuty: number };
  miles: number;
}

export interface HosPlan {
  segments: Segment[];
  days: DayLog[];
  totalMinutes: number;
  totalMiles: number;
  drivingMinutes: number;
  fuelStops: number;
  warnings: string[];
}

export interface HosInput {
  totalMiles: number;
  /** average speed mph for highway driving */
  avgSpeedMph?: number;
  /** hours already used in current 70/8 cycle */
  cycleUsedHrs: number;
}

const AVG_SPEED = 55;
const DRIVE_LIMIT = 11 * 60;
const WINDOW_LIMIT = 14 * 60;
const BREAK_AFTER = 8 * 60;
const BREAK_LEN = 30;
const RESET_OFF = 10 * 60;
const CYCLE_LIMIT = 70 * 60;
const PICKUP_DROP = 60;
const FUEL_INTERVAL_MI = 1000;
const FUEL_DURATION = 15;

export function planTrip(input: HosInput): HosPlan {
  const speed = input.avgSpeedMph ?? AVG_SPEED;
  const totalDriveMin = Math.round((input.totalMiles / speed) * 60);
  const fuelStops = Math.max(0, Math.floor(input.totalMiles / FUEL_INTERVAL_MI));
  const segments: Segment[] = [];
  const warnings: string[] = [];

  let t = 0; // minutes since start
  let drivenSinceBreak = 0;
  let driveThisShift = 0;
  let windowStart = 0;
  let cycleUsed = input.cycleUsedHrs * 60;
  let milesDone = 0;
  let driveRemaining = totalDriveMin;
  // distance between fuel stops
  let mphMin = speed / 60;
  let nextFuelMi = FUEL_INTERVAL_MI;

  const push = (status: DutyStatus, durMin: number, label?: string) => {
    if (durMin <= 0) return;
    segments.push({
      status,
      start: t,
      end: t + durMin,
      label,
      miles: milesDone,
    });
    t += durMin;
    if (status === "driving" || status === "onDuty") cycleUsed += durMin;
  };

  // Pickup (on-duty, not driving) — counts toward 14h window
  push("onDuty", PICKUP_DROP, "Pickup");
  driveThisShift = 0;
  windowStart = t - PICKUP_DROP; // window started at pickup

  while (driveRemaining > 0) {
    // Cycle check
    if (cycleUsed >= CYCLE_LIMIT) {
      warnings.push("70-hour cycle limit reached — 34-hour restart required.");
      push("off", 34 * 60, "34h restart");
      cycleUsed = 0;
      driveThisShift = 0;
      drivenSinceBreak = 0;
      windowStart = t;
      continue;
    }

    // Window check
    if (t - windowStart >= WINDOW_LIMIT || driveThisShift >= DRIVE_LIMIT) {
      push("sleeper", RESET_OFF, "10h rest");
      driveThisShift = 0;
      drivenSinceBreak = 0;
      windowStart = t;
      continue;
    }

    // 30-min break after 8h driving
    if (drivenSinceBreak >= BREAK_AFTER) {
      push("off", BREAK_LEN, "30-min break");
      drivenSinceBreak = 0;
      continue;
    }

    // How long can we drive next?
    const untilBreak = BREAK_AFTER - drivenSinceBreak;
    const untilShift = DRIVE_LIMIT - driveThisShift;
    const untilWindow = WINDOW_LIMIT - (t - windowStart);
    const untilCycle = CYCLE_LIMIT - cycleUsed;

    // miles until next fuel
    const milesUntilFuel = nextFuelMi - milesDone;
    const minutesUntilFuel = milesUntilFuel > 0 ? Math.ceil(milesUntilFuel / mphMin) : 0;

    let driveChunk = Math.min(
      driveRemaining,
      untilBreak,
      untilShift,
      untilWindow,
      untilCycle,
    );
    let willFuel = false;
    if (minutesUntilFuel > 0 && minutesUntilFuel <= driveChunk) {
      driveChunk = minutesUntilFuel;
      willFuel = true;
    }
    if (driveChunk <= 0) continue;

    const milesChunk = Math.round(driveChunk * mphMin);
    milesDone += milesChunk;
    push("driving", driveChunk, "Driving");
    drivenSinceBreak += driveChunk;
    driveThisShift += driveChunk;
    driveRemaining -= driveChunk;

    if (willFuel && driveRemaining > 0) {
      push("onDuty", FUEL_DURATION, "Fuel stop");
      nextFuelMi += FUEL_INTERVAL_MI;
    }
  }

  // Drop-off
  push("onDuty", PICKUP_DROP, "Drop-off");

  // Build daily logs
  const days = bucketDays(segments);

  return {
    segments,
    days,
    totalMinutes: t,
    totalMiles: input.totalMiles,
    drivingMinutes: totalDriveMin,
    fuelStops,
    warnings,
  };
}

function bucketDays(segments: Segment[]): DayLog[] {
  if (segments.length === 0) return [];
  const totalMin = segments[segments.length - 1].end;
  const numDays = Math.ceil(totalMin / 1440);
  const days: DayLog[] = [];
  for (let d = 0; d < numDays; d++) {
    const dayStart = d * 1440;
    const dayEnd = dayStart + 1440;
    const daySegs: Segment[] = [];
    let miles = 0;
    for (const s of segments) {
      if (s.end <= dayStart || s.start >= dayEnd) continue;
      const ds = Math.max(s.start, dayStart) - dayStart;
      const de = Math.min(s.end, dayEnd) - dayStart;
      daySegs.push({ ...s, start: ds, end: de });
      if (s.status === "driving") {
        const fraction = (Math.min(s.end, dayEnd) - Math.max(s.start, dayStart)) / (s.end - s.start);
        miles += fraction * ((s.miles ?? 0) - (segments[segments.indexOf(s) - 1]?.miles ?? 0));
      }
    }
    // Pad with off-duty
    if (daySegs.length === 0 || daySegs[0].start > 0) {
      daySegs.unshift({ status: "off", start: 0, end: daySegs[0]?.start ?? 1440, label: "Off duty" });
    }
    if (daySegs[daySegs.length - 1].end < 1440) {
      daySegs.push({ status: "off", start: daySegs[daySegs.length - 1].end, end: 1440, label: "Off duty" });
    }
    const totals = { off: 0, sleeper: 0, driving: 0, onDuty: 0 };
    for (const s of daySegs) {
      const dur = s.end - s.start;
      totals[s.status] += dur;
    }
    days.push({ day: d + 1, segments: daySegs, totals, miles: Math.round(miles) });
  }
  return days;
}

export function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
