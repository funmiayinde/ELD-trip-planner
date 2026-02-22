"""
Route Service - Uses free APIs:
- Nominatim (OpenStreetMap) for geocoding
- OSRM demo server for routing
"""
import requests
import math


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"

HEADERS = {
    "User-Agent": "ELDTripPlanner/1.0 (educational project)"
}


def geocode(location: str) -> dict:
    """
    Geocode a location string to lat/lon.
    Returns: {"lat": float, "lon": float, "display_name": str}
    """
    params = {
        "q": location,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }
    resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    results = resp.json()
    
    if not results:
        raise ValueError(f"Could not geocode location: {location}")
    
    r = results[0]
    return {
        "lat": float(r["lat"]),
        "lon": float(r["lon"]),
        "display_name": r.get("display_name", location),
    }


def get_route(origin_coords, destination_coords):
    """
    Get route between two lat/lon points using OSRM.
    Returns distance in miles, duration in hours, and polyline geometry.
    """
    url = f"{OSRM_URL}/{origin_coords['lon']},{origin_coords['lat']};{destination_coords['lon']},{destination_coords['lat']}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }
    resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("No route found between the given locations")
    
    route = data["routes"][0]
    distance_meters = route["distance"]
    duration_seconds = route["duration"]
    
    return {
        "distance_miles": distance_meters / 1609.344,
        "duration_hours": duration_seconds / 3600,
        "geometry": route["legs"][0].get("steps", []) if "legs" in route else [],
        "polyline": route.get("geometry", {}).get("coordinates", []),
    }


def get_intermediate_coords(polyline, fraction):
    """Get coordinates at a fraction (0-1) along the polyline."""
    if not polyline or len(polyline) < 2:
        return None
    
    total = 0
    lengths = []
    for i in range(1, len(polyline)):
        dx = polyline[i][0] - polyline[i-1][0]
        dy = polyline[i][1] - polyline[i-1][1]
        lengths.append(math.sqrt(dx*dx + dy*dy))
        total += lengths[-1]
    
    target = total * fraction
    cum = 0
    for i, seg_len in enumerate(lengths):
        if cum + seg_len >= target:
            t = (target - cum) / seg_len if seg_len > 0 else 0
            lon = polyline[i][0] + t * (polyline[i+1][0] - polyline[i][0])
            lat = polyline[i][1] + t * (polyline[i+1][1] - polyline[i][1])
            return [lon, lat]
        cum += seg_len
    
    return polyline[-1]


def estimate_fuel_stop_coords(polyline, distance_to_pickup, total_distance, fuel_stop_num, miles_since_start):
    """Estimate coordinates for a fuel stop."""
    fraction = miles_since_start / total_distance if total_distance > 0 else 0.5
    return get_intermediate_coords(polyline, min(fraction, 1.0))
