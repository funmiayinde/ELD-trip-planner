"""
HOS Calculator - FMCSA Hours of Service Rules
Property-carrying driver, 70hr/8-day cycle
"""

from datetime import datetime, timedelta
import math


AVG_SPEED_MPH = 55.0
MAX_DRIVING_PER_SHIFT = 11.0
MAX_ON_DUTY_WINDOW = 14.0
REQUIRED_REST = 10.0
BREAK_TRIGGER = 8.0
BREAK_DURATION = 0.5
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_DURATION = 0.5
PICKUP_DROPOFF_DURATION = 1.0
MAX_CYCLE_HOURS = 70.0
CYCLE_RESTART_HOURS = 34.0


def hours_to_hhmm(h):
    """Convert float hours to HH:MM string."""
    total_minutes = int(round(h * 60))
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def calculate_trip(
    distance_to_pickup_miles, distance_to_dropoff_miles, current_cycle_hours
):
    """
    Main HOS calculation function.
    Returns a list of daily log entries and trip summary.
    """
    segments = []
    stops = []

    current_hour = 0.0
    cycle_hours = float(current_cycle_hours)

    shift_driving = 0.0
    shift_on_duty = 0.0
    window_open_hour = 0.0
    continuous_driving = 0.0
    miles_since_fuel = 0.0
    total_miles = 0.0

    phase = 0
    remaining_in_phase = [
        distance_to_pickup_miles,
        0,
        distance_to_dropoff_miles,
        0,
    ]

    phase_names = ["Driving to Pickup", "At Pickup", "Driving to Dropoff", "At Dropoff"]

    def add_seg(status, duration_h, note="", miles=0.0):
        nonlocal current_hour
        seg = {
            "status": status,
            "start": current_hour,
            "end": current_hour + duration_h,
            "duration": duration_h,
            "note": note,
            "miles": miles,
        }
        segments.append(seg)
        current_hour += duration_h
        return seg

    def take_rest(reason="Rest"):
        nonlocal shift_driving, shift_on_duty, window_open_hour, continuous_driving, cycle_hours
        if cycle_hours >= MAX_CYCLE_HOURS:
            add_seg("off_duty", CYCLE_RESTART_HOURS, "34-hr cycle restart")
            cycle_hours = 0.0  # Reset 8-day cycle
        else:
            add_seg("off_duty", REQUIRED_REST, reason)
        shift_driving = 0.0
        shift_on_duty = 0.0
        continuous_driving = 0.0
        window_open_hour = current_hour

    MAX_ITERATIONS = 500
    iterations = 0

    while phase <= 3 and iterations < MAX_ITERATIONS:
        iterations += 1

        if phase in (1, 3):
            on_duty_label = "Pickup (on duty)" if phase == 1 else "Dropoff (on duty)"
            dur = PICKUP_DROPOFF_DURATION

            window_elapsed = current_hour - window_open_hour
            if (
                window_elapsed + dur > MAX_ON_DUTY_WINDOW
                or cycle_hours + dur > MAX_CYCLE_HOURS
            ):
                take_rest("Rest before " + on_duty_label)
                continue

            add_seg("on_duty", dur, on_duty_label)
            shift_on_duty += dur
            cycle_hours += dur
            continuous_driving = 0.0
            if phase == 1:
                stops.append(
                    {
                        "type": "pickup",
                        "hour": current_hour - dur,
                        "note": "Pickup location",
                    }
                )
            else:
                stops.append(
                    {
                        "type": "dropoff",
                        "hour": current_hour - dur,
                        "note": "Dropoff location",
                    }
                )
            phase += 1
            continue

        remaining_dist = remaining_in_phase[phase]
        if remaining_dist <= 0.1:
            remaining_in_phase[phase] = 0.0
            phase += 1
            continue

        window_elapsed = current_hour - window_open_hour

        if (
            shift_driving >= MAX_DRIVING_PER_SHIFT
            or window_elapsed >= MAX_ON_DUTY_WINDOW
            or cycle_hours >= MAX_CYCLE_HOURS
        ):
            take_rest()
            continue

        if continuous_driving >= BREAK_TRIGGER:
            window_elapsed = current_hour - window_open_hour
            if window_elapsed + BREAK_DURATION <= MAX_ON_DUTY_WINDOW:
                add_seg("off_duty", BREAK_DURATION, "30-min mandatory break")
                continuous_driving = 0.0
            else:
                take_rest()
            continue

        if miles_since_fuel >= FUEL_INTERVAL_MILES:
            window_elapsed = current_hour - window_open_hour
            if window_elapsed + FUEL_STOP_DURATION <= MAX_ON_DUTY_WINDOW:
                add_seg("on_duty", FUEL_STOP_DURATION, "Fuel stop")
                shift_on_duty += FUEL_STOP_DURATION
                cycle_hours += FUEL_STOP_DURATION
                miles_since_fuel = 0.0
                stops.append(
                    {
                        "type": "fuel",
                        "hour": current_hour - FUEL_STOP_DURATION,
                        "note": "Fuel stop",
                    }
                )
            else:
                take_rest()
            continue

        # Calculate how long we can drive
        window_elapsed = current_hour - window_open_hour

        available_by_driving_limit = MAX_DRIVING_PER_SHIFT - shift_driving
        # available_by_window = MAX_ON_DUTY_WINDOW - window_elapsed - shift_on_duty
        available_by_window = MAX_ON_DUTY_WINDOW - window_elapsed
        available_by_cycle = MAX_CYCLE_HOURS - cycle_hours
        available_by_break = BREAK_TRIGGER - continuous_driving
        available_by_fuel = (FUEL_INTERVAL_MILES - miles_since_fuel) / AVG_SPEED_MPH
        available_by_dist = remaining_dist / AVG_SPEED_MPH

        drive_hours = min(
            available_by_driving_limit,
            available_by_window,
            available_by_cycle,
            available_by_break,
            available_by_fuel,
            available_by_dist,
        )

        drive_hours = max(drive_hours, 0.0)

        if drive_hours <= 0.001:
            take_rest()
            continue

        drive_miles = drive_hours * AVG_SPEED_MPH
        note = f"{phase_names[phase]} ({drive_miles:.1f} mi)"
        add_seg("driving", drive_hours, note, drive_miles)
        shift_driving += drive_hours
        shift_on_duty += drive_hours
        cycle_hours += drive_hours
        continuous_driving += drive_hours
        miles_since_fuel += drive_miles
        total_miles += drive_miles
        remaining_in_phase[phase] -= drive_miles

    daily_logs = build_daily_logs(segments)

    trip_summary = {
        "total_miles": round(total_miles),
        "total_trip_hours": round(current_hour, 1),
        "total_driving_hours": round(
            sum(s["duration"] for s in segments if s["status"] == "driving"), 1
        ),
        "cycle_hours_used": round(cycle_hours, 1),
        "days_on_road": len(daily_logs),
        "num_rest_stops": sum(
            1
            for s in segments
            if s["status"] == "off_duty" and s["duration"] >= REQUIRED_REST
        ),
        "num_fuel_stops": sum(1 for s in segments if "Fuel" in s.get("note", "")),
        "stops": stops,
    }

    return daily_logs, trip_summary, segments


def build_daily_logs(segments):
    """
    Convert flat segment list into per-day log entries.
    Each segment is placed on its calendar day based on start/end hours.
    A segment crossing midnight is split across days.
    """
    if not segments:
        return []

    daily_logs = []

    day_segments = {}

    for seg in segments:
        seg_start = seg["start"]
        seg_end = seg["end"]

        start_day = int(seg_start // 24)
        end_day = int(seg_end // 24)
        if seg_end % 24 == 0 and seg_end > seg_start:
            end_day -= 1

        for day in range(start_day, end_day + 1):
            day_start = day * 24.0
            day_end = (day + 1) * 24.0

            clipped_start = max(seg_start, day_start)
            clipped_end = min(seg_end, day_end)

            if clipped_end <= clipped_start:
                continue

            local_start = clipped_start - day_start
            local_end = clipped_end - day_start

            if day not in day_segments:
                day_segments[day] = []

            day_segments[day].append(
                {
                    "status": seg["status"],
                    "start": local_start,
                    "end": local_end,
                    "duration": local_end - local_start,
                    "note": seg.get("note", ""),
                }
            )

    for day_num in sorted(day_segments.keys()):
        segs = day_segments[day_num]

        segs_filled = fill_gaps(segs)

        totals = {"off_duty": 0, "sleeper": 0, "driving": 0, "on_duty": 0}
        for s in segs_filled:
            status = s["status"]
            if status in totals:
                totals[status] += s["duration"]

        daily_logs.append(
            {
                "day": day_num + 1,
                "segments": segs_filled,
                "totals": {k: round(v, 2) for k, v in totals.items()},
                "total_hours": round(sum(totals.values()), 2),
            }
        )

    return daily_logs


def fill_gaps(segments):
    """Fill any time gaps in the 0-24 hour day with off_duty."""
    if not segments:
        return [
            {"status": "off_duty", "start": 0, "end": 24, "duration": 24, "note": ""}
        ]

    segments = sorted(segments, key=lambda s: s["start"])
    filled = []
    cursor = 0.0

    for seg in segments:
        if seg["start"] > cursor + 0.01:
            filled.append(
                {
                    "status": "off_duty",
                    "start": cursor,
                    "end": seg["start"],
                    "duration": seg["start"] - cursor,
                    "note": "Off duty",
                }
            )
        filled.append(seg)
        cursor = seg["end"]

    if cursor < 23.99:
        filled.append(
            {
                "status": "off_duty",
                "start": cursor,
                "end": 24.0,
                "duration": 24.0 - cursor,
                "note": "Off duty",
            }
        )

    return filled
