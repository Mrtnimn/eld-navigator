"""
HOS (Hours of Service) Calculator
Rules: Property-carrying driver, 70hrs/8days
- Max 11 hours driving after 10 consecutive off-duty hours
- Must not drive after 14 consecutive on-duty hours
- Must take 30-minute break after 8 hours driving
- Must have 10 consecutive off-duty hours before next driving shift
- 70-hour limit in 8 consecutive days
- Fuel at least every 1,000 miles
- 1 hour for pickup and dropoff
"""

from datetime import datetime, timezone, timedelta
from collections import defaultdict

AVG_SPEED_MPH = 55
MAX_DRIVING_HOURS_PER_SHIFT = 11
MAX_ON_DUTY_WINDOW_HOURS = 14
REQUIRED_OFF_DUTY_HOURS = 10
BREAK_AFTER_DRIVING_HOURS = 8
BREAK_DURATION_HOURS = 0.5
FUEL_INTERVAL_MILES = 1000
FUEL_STOP_DURATION_HOURS = 0.5
PICKUP_DROPOFF_HOURS = 1
MAX_CYCLE_HOURS = 70


def add_hours(dt: datetime, hours: float) -> datetime:
    return dt + timedelta(hours=hours)


def interpolate_coord(start, end, fraction):
    fraction = max(0.0, min(1.0, fraction))
    return {
        "lat": start["lat"] + (end["lat"] - start["lat"]) * fraction,
        "lng": start["lng"] + (end["lng"] - start["lng"]) * fraction,
    }


def calculate_trip(
    current_coord, pickup_coord, dropoff_coord,
    current_location, pickup_location, dropoff_location,
    route_to_pickup_miles, route_to_dropoff_miles,
    current_cycle_used_hours,
    driver_name="Driver Name",
    carrier_name="Carrier Co.",
    truck_number="TRK-001",
):
    warnings = []
    total_distance_miles = route_to_pickup_miles + route_to_dropoff_miles

    # Start time: today at 06:00 UTC
    now = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0, microsecond=0)
    current_time = now

    stops = []
    eld_entries_by_day = defaultdict(list)

    def add_eld_entry(status, start_dt, end_dt, location, remarks):
        cursor = start_dt
        while cursor < end_dt:
            day_str = cursor.strftime("%Y-%m-%d")
            midnight = (cursor + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            seg_end = min(end_dt, midnight)
            start_h = cursor.hour + cursor.minute / 60.0
            # Handle overnight: if seg_end crosses midnight, cap at 24
            if seg_end.date() > cursor.date():
                end_h = 24.0
            else:
                end_h = seg_end.hour + seg_end.minute / 60.0
            if end_h > start_h:
                eld_entries_by_day[day_str].append({
                    "status": status,
                    "startHour": round(start_h, 4),
                    "endHour": round(end_h, 4),
                    "location": location,
                    "remarks": remarks,
                })
            cursor = seg_end

    cycle_hours_used = current_cycle_used_hours
    last_fuel_mile = 0.0
    shift_driving_hours = 0.0
    shift_on_duty_hours = 0.0
    driving_after_last_break = 0.0
    rest_stops = 0
    fuel_stops = 0
    odometer = 0.0

    # Pre-trip inspection
    pre_trip_end = add_hours(current_time, 0.25)
    add_eld_entry("on_duty_not_driving", current_time, pre_trip_end, current_location, "Pre-trip inspection")
    shift_on_duty_hours += 0.25

    stops.append({
        "type": "current",
        "label": "Start",
        "location": current_coord,
        "locationName": current_location,
        "arrivalTime": current_time.isoformat(),
        "departureTime": pre_trip_end.isoformat(),
        "durationHours": 0.25,
        "distanceFromStartMiles": 0.0,
        "notes": "Pre-trip inspection",
    })
    current_time = pre_trip_end

    def drive_segment(from_mile, to_mile, from_coord, to_coord, from_name, to_name):
        nonlocal current_time, shift_driving_hours, shift_on_duty_hours, driving_after_last_break
        nonlocal cycle_hours_used, last_fuel_mile, rest_stops, fuel_stops, odometer

        mile_remaining = to_mile - from_mile
        local_from = from_mile

        while mile_remaining > 1e-6:
            # Check break needed
            if driving_after_last_break >= BREAK_AFTER_DRIVING_HOURS:
                break_start = current_time
                break_end = add_hours(current_time, BREAK_DURATION_HOURS)
                frac = (local_from - from_mile) / max(to_mile - from_mile, 1e-9)
                break_loc = interpolate_coord(from_coord, to_coord, frac)
                break_name = f"Rest area (mile {round(local_from)})"
                add_eld_entry("off_duty", break_start, break_end, break_name, "30-min mandatory break")
                stops.append({
                    "type": "break",
                    "label": "30-min Break",
                    "location": break_loc,
                    "locationName": break_name,
                    "arrivalTime": break_start.isoformat(),
                    "departureTime": break_end.isoformat(),
                    "durationHours": BREAK_DURATION_HOURS,
                    "distanceFromStartMiles": local_from,
                    "notes": "Mandatory 30-minute break after 8 hours of driving",
                })
                current_time = break_end
                shift_on_duty_hours += BREAK_DURATION_HOURS
                driving_after_last_break = 0.0

            # Calculate remaining capacity
            remaining_drive_in_shift = min(
                MAX_DRIVING_HOURS_PER_SHIFT - shift_driving_hours,
                MAX_ON_DUTY_WINDOW_HOURS - shift_on_duty_hours,
                BREAK_AFTER_DRIVING_HOURS - driving_after_last_break,
            )

            if remaining_drive_in_shift <= 1e-6:
                # 10-hour rest needed
                rest_start = current_time
                rest_end = add_hours(current_time, REQUIRED_OFF_DUTY_HOURS)
                frac = (local_from - from_mile) / max(to_mile - from_mile, 1e-9)
                rest_loc = interpolate_coord(from_coord, to_coord, frac)
                rest_name = f"Truck stop (mile {round(local_from)})"
                sleeper_end = add_hours(rest_start, REQUIRED_OFF_DUTY_HOURS * 0.8)
                add_eld_entry("sleeper_berth", rest_start, sleeper_end, rest_name, "Sleeper berth")
                add_eld_entry("off_duty", sleeper_end, rest_end, rest_name, "Off duty")
                stops.append({
                    "type": "rest",
                    "label": "10-hr Rest",
                    "location": rest_loc,
                    "locationName": rest_name,
                    "arrivalTime": rest_start.isoformat(),
                    "departureTime": rest_end.isoformat(),
                    "durationHours": REQUIRED_OFF_DUTY_HOURS,
                    "distanceFromStartMiles": local_from,
                    "notes": "Mandatory 10-hour rest period",
                })
                current_time = rest_end
                shift_driving_hours = 0.0
                shift_on_duty_hours = 0.0
                driving_after_last_break = 0.0
                rest_stops += 1
                post_end = add_hours(current_time, 0.25)
                add_eld_entry("on_duty_not_driving", current_time, post_end, rest_name, "Post/pre-trip inspection")
                current_time = post_end
                shift_on_duty_hours += 0.25
                continue

            miles_to_next_fuel = FUEL_INTERVAL_MILES - (local_from - last_fuel_mile)
            miles_before_break = remaining_drive_in_shift * AVG_SPEED_MPH
            miles_can_drive = min(mile_remaining, miles_before_break, miles_to_next_fuel)
            miles_can_drive = max(miles_can_drive, 1e-6)

            drive_hours = miles_can_drive / AVG_SPEED_MPH
            drive_start = current_time
            drive_end = add_hours(current_time, drive_hours)

            frac_start = (local_from - from_mile) / max(to_mile - from_mile, 1e-9)
            drive_loc = interpolate_coord(from_coord, to_coord, frac_start)
            add_eld_entry(
                "driving", drive_start, drive_end,
                f"{drive_loc['lat']:.4f},{drive_loc['lng']:.4f}",
                f"En route to {to_name}"
            )

            current_time = drive_end
            shift_driving_hours += drive_hours
            shift_on_duty_hours += drive_hours
            driving_after_last_break += drive_hours
            cycle_hours_used += drive_hours
            local_from += miles_can_drive
            odometer += miles_can_drive
            mile_remaining -= miles_can_drive

            # Fuel stop if needed and not at destination
            if (local_from - last_fuel_mile) >= FUEL_INTERVAL_MILES and mile_remaining > 1e-6:
                fuel_start = current_time
                fuel_end = add_hours(current_time, FUEL_STOP_DURATION_HOURS)
                frac = (local_from - from_mile) / max(to_mile - from_mile, 1e-9)
                fuel_loc = interpolate_coord(from_coord, to_coord, min(frac, 1.0))
                fuel_name = f"Fuel stop (mile {round(local_from)})"
                add_eld_entry("on_duty_not_driving", fuel_start, fuel_end, fuel_name, "Fueling")
                stops.append({
                    "type": "fuel",
                    "label": "Fuel Stop",
                    "location": fuel_loc,
                    "locationName": fuel_name,
                    "arrivalTime": fuel_start.isoformat(),
                    "departureTime": fuel_end.isoformat(),
                    "durationHours": FUEL_STOP_DURATION_HOURS,
                    "distanceFromStartMiles": local_from,
                    "notes": "Fueling stop (required every 1,000 miles)",
                })
                current_time = fuel_end
                shift_on_duty_hours += FUEL_STOP_DURATION_HOURS
                last_fuel_mile = local_from
                fuel_stops += 1

    # Leg 1: current → pickup
    drive_segment(0, route_to_pickup_miles, current_coord, pickup_coord, current_location, pickup_location)

    # Pickup
    pickup_arrival = current_time
    pickup_departure = add_hours(current_time, PICKUP_DROPOFF_HOURS)
    add_eld_entry("on_duty_not_driving", pickup_arrival, pickup_departure, pickup_location, "Pickup - loading cargo (1 hour)")
    stops.append({
        "type": "pickup",
        "label": "Pickup",
        "location": pickup_coord,
        "locationName": pickup_location,
        "arrivalTime": pickup_arrival.isoformat(),
        "departureTime": pickup_departure.isoformat(),
        "durationHours": PICKUP_DROPOFF_HOURS,
        "distanceFromStartMiles": route_to_pickup_miles,
        "notes": "1-hour pickup window for cargo loading",
    })
    current_time = pickup_departure
    shift_on_duty_hours += PICKUP_DROPOFF_HOURS

    # Leg 2: pickup → dropoff
    drive_segment(
        route_to_pickup_miles,
        route_to_pickup_miles + route_to_dropoff_miles,
        pickup_coord, dropoff_coord,
        pickup_location, dropoff_location,
    )

    # Dropoff
    dropoff_arrival = current_time
    dropoff_departure = add_hours(current_time, PICKUP_DROPOFF_HOURS)
    add_eld_entry("on_duty_not_driving", dropoff_arrival, dropoff_departure, dropoff_location, "Dropoff - unloading cargo (1 hour)")
    stops.append({
        "type": "dropoff",
        "label": "Dropoff",
        "location": dropoff_coord,
        "locationName": dropoff_location,
        "arrivalTime": dropoff_arrival.isoformat(),
        "departureTime": dropoff_departure.isoformat(),
        "durationHours": PICKUP_DROPOFF_HOURS,
        "distanceFromStartMiles": total_distance_miles,
        "notes": "1-hour dropoff window for cargo unloading",
    })

    if cycle_hours_used > MAX_CYCLE_HOURS:
        warnings.append(
            f"Cycle hours exceeded: {cycle_hours_used:.1f} hrs used (max 70 hrs/8 days). Trip will require cycle reset."
        )

    cycle_hours_remaining = max(0.0, MAX_CYCLE_HOURS - cycle_hours_used)

    # Build ELD log sheets
    eld_logs = []
    sorted_days = sorted(eld_entries_by_day.keys())
    day_odometer = 0.0

    for idx, date_str in enumerate(sorted_days):
        entries = sorted(eld_entries_by_day[date_str], key=lambda e: e["startHour"])
        filled = []
        cursor = 0.0
        for entry in entries:
            if entry["startHour"] > cursor + 1e-6:
                filled.append({
                    "status": "off_duty",
                    "startHour": round(cursor, 4),
                    "endHour": round(entry["startHour"], 4),
                    "location": "",
                    "remarks": "Off duty",
                })
            filled.append(entry)
            cursor = entry["endHour"]
        if cursor < 24.0 - 1e-6:
            filled.append({
                "status": "off_duty",
                "startHour": round(cursor, 4),
                "endHour": 24.0,
                "location": "",
                "remarks": "Off duty",
            })

        driving_hrs = sum(e["endHour"] - e["startHour"] for e in filled if e["status"] == "driving")
        on_duty_hrs = sum(e["endHour"] - e["startHour"] for e in filled if e["status"] == "on_duty_not_driving")
        off_duty_hrs = sum(e["endHour"] - e["startHour"] for e in filled if e["status"] in ("off_duty", "sleeper_berth"))

        day_miles = round(driving_hrs * AVG_SPEED_MPH)
        start_odo = day_odometer
        day_odometer += day_miles

        eld_logs.append({
            "date": date_str,
            "dayNumber": idx + 1,
            "entries": filled,
            "totalDrivingHours": round(driving_hrs, 1),
            "totalOnDutyHours": round(on_duty_hrs, 1),
            "totalOffDutyHours": round(off_duty_hrs, 1),
            "vehicleMiles": day_miles,
            "startOdometer": round(start_odo),
            "endOdometer": round(day_odometer),
            "startLocation": current_location if idx == 0 else pickup_location,
            "endLocation": dropoff_location if idx == len(sorted_days) - 1 else "En route",
            "carrierName": carrier_name,
            "driverName": driver_name,
            "truckNumber": truck_number,
        })

    total_driving_hours = total_distance_miles / AVG_SPEED_MPH

    summary = {
        "totalDistanceMiles": round(total_distance_miles),
        "estimatedDrivingHours": round(total_driving_hours, 1),
        "estimatedTotalDays": len(sorted_days),
        "numberOfFuelStops": fuel_stops,
        "numberOfRestStops": rest_stops,
        "hosCompliant": cycle_hours_used <= MAX_CYCLE_HOURS,
        "cycleHoursRemainingAfterTrip": round(cycle_hours_remaining, 1),
        "warnings": warnings,
    }

    return summary, stops, eld_logs
