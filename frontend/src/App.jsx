import React, { useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  Container,
  Chip,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import TripForm from "./components/TripForm";
import TripResults from "./components/TripResults";
import axios from "axios";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1565C0", dark: "#0D47A1", light: "#42A5F5" },
    secondary: { main: "#E65100", dark: "#BF360C", light: "#FF8A65" },
    background: { default: "#F0F4F8", paper: "#FFFFFF" },
    success: { main: "#2E7D32" },
    warning: { main: "#E65100" },
    error: { main: "#C62828" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderRadius: 12 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
        containedPrimary: {
          background: "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { "& .MuiOutlinedInput-root": { borderRadius: 8 } },
      },
    },
  },
});

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const resp = await axios.post(`${API_BASE}/api/trip/plan/`, formData);
      setResults(resp.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "An error occurred. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Box
          sx={{
            background:
              "linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%)",
            color: "white",
            py: 2.5,
            px: 3,
            boxShadow: "0 4px 20px rgba(13,71,161,0.4)",
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <LocalShippingIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, letterSpacing: "-0.5px" }}
                >
                  ELD Trip Planner
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.8, fontSize: "0.7rem" }}
                >
                  FMCSA Hours of Service Compliant • 70hr/8-day Cycle
                </Typography>
              </Box>
              <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                {["Property Carrier", "70hr/8-Day", "HOS Compliant"].map(
                  (label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                        fontWeight: 500,
                        fontSize: "0.65rem",
                      }}
                    />
                  ),
                )}
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {!results ? (
            <TripForm onSubmit={handleSubmit} loading={loading} error={error} />
          ) : (
            <TripResults data={results} onReset={handleReset} />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
