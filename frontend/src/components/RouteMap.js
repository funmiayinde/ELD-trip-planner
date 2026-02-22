import React, { useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PlaceIcon from "@mui/icons-material/Place";
import FlagIcon from "@mui/icons-material/Flag";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const makeIcon = (color, symbol) =>
  L.divIcon({
    className: "",
    html: `<div style="
    background:${color};color:white;width:32px;height:32px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;
  "><span style="transform:rotate(45deg)">${symbol}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });

const ICONS = {
  current: makeIcon("#1565C0", "📍"),
  pickup: makeIcon("#E65100", "📦"),
  dropoff: makeIcon("#2E7D32", "🏁"),
  fuel: makeIcon("#7B1FA2", "⛽"),
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60] });
    }
  }, [map, positions]);
  return null;
}

const stopMeta = {
  current: {
    color: "#1565C0",
    label: "Current Location",
    icon: <MyLocationIcon fontSize="small" />,
  },
  pickup: {
    color: "#E65100",
    label: "Pickup",
    icon: <PlaceIcon fontSize="small" />,
  },
  dropoff: {
    color: "#2E7D32",
    label: "Dropoff",
    icon: <FlagIcon fontSize="small" />,
  },
  fuel: {
    color: "#7B1FA2",
    label: "Fuel Stop",
    icon: <LocalGasStationIcon fontSize="small" />,
  },
};

export default function RouteMap({ locations, route, stops }) {
  const center = [locations.current.lat, locations.current.lon];

  // Build polylines: leg1 = current→pickup, leg2 = pickup→dropoff
  const leg1Points = route.leg1.polyline.map(([lon, lat]) => [lat, lon]);
  const leg2Points = route.leg2.polyline.map(([lon, lat]) => [lat, lon]);

  const allPositions = [
    [locations.current.lat, locations.current.lon],
    [locations.pickup.lat, locations.pickup.lon],
    [locations.dropoff.lat, locations.dropoff.lon],
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      <Card sx={{ flex: "1 1 500px", minHeight: 480 }}>
        <Box sx={{ height: 480, borderRadius: 1.5, overflow: "hidden" }}>
          <MapContainer
            center={center}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds positions={allPositions} />

            {/* Route lines */}
            {leg1Points.length > 1 && (
              <Polyline
                positions={leg1Points}
                pathOptions={{
                  color: "#1565C0",
                  weight: 4,
                  opacity: 0.8,
                  dashArray: null,
                }}
              />
            )}
            {leg2Points.length > 1 && (
              <Polyline
                positions={leg2Points}
                pathOptions={{ color: "#E65100", weight: 4, opacity: 0.8 }}
              />
            )}

            {stops.map((stop, i) => {
              const icon = ICONS[stop.type] || ICONS.current;
              const meta = stopMeta[stop.type] || stopMeta.current;
              return (
                <Marker key={i} position={stop.coords} icon={icon}>
                  <Popup>
                    <Box sx={{ minWidth: 160 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color={meta.color}
                      >
                        {stop.label}
                      </Typography>
                      {stop.address && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {stop.address.split(",").slice(0, 3).join(",")}
                        </Typography>
                      )}
                    </Box>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Box>
      </Card>
      <Card sx={{ flex: "0 0 260px" }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Trip Stops
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
              <Chip
                size="small"
                sx={{ bgcolor: "#EEF2FF", color: "#1565C0", fontWeight: 600 }}
                label={`Leg 1: ${route.leg1.distance_miles.toFixed(0)} mi`}
              />
              <Chip
                size="small"
                sx={{ bgcolor: "#FFF3E0", color: "#E65100", fontWeight: 600 }}
                label={`Leg 2: ${route.leg2.distance_miles.toFixed(0)} mi`}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Total: {route.total_distance_miles.toFixed(0)} miles
            </Typography>
          </Box>

          <List dense disablePadding>
            {stops.map((stop, i) => {
              const meta = stopMeta[stop.type] || stopMeta.current;
              return (
                <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: meta.color }}>
                    {meta.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600}>
                        {stop.label}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {(stop.address || "").split(",").slice(0, 2).join(",")}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 4,
                  bgcolor: "#1565C0",
                  borderRadius: 1,
                }}
              />
              <Typography variant="caption">Current → Pickup</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 20,
                  height: 4,
                  bgcolor: "#E65100",
                  borderRadius: 1,
                }}
              />
              <Typography variant="caption">Pickup → Dropoff</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
