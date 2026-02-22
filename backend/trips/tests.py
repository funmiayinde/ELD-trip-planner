"""
Test suite for ELD Trip Planner.

Covers:
  - HOS calculator unit tests (pure logic, no I/O)
  - API endpoint integration tests (Django test client)
"""

from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.urls import reverse

from .hos_calculator import (
    calculate_trip,
    build_daily_logs,
    fill_gaps,
    MAX_DRIVING_PER_SHIFT,
    MAX_ON_DUTY_WINDOW,
    MAX_CYCLE_HOURS,
    REQUIRED_REST,
    BREAK_TRIGGER,
    FUEL_INTERVAL_MILES,
)



class TestHOSCalculatorBasic(TestCase):

    def test_short_trip_completes(self):
        """A short trip should finish in 1 day with no rest stops."""
        logs, summary, _ = calculate_trip(100, 150, 0)
        self.assertEqual(summary["total_miles"], 250)
        self.assertGreater(len(logs), 0)
        self.assertEqual(summary["num_rest_stops"], 0)

    def test_correct_total_miles(self):
        """Total miles must exactly equal pickup_dist + dropoff_dist."""
        for d1, d2 in [(100, 200), (300, 700), (50, 50), (500, 1500)]:
            with self.subTest(d1=d1, d2=d2):
                _, summary, _ = calculate_trip(d1, d2, 0)
                self.assertEqual(summary["total_miles"], d1 + d2)

    def test_each_day_sums_to_24_hours(self):
        """Every calendar day in the log must account for all 24 hours."""
        logs, _, _ = calculate_trip(400, 800, 0)
        for log in logs:
            total = sum(log["totals"].values())
            self.assertAlmostEqual(
                total,
                24.0,
                places=1,
                msg=f"Day {log['day']} summed to {total}h, not 24h",
            )

    def test_driving_never_exceeds_11h_per_shift(self):
        """Shift driving must never exceed the 11-hour limit."""
        _, _, segments = calculate_trip(300, 1200, 0)
        shift_drive = 0.0
        for seg in segments:
            if seg["status"] == "off_duty" and seg["duration"] >= REQUIRED_REST - 0.1:
                self.assertLessEqual(shift_drive, MAX_DRIVING_PER_SHIFT + 0.01)
                shift_drive = 0.0
            elif seg["status"] == "driving":
                shift_drive += seg["duration"]
        # Check final shift too
        self.assertLessEqual(shift_drive, MAX_DRIVING_PER_SHIFT + 0.01)

    def test_cycle_hours_never_exceed_70(self):
        """Cumulative on-duty hours must never exceed the 70-hour cycle limit."""
        _, summary, _ = calculate_trip(200, 500, 40)
        self.assertLessEqual(summary["cycle_hours_used"], MAX_CYCLE_HOURS + 0.01)

    def test_cycle_hours_from_previous_shifts_respected(self):
        """Starting with high cycle hours should trigger earlier cycle restart."""
        _, summary_fresh, _ = calculate_trip(100, 500, 0)
        _, summary_used, _ = calculate_trip(100, 500, 60)
        # Starting with 60h used should result in more days (needs restart)
        self.assertGreaterEqual(
            summary_used["days_on_road"], summary_fresh["days_on_road"]
        )

    def test_fuel_stops_every_1000_miles(self):
        """Trips over 1000 miles must include at least one fuel stop."""
        _, summary, _ = calculate_trip(100, 1000, 0)
        self.assertGreaterEqual(summary["num_fuel_stops"], 1)

    def test_short_trip_no_fuel_stop(self):
        """Trips under 1000 miles should have no fuel stops."""
        _, summary, _ = calculate_trip(100, 400, 0)
        self.assertEqual(summary["num_fuel_stops"], 0)

    def test_pickup_and_dropoff_stops_present(self):
        """Stops list must contain exactly one pickup and one dropoff."""
        _, summary, _ = calculate_trip(100, 200, 0)
        stop_types = [s["type"] for s in summary["stops"]]
        self.assertIn("pickup", stop_types)
        self.assertIn("dropoff", stop_types)

    def test_long_haul_has_rest_stops(self):
        """A 1500+ mile trip must include at least one 10-hour rest."""
        _, summary, _ = calculate_trip(200, 1500, 0)
        self.assertGreater(summary["num_rest_stops"], 0)

    def test_segments_are_contiguous(self):
        """Segments must be contiguous — no gaps between end and next start."""
        _, _, segments = calculate_trip(300, 600, 0)
        for i in range(1, len(segments)):
            prev_end = segments[i - 1]["end"]
            curr_start = segments[i]["start"]
            self.assertAlmostEqual(
                prev_end,
                curr_start,
                places=3,
                msg=f"Gap between segment {i-1} and {i}: {prev_end} → {curr_start}",
            )

    def test_near_cycle_limit_completes(self):
        """A trip starting near the cycle limit must still complete (uses restart)."""
        logs, summary, _ = calculate_trip(50, 100, 68)
        self.assertEqual(summary["total_miles"], 150)
        self.assertGreater(len(logs), 0)

    def test_zero_cycle_hours(self):
        """Starting fresh (0 cycle hours) should work correctly."""
        logs, summary, _ = calculate_trip(100, 200, 0)
        self.assertEqual(summary["total_miles"], 300)


class TestHOSCalculatorEdgeCases(TestCase):

    def test_very_short_legs(self):
        """Very short legs (10 miles each) should complete in 1 day."""
        logs, summary, _ = calculate_trip(10, 10, 0)
        self.assertEqual(summary["total_miles"], 20)
        self.assertEqual(len(logs), 1)

    def test_floating_point_stability(self):
        """
        Regression test for the floating-point remaining-distance bug.
        500 / 55 * 55 = 499.95, not 500 — used to cause infinite rest loops.
        """
        # This should complete quickly, not spin forever
        logs, summary, _ = calculate_trip(500, 1500, 0)
        self.assertEqual(summary["total_miles"], 2000)
        self.assertLess(len(logs), 20)  # sanity: shouldn't take hundreds of days


class TestBuildDailyLogs(TestCase):

    def test_empty_segments_returns_empty(self):
        result = build_daily_logs([])
        self.assertEqual(result, [])

    def test_single_day_has_correct_structure(self):
        segs = [
            {
                "status": "driving",
                "start": 0,
                "end": 5,
                "duration": 5,
                "note": "Test",
                "miles": 275,
            },
            {
                "status": "off_duty",
                "start": 5,
                "end": 15,
                "duration": 10,
                "note": "Rest",
                "miles": 0,
            },
            {
                "status": "driving",
                "start": 15,
                "end": 20,
                "duration": 5,
                "note": "Test",
                "miles": 275,
            },
            {
                "status": "off_duty",
                "start": 20,
                "end": 24,
                "duration": 4,
                "note": "Off",
                "miles": 0,
            },
        ]
        logs = build_daily_logs(segs)
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["day"], 1)
        self.assertIn("totals", logs[0])
        self.assertIn("segments", logs[0])

    def test_midnight_crossing_split_correctly(self):
        """A segment that crosses midnight should be split into two days."""
        segs = [
            {
                "status": "off_duty",
                "start": 0,
                "end": 14,
                "duration": 14,
                "note": "Rest",
                "miles": 0,
            },
            {
                "status": "driving",
                "start": 14,
                "end": 28,
                "duration": 14,
                "note": "Drive",
                "miles": 770,
            },
            {
                "status": "off_duty",
                "start": 28,
                "end": 48,
                "duration": 20,
                "note": "Rest",
                "miles": 0,
            },
        ]
        logs = build_daily_logs(segs)
        self.assertEqual(len(logs), 2)
        # Both days should sum to 24h
        for log in logs:
            total = sum(log["totals"].values())
            self.assertAlmostEqual(total, 24.0, places=1)


class TestFillGaps(TestCase):

    def test_no_gap_unchanged(self):
        segs = [
            {"status": "driving", "start": 0, "end": 11, "duration": 11, "note": ""},
            {"status": "off_duty", "start": 11, "end": 24, "duration": 13, "note": ""},
        ]
        result = fill_gaps(segs)
        self.assertEqual(len(result), 2)

    def test_leading_gap_filled(self):
        segs = [
            {"status": "driving", "start": 5, "end": 16, "duration": 11, "note": ""}
        ]
        result = fill_gaps(segs)
        # Should have off_duty 0-5, driving 5-16, off_duty 16-24
        self.assertEqual(result[0]["status"], "off_duty")
        self.assertEqual(result[0]["start"], 0)
        self.assertEqual(result[0]["end"], 5)

    def test_empty_returns_full_off_duty(self):
        result = fill_gaps([])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["status"], "off_duty")
        self.assertEqual(result[0]["duration"], 24)


# ─────────────────────────────────────────────────────────────────────────────
# API endpoint — integration tests
# ─────────────────────────────────────────────────────────────────────────────

# Canonical geocode/route mock responses
MOCK_GEOCODE = {"lat": 41.8781, "lon": -87.6298, "display_name": "Chicago, IL, USA"}
MOCK_ROUTE = {
    "distance_miles": 180.5,
    "duration_hours": 3.1,
    "polyline": [[-87.6, 41.8], [-86.1, 39.7]],
    "geometry": [],
}


class TestPlanTripAPI(TestCase):

    def setUp(self):
        self.client = Client()
        self.url = reverse("plan-trip")

    def _post(self, payload):
        import json

        return self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_health_endpoint(self):
        resp = self.client.get(reverse("health"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})

    @patch("trips.views.get_route", return_value=MOCK_ROUTE)
    @patch("trips.views.geocode", return_value=MOCK_GEOCODE)
    def test_valid_request_returns_200(self, mock_geo, mock_route):
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 10,
            }
        )
        self.assertEqual(resp.status_code, 200)

    @patch("trips.views.get_route", return_value=MOCK_ROUTE)
    @patch("trips.views.geocode", return_value=MOCK_GEOCODE)
    def test_response_shape(self, mock_geo, mock_route):
        """Response must contain all required top-level keys."""
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 0,
            }
        )
        data = resp.json()
        for key in ["locations", "route", "trip_summary", "daily_logs", "map_stops"]:
            self.assertIn(key, data, f"Missing key: {key}")

    @patch("trips.views.get_route", return_value=MOCK_ROUTE)
    @patch("trips.views.geocode", return_value=MOCK_GEOCODE)
    def test_daily_logs_are_list(self, mock_geo, mock_route):
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 0,
            }
        )
        data = resp.json()
        self.assertIsInstance(data["daily_logs"], list)
        self.assertGreater(len(data["daily_logs"]), 0)

    def test_missing_location_returns_400(self):
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                # dropoff_location missing
                "current_cycle_hours": 0,
            }
        )
        self.assertEqual(resp.status_code, 400)

    def test_invalid_cycle_hours_high_returns_400(self):
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 75,  # over 70
            }
        )
        self.assertEqual(resp.status_code, 400)

    def test_invalid_cycle_hours_negative_returns_400(self):
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": -5,
            }
        )
        self.assertEqual(resp.status_code, 400)

    def test_empty_location_returns_400(self):
        resp = self._post(
            {
                "current_location": "",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 0,
            }
        )
        self.assertEqual(resp.status_code, 400)

    @patch("trips.views.geocode", side_effect=ValueError("Could not geocode: Narnia"))
    def test_geocode_failure_returns_400(self, mock_geo):
        resp = self._post(
            {
                "current_location": "Narnia",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 0,
            }
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("error", resp.json())

    @patch("trips.views.get_route", side_effect=Exception("OSRM timeout"))
    @patch("trips.views.geocode", return_value=MOCK_GEOCODE)
    def test_routing_failure_returns_502(self, mock_geo, mock_route):
        resp = self._post(
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Columbus, OH",
                "current_cycle_hours": 0,
            }
        )
        self.assertEqual(resp.status_code, 502)
        self.assertIn("error", resp.json())

    def test_get_method_not_allowed(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 405)
