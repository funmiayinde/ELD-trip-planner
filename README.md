# ELD Trip Planner

A full-stack FMCSA-compliant ELD (Electronic Logging Device) trip planning app built with **Django + React**.

## Features

- **Interactive Route Map** — OpenStreetMap with Leaflet, shows full route, pickup, dropoff & fuel stops
- **ELD Daily Log Sheets** — Canvas-rendered FMCSA-format logs for each day of the trip
- **FMCSA HOS Calculator** — Full 70hr/8-day cycle compliance:
  - 11-hour driving limit per shift
  - 14-hour driving window
  - 30-minute mandatory break after 8hrs
  - 10-hour required rest periods
  - Fuel stops every 1,000 miles
  - 1-hour pickup & dropoff time
- **Free APIs** — Nominatim (geocoding) + OSRM (routing), no API keys needed

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Python 3.11, Django 4.2, DRF        |
| Frontend | React 18, Material UI v5, React-Leaflet |
| Maps     | OpenStreetMap + Leaflet + OSRM      |
| Geocoding| Nominatim (OpenStreetMap)           |
| Deploy   | Backend: Render/Railway, Frontend: Vercel |

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

The frontend proxies `/api/*` to `http://localhost:8000` automatically.

---

## API Reference

### POST `/api/trip/plan/`

**Request:**
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Indianapolis, IN",
  "dropoff_location": "Nashville, TN",
  "current_cycle_hours": 20
}
```

**Response:**
```json
{
  "locations": { "current": {...}, "pickup": {...}, "dropoff": {...} },
  "route": {
    "leg1": { "distance_miles": 180.5, "duration_hours": 3.1, "polyline": [...] },
    "leg2": { "distance_miles": 280.0, "duration_hours": 4.8, "polyline": [...] },
    "total_distance_miles": 460.5
  },
  "trip_summary": {
    "total_miles": 460,
    "total_trip_hours": 28.5,
    "total_driving_hours": 8.4,
    "cycle_hours_used": 29.4,
    "days_on_road": 2,
    "num_rest_stops": 1,
    "num_fuel_stops": 0,
    "stops": [...]
  },
  "daily_logs": [
    {
      "day": 1,
      "segments": [
        { "status": "driving", "start": 0, "end": 3.27, "duration": 3.27, "note": "Driving to Pickup" },
        ...
      ],
      "totals": { "off_duty": 10.0, "sleeper": 0, "driving": 8.5, "on_duty": 1.5 }
    }
  ],
  "map_stops": [...]
}
```

---

## Deployment

### Backend — Render (Free Tier)

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn trip_planner.wsgi:application`
4. Set environment variable: `SECRET_KEY=<your-secret-key>`

### Frontend — Vercel

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. Set environment variable: `REACT_APP_API_URL=https://your-backend.render.com`

---

## HOS Rules Applied

| Rule | Value |
|------|-------|
| Max driving per shift | 11 hours |
| Driving window | 14 hours |
| Required rest | 10 consecutive hours |
| Break required after | 8 hours continuous driving |
| Break duration | 30 minutes |
| Cycle limit | 70 hours / 8 days |
| Fuel stop interval | Every 1,000 miles |
| Pickup/Dropoff time | 1 hour each |
| Average speed | 55 mph |

---

## Project Structure

```
eld-planner/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── trip_planner/
│   │   ├── settings.py
│   │   └── urls.py
│   └── trips/
│       ├── views.py          # API endpoint
│       ├── hos_calculator.py # Core HOS logic
│       ├── route_service.py  # Geocoding + routing
│       └── urls.py
└── frontend/
    ├── package.json
    └── src/
        ├── App.js
        └── components/
            ├── TripForm.js       # Input form
            ├── TripResults.js    # Results wrapper
            ├── SummaryCard.js    # Trip stats
            ├── RouteMap.js       # Leaflet map
            ├── ELDLogViewer.js   # Log sheet tabs
            └── ELDLogSheet.js    # Canvas ELD grid renderer
```
