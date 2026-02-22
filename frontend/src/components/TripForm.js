import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Slider,
  InputAdornment,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PlaceIcon from "@mui/icons-material/Place";
import FlagIcon from "@mui/icons-material/Flag";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const EXAMPLE_TRIPS = [
  {
    label: "Short Haul",
    current_location: "Chicago, IL",
    pickup_location: "Indianapolis, IN",
    dropoff_location: "Cincinnati, OH",
    current_cycle_hours: 10,
  },
  {
    label: "Medium Haul",
    current_location: "Dallas, TX",
    pickup_location: "Austin, TX",
    dropoff_location: "New Orleans, LA",
    current_cycle_hours: 30,
  },
  {
    label: "Long Haul",
    current_location: "Los Angeles, CA",
    pickup_location: "Phoenix, AZ",
    dropoff_location: "Denver, CO",
    current_cycle_hours: 20,
  },
];

export default function TripForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_hours: 0,
  });

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSlider = (_, value) =>
    setForm((f) => ({ ...f, current_cycle_hours: value }));

  const loadExample = (example) => {
    setForm({ ...example });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const cycleRemaining = 70 - form.current_cycle_hours;

  return (
    <Box sx={{ maxWidth: 860, mx: "auto" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" sx={{ color: "primary.main", mb: 1 }}>
          Plan Your Trip
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560, mx: "auto" }}>
          Enter your trip details below. We'll calculate your route, required
          stops, and generate FMCSA-compliant ELD log sheets automatically.
        </Typography>
      </Box>

      {/* Example trips */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          justifyContent: "center",
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        {EXAMPLE_TRIPS.map((ex) => (
          <Button
            key={ex.label}
            variant="outlined"
            size="small"
            onClick={() => loadExample(ex)}
            sx={{ borderRadius: 20, px: 2, fontSize: "0.75rem" }}
          >
            Try: {ex.label}
          </Button>
        ))}
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ fontWeight: 700, letterSpacing: 1.5 }}
                >
                  Trip Locations
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Current Location"
                  placeholder="e.g. Chicago, IL"
                  value={form.current_location}
                  onChange={handleChange("current_location")}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MyLocationIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Where you are right now"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Pickup Location"
                  placeholder="e.g. Indianapolis, IN"
                  value={form.pickup_location}
                  onChange={handleChange("pickup_location")}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PlaceIcon color="secondary" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Where you pick up the load"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Dropoff Location"
                  placeholder="e.g. Nashville, TN"
                  value={form.dropoff_location}
                  onChange={handleChange("dropoff_location")}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FlagIcon color="success" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Where you deliver the load"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ fontWeight: 700, letterSpacing: 1.5 }}
                >
                  Current 70-Hour Cycle
                </Typography>
              </Grid>

              <Grid item xs={12} md={8}>
                <Box sx={{ px: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <AccessTimeIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={500}>
                        Hours Used in Current 8-Day Cycle
                      </Typography>
                      <Tooltip title="The total on-duty hours you've accumulated over the last 8 days. Per FMCSA rules, you cannot exceed 70 hours in any 8-day period.">
                        <InfoOutlinedIcon
                          fontSize="small"
                          sx={{
                            color: "text.disabled",
                            cursor: "help",
                            ml: 0.5,
                          }}
                        />
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Typography
                        variant="body2"
                        color="error.main"
                        fontWeight={600}
                      >
                        Used: {form.current_cycle_hours}h
                      </Typography>
                      <Typography
                        variant="body2"
                        color="success.main"
                        fontWeight={600}
                      >
                        Available: {cycleRemaining}h
                      </Typography>
                    </Box>
                  </Box>
                  <Slider
                    value={form.current_cycle_hours}
                    onChange={handleSlider}
                    min={0}
                    max={70}
                    step={1}
                    marks={[
                      { value: 0, label: "0h" },
                      { value: 35, label: "35h" },
                      { value: 60, label: "60h" },
                      { value: 70, label: "70h" },
                    ]}
                    sx={{
                      color:
                        form.current_cycle_hours > 60
                          ? "error.main"
                          : form.current_cycle_hours > 40
                            ? "warning.main"
                            : "primary.main",
                      "& .MuiSlider-track": { height: 8 },
                      "& .MuiSlider-thumb": { width: 20, height: 20 },
                    }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Or enter hours manually"
                  type="number"
                  inputProps={{ min: 0, max: 70, step: 0.5 }}
                  value={form.current_cycle_hours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      current_cycle_hours: Math.min(
                        70,
                        Math.max(0, parseFloat(e.target.value) || 0),
                      ),
                    }))
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">hrs</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {error && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box
                  sx={{
                    bgcolor: "#EEF2FF",
                    borderRadius: 2,
                    p: 2,
                    border: "1px solid #C7D2FE",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="primary"
                    fontWeight={700}
                    display="block"
                    mb={0.5}
                  >
                    CALCULATION ASSUMPTIONS
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Average speed: 55 mph • Fuel every 1,000 miles (30 min stop)
                    • 1 hr pickup & dropoff • 30-min break after 8hrs driving •
                    10hr rest after 11hr driving or 14hr window • Property
                    carrier 70hr/8-day rule • No adverse conditions
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  endIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <ArrowForwardIcon />
                    )
                  }
                  sx={{ py: 1.5, fontSize: "1rem" }}
                >
                  {loading
                    ? "Calculating Trip..."
                    : "Generate Trip Plan & ELD Logs"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
