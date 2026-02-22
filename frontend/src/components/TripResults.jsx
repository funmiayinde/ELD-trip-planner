import React, { useState } from "react";
import { Box, Button, Grid, Typography, Tabs, Tab, Chip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MapIcon from "@mui/icons-material/Map";
import DescriptionIcon from "@mui/icons-material/Description";
import SummaryCard from "./SummaryCard";
import RouteMap from "./RouteMap";
import ELDLogViewer from "./ELDLogViewer";

export default function TripResults({ data, onReset }) {
  const [tab, setTab] = useState(0);

  const { trip_summary, daily_logs, route, locations, map_stops } = data;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onReset}
          variant="outlined"
          size="small"
        >
          New Trip
        </Button>
        <Typography variant="h5" sx={{ color: "primary.main", flex: 1 }}>
          Trip Plan Results
        </Typography>
        <Chip
          label={`${trip_summary.days_on_road} day${trip_summary.days_on_road > 1 ? "s" : ""} on road`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`${trip_summary.total_miles.toLocaleString()} miles total`}
          color="secondary"
          variant="outlined"
        />
      </Box>

      <SummaryCard summary={trip_summary} locations={locations} />

      <Box sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, "& .MuiTab-root": { fontWeight: 600 } }}
        >
          <Tab
            icon={<MapIcon fontSize="small" />}
            iconPosition="start"
            label="Route Map"
          />
          <Tab
            icon={<DescriptionIcon fontSize="small" />}
            iconPosition="start"
            label={`ELD Log Sheets (${daily_logs.length} day${daily_logs.length > 1 ? "s" : ""})`}
          />
        </Tabs>

        {tab === 0 && (
          <RouteMap locations={locations} route={route} stops={map_stops} />
        )}

        {tab === 1 && (
          <ELDLogViewer
            dailyLogs={daily_logs}
            locations={locations}
            tripSummary={trip_summary}
          />
        )}
      </Box>
    </Box>
  );
}
