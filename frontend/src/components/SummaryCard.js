import React from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import HotelIcon from "@mui/icons-material/Hotel";
import SpeedIcon from "@mui/icons-material/Speed";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

function StatCard({ icon, label, value, color = "primary.main", sub }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          bgcolor: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={700} color={color} lineHeight={1}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled">
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function SummaryCard({ summary, locations }) {
  const stats = [
    {
      icon: <SpeedIcon />,
      label: "Total Distance",
      value: `${summary.total_miles.toLocaleString()} mi`,
      color: "#1565C0",
    },
    {
      icon: <AccessTimeIcon />,
      label: "Total Trip Time",
      value: `${summary.total_trip_hours}h`,
      sub: `${summary.total_driving_hours}h driving`,
      color: "#6A1B9A",
    },
    {
      icon: <CalendarTodayIcon />,
      label: "Days on Road",
      value: summary.days_on_road,
      color: "#00695C",
    },
    {
      icon: <HotelIcon />,
      label: "Rest Stops",
      value: summary.num_rest_stops,
      sub: "10-hr required rests",
      color: "#E65100",
    },
    {
      icon: <LocalGasStationIcon />,
      label: "Fuel Stops",
      value: summary.num_fuel_stops,
      sub: "every 1,000 miles",
      color: "#1B5E20",
    },
    {
      icon: <DirectionsCarIcon />,
      label: "Cycle Hours Used",
      value: `${summary.cycle_hours_used}h / 70h`,
      sub: `${(70 - summary.cycle_hours_used).toFixed(1)}h remaining`,
      color: summary.cycle_hours_used > 60 ? "#C62828" : "#1565C0",
    },
  ];

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={`From: ${locations.current.display_name.split(",").slice(0, 2).join(",")}`}
          />
          <Chip size="small" label="→" variant="outlined" sx={{ px: 0 }} />
          <Chip
            size="small"
            label={`Pickup: ${locations.pickup.display_name.split(",").slice(0, 2).join(",")}`}
            color="secondary"
          />
          <Chip size="small" label="→" variant="outlined" sx={{ px: 0 }} />
          <Chip
            size="small"
            label={`Dropoff: ${locations.dropoff.display_name.split(",").slice(0, 2).join(",")}`}
            color="success"
          />
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {stats.map((s) => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <StatCard {...s} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
