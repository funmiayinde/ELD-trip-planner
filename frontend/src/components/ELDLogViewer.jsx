import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Tooltip,
  Grid,
  Chip,
  Divider,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ELDLogSheet from "./ELDLogSheet";

export default function ELDLogViewer({ dailyLogs, locations, tripSummary }) {
  const [activeDay, setActiveDay] = useState(0);

  const handlePrint = () => {
    window.print();
  };

  const log = dailyLogs[activeDay];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          ELD Daily Log Sheets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {dailyLogs.length} log sheet{dailyLogs.length > 1 ? "s" : ""}{" "}
          generated
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<PrintIcon />}
          variant="outlined"
          size="small"
          onClick={handlePrint}
          className="no-print"
        >
          Print All Logs
        </Button>
      </Box>

      {/* Day tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeDay}
          onChange={(_, v) => setActiveDay(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ "& .MuiTab-root": { minWidth: 100, fontWeight: 600 } }}
        >
          {dailyLogs.map((log, i) => (
            <Tab
              key={i}
              label={
                <Box>
                  <Typography variant="caption" display="block">
                    Day {log.day}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: "0.6rem" }}
                    color="text.secondary"
                  >
                    {log.totals.driving.toFixed(1)}h driving
                  </Typography>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {log && (
        <Box className="print-area">
          <ELDLogSheet
            log={log}
            dayNum={activeDay + 1}
            totalDays={dailyLogs.length}
            locations={locations}
            tripSummary={tripSummary}
          />
        </Box>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { background: white; }
        }
      `}</style>
    </Box>
  );
}
