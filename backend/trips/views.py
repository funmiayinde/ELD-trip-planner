from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as drf_status

from .hos_calculator import calculate_trip
from .route_service import geocode, get_route


class PlanTripView(APIView):
    """
    POST /api/trip/plan/

    Body:
    {
        "current_location": "Chicago, IL",
        "pickup_location": "Indianapolis, IN",
        "dropoff_location": "Nashville, TN",
        "current_cycle_hours": 20
    }
    """

    def post(self, request):
        data = request.data

        current_location = data.get("current_location", "").strip()
        pickup_location = data.get("pickup_location", "").strip()
        dropoff_location = data.get("dropoff_location", "").strip()
        current_cycle_hours = float(data.get("current_cycle_hours", 0))

        if not all([current_location, pickup_location, dropoff_location]):
            return Response(
                {"error": "All location fields are required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        if current_cycle_hours < 0 or current_cycle_hours > 70:
            return Response(
                {"error": "Current cycle hours must be between 0 and 70."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Geocode all locations
            current_coords = geocode(current_location)
            pickup_coords = geocode(pickup_location)
            dropoff_coords = geocode(dropoff_location)
        except ValueError as e:
            return Response({"error": str(e)}, status=drf_status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Geocoding failed: {str(e)}"},
                status=drf_status.HTTP_502_BAD_GATEWAY,
            )

        try:
            # Get routes
            leg1 = get_route(current_coords, pickup_coords)  # current -> pickup
            leg2 = get_route(pickup_coords, dropoff_coords)  # pickup -> dropoff
        except Exception as e:
            return Response(
                {"error": f"Routing failed: {str(e)}"},
                status=drf_status.HTTP_502_BAD_GATEWAY,
            )

        distance_to_pickup = leg1["distance_miles"]
        distance_to_dropoff = leg2["distance_miles"]

        # Calculate HOS schedule
        daily_logs, trip_summary, segments = calculate_trip(
            distance_to_pickup,
            distance_to_dropoff,
            current_cycle_hours,
        )

        # Build map stop data with coords
        map_stops = []

        # Calculate mile markers for fuel stops along total route
        total_distance = distance_to_pickup + distance_to_dropoff
        all_polyline = leg1["polyline"] + leg2["polyline"]

        # Add key locations
        map_stops.append(
            {
                "type": "current",
                "label": "Current Location",
                "coords": [current_coords["lat"], current_coords["lon"]],
                "address": current_coords["display_name"],
            }
        )

        # Add fuel stops along route
        miles_covered = 0.0
        fuel_stop_num = 1
        for seg in segments:
            if "Fuel" in seg.get("note", ""):
                miles_covered += seg.get("miles", 0)
                # Estimate coordinate along route
                frac = (
                    min(miles_covered / total_distance, 1.0)
                    if total_distance > 0
                    else 0.5
                )
                coord = _interpolate_polyline(all_polyline, frac)
                if coord:
                    map_stops.append(
                        {
                            "type": "fuel",
                            "label": f"Fuel Stop {fuel_stop_num}",
                            "coords": [coord[1], coord[0]],  # [lat, lon]
                            "address": "",
                        }
                    )
                    fuel_stop_num += 1
            elif seg["status"] == "driving":
                miles_covered += seg.get("miles", 0)

        map_stops.append(
            {
                "type": "pickup",
                "label": "Pickup",
                "coords": [pickup_coords["lat"], pickup_coords["lon"]],
                "address": pickup_coords["display_name"],
            }
        )
        map_stops.append(
            {
                "type": "dropoff",
                "label": "Dropoff",
                "coords": [dropoff_coords["lat"], dropoff_coords["lon"]],
                "address": dropoff_coords["display_name"],
            }
        )

        return Response(
            {
                "locations": {
                    "current": current_coords,
                    "pickup": pickup_coords,
                    "dropoff": dropoff_coords,
                },
                "route": {
                    "leg1": {
                        "distance_miles": round(leg1["distance_miles"], 1),
                        "duration_hours": round(leg1["duration_hours"], 2),
                        "polyline": leg1["polyline"],
                    },
                    "leg2": {
                        "distance_miles": round(leg2["distance_miles"], 1),
                        "duration_hours": round(leg2["duration_hours"], 2),
                        "polyline": leg2["polyline"],
                    },
                    "total_distance_miles": round(total_distance, 1),
                },
                "trip_summary": trip_summary,
                "daily_logs": daily_logs,
                "map_stops": map_stops,
            }
        )


def _interpolate_polyline(polyline, fraction):
    """Interpolate along polyline to get [lon, lat] at fraction."""
    import math

    if not polyline or len(polyline) < 2:
        return None

    total = 0
    lengths = []
    for i in range(1, len(polyline)):
        dx = polyline[i][0] - polyline[i - 1][0]
        dy = polyline[i][1] - polyline[i - 1][1]
        l = math.sqrt(dx * dx + dy * dy)
        lengths.append(l)
        total += l

    if total == 0:
        return polyline[0]

    target = total * fraction
    cum = 0
    for i, seg_len in enumerate(lengths):
        if cum + seg_len >= target or i == len(lengths) - 1:
            t = (target - cum) / seg_len if seg_len > 0 else 0
            t = max(0, min(1, t))
            lon = polyline[i][0] + t * (polyline[i + 1][0] - polyline[i][0])
            lat = polyline[i][1] + t * (polyline[i + 1][1] - polyline[i][1])
            return [lon, lat]
        cum += seg_len

    return polyline[-1]
