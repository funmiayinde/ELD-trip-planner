import React, { useRef, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

const STATUS_COLORS = {
  off_duty: "#4A90D9",
  sleeper: "#7B68EE",
  driving: "#27AE60",
  on_duty: "#E67E22",
};

const STATUS_LABELS = {
  off_duty: "1. Off Duty",
  sleeper: "2. Sleeper Berth",
  driving: "3. Driving",
  on_duty: "4. On Duty (Not Driving)",
};

const ROW_ORDER = ["off_duty", "sleeper", "driving", "on_duty"];

function ELDGrid({ segments, width = 700, rowHeight = 36 }) {
  const canvasRef = useRef(null);

  const PADDING_LEFT = 140; // space for row labels
  const PADDING_RIGHT = 60; // space for hour totals
  const HEADER_H = 30;
  const GRID_W = width - PADDING_LEFT - PADDING_RIGHT;
  const HEIGHT = HEADER_H + ROW_ORDER.length * rowHeight + 10;

  const hourToX = (hour) => PADDING_LEFT + (hour / 24) * GRID_W;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, HEIGHT);

    // ---- HEADER ----
    ctx.fillStyle = "#1A1A2E";
    ctx.fillRect(PADDING_LEFT, 0, GRID_W, HEADER_H);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";

    const hourLabels = [
      "Mid-\nnight",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "Noon",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "Mid-\nnight",
    ];

    for (let h = 0; h <= 24; h++) {
      const x = hourToX(h);
      const label = hourLabels[h];
      if (label.includes("\n")) {
        const parts = label.split("\n");
        ctx.fillText(parts[0], x, 11);
        ctx.fillText(parts[1], x, 22);
      } else {
        ctx.fillText(label, x, 17);
      }
    }

    // "Total Hours" label
    ctx.fillStyle = "#1A1A2E";
    ctx.font = "bold 8px Arial";
    ctx.fillText("Total", width - PADDING_RIGHT / 2 - 5, 12);
    ctx.fillText("Hours", width - PADDING_RIGHT / 2 - 5, 22);

    // ---- GRID ROWS ----
    ROW_ORDER.forEach((status, rowIdx) => {
      const rowY = HEADER_H + rowIdx * rowHeight;

      // Alternating row backgrounds
      ctx.fillStyle = rowIdx % 2 === 0 ? "#FAFAFA" : "#F5F5F5";
      ctx.fillRect(0, rowY, width, rowHeight);

      // Row label
      ctx.fillStyle = "#1A1A2E";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "left";

      const labelParts = STATUS_LABELS[status].split(". ");
      ctx.fillText(labelParts[0] + ".", 4, rowY + rowHeight / 2 - 3);
      ctx.fillStyle = "#333";
      ctx.font = "8.5px Arial";
      ctx.fillText(labelParts[1] || "", 4, rowY + rowHeight / 2 + 8);

      // Vertical gridlines (hours)
      for (let h = 0; h <= 24; h++) {
        const x = hourToX(h);
        ctx.strokeStyle =
          h % 6 === 0 ? "#999" : h % 3 === 0 ? "#CCC" : "#E8E8E8";
        ctx.lineWidth = h % 6 === 0 ? 1.5 : h % 3 === 0 ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.moveTo(x, rowY);
        ctx.lineTo(x, rowY + rowHeight);
        ctx.stroke();

        // 15-min tick marks
        if (h < 24) {
          for (let q = 1; q <= 3; q++) {
            const qx = hourToX(h + q / 4);
            ctx.strokeStyle = "#DDD";
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(qx, rowY + rowHeight - 6);
            ctx.lineTo(qx, rowY + rowHeight);
            ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = "#CCC";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(PADDING_LEFT, rowY, GRID_W, rowHeight);
      ctx.stroke();
    });

    const rowTotals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 };

    segments.forEach((seg) => {
      const status = seg.status;
      const rowIdx = ROW_ORDER.indexOf(status);
      if (rowIdx === -1) return;

      const rowY = HEADER_H + rowIdx * rowHeight;
      const x1 = hourToX(seg.start);
      const x2 = hourToX(seg.end);
      const lineY = rowY + rowHeight / 2;

      // Filled band
      ctx.fillStyle = STATUS_COLORS[status] + "35";
      ctx.fillRect(x1, rowY + 4, x2 - x1, rowHeight - 8);

      // Bold horizontal line
      ctx.strokeStyle = STATUS_COLORS[status];
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, lineY);
      ctx.lineTo(x2, lineY);
      ctx.stroke();

      // Vertical connectors at endpoints
      ctx.lineWidth = 2;
      ctx.strokeStyle = STATUS_COLORS[status];
      [x1, x2].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, rowY + 6);
        ctx.lineTo(x, rowY + rowHeight - 6);
        ctx.stroke();
      });

      rowTotals[status] = (rowTotals[status] || 0) + seg.duration;
    });

    // ---- HOUR TOTALS (right side) ----
    ROW_ORDER.forEach((status, rowIdx) => {
      const rowY = HEADER_H + rowIdx * rowHeight;
      const total = rowTotals[status] || 0;

      ctx.fillStyle = STATUS_COLORS[status];
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        total.toFixed(1),
        width - PADDING_RIGHT / 2 - 5,
        rowY + rowHeight / 2 + 4,
      );
    });

    // Border around entire grid area
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(PADDING_LEFT, 0, GRID_W, HEIGHT - 10);
    ctx.stroke();
  }, [segments, width, rowHeight]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "auto",
        maxWidth: width,
        display: "block",
      }}
    />
  );
}

export default function ELDLogSheet({
  log,
  dayNum,
  totalDays,
  locations,
  tripSummary,
}) {
  const today = new Date();
  const logDate = new Date(today);
  logDate.setDate(today.getDate() + dayNum - 1);

  const month = String(logDate.getMonth() + 1).padStart(2, "0");
  const day = String(logDate.getDate()).padStart(2, "0");
  const year = String(logDate.getFullYear());

  const totalHours =
    log.totals.off_duty +
    log.totals.sleeper +
    log.totals.driving +
    log.totals.on_duty;

  const remarks = log.segments
    .filter((s) => s.note && s.note !== "Off duty")
    .map((s) => {
      const h = Math.floor(s.start);
      const m = Math.round((s.start - h) * 60);
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      return `${timeStr} - ${s.note} (${s.duration.toFixed(2)}hrs)`;
    });

  return (
    <Card
      sx={{
        mb: 3,
        border: "2px solid #1A1A2E",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          bgcolor: "#1A1A2E",
          color: "white",
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>
          DRIVER'S DAILY LOG
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Day {dayNum} of {totalDays} &bull; (24 Hours) &bull; Original – File
          at home terminal
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                DATE
              </Typography>
              <Typography
                variant="body1"
                fontWeight={700}
                fontFamily="monospace"
              >
                {month} / {day} / {year}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                FROM (Origin)
              </Typography>
              <Typography variant="body2" fontWeight={600} noWrap>
                {locations.current.display_name
                  .split(",")
                  .slice(0, 2)
                  .join(",")}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                TO (Destination)
              </Typography>
              <Typography variant="body2" fontWeight={600} noWrap>
                {locations.dropoff.display_name
                  .split(",")
                  .slice(0, 2)
                  .join(",")}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Total Miles Driving Today
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {(log.totals.driving * 55).toFixed(0)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Name of Carrier
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ELD Trip Planner
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Main Office Address
              </Typography>
              <Typography variant="body2" fontWeight={600} noWrap>
                {locations.current.display_name
                  .split(",")
                  .slice(0, 2)
                  .join(",")}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ border: "1px solid #CCC", p: 1.5, borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Home Terminal
              </Typography>
              <Typography variant="body2" fontWeight={600} noWrap>
                {locations.current.display_name.split(",")[0]}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Grid legend */}
        <Box sx={{ display: "flex", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
          {ROW_ORDER.map((status) => (
            <Box
              key={status}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 4,
                  bgcolor: STATUS_COLORS[status],
                  borderRadius: 1,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {STATUS_LABELS[status].split(". ")[1]}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            border: "1px solid #CCC",
            borderRadius: 1,
            overflow: "hidden",
            mb: 2,
          }}
        >
          <ELDGrid segments={log.segments} width={760} rowHeight={42} />
        </Box>

        {/* Totals row */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          {ROW_ORDER.map((status) => (
            <Box
              key={status}
              sx={{
                flex: 1,
                minWidth: 120,
                p: 1.5,
                borderRadius: 1,
                bgcolor: STATUS_COLORS[status] + "20",
                border: `1px solid ${STATUS_COLORS[status]}50`,
                textAlign: "center",
              }}
            >
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                {STATUS_LABELS[status]}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                color={STATUS_COLORS[status]}
              >
                {log.totals[status].toFixed(2)}h
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              flex: 1,
              minWidth: 120,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "#1A1A2E",
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
              TOTAL
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {totalHours.toFixed(2)}h
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Remarks */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            REMARKS
          </Typography>
          <Box
            sx={{
              border: "1px solid #CCC",
              borderRadius: 1,
              p: 2,
              minHeight: 80,
              bgcolor: "#FAFAFA",
            }}
          >
            {remarks.length === 0 ? (
              <Typography
                variant="body2"
                color="text.disabled"
                fontStyle="italic"
              >
                Off duty / rest day — no activities recorded
              </Typography>
            ) : (
              remarks.map((r, i) => (
                <Typography
                  key={i}
                  variant="body2"
                  fontFamily="monospace"
                  fontSize="0.8rem"
                  lineHeight={1.8}
                >
                  {r}
                </Typography>
              ))
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Recap section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
            RECAP — 70 Hour / 8 Day Rule
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  border: "1px solid #CCC",
                  borderRadius: 1,
                  p: 2,
                  bgcolor: "#F8F9FF",
                }}
              >
                <Typography
                  variant="caption"
                  color="primary"
                  fontWeight={700}
                  display="block"
                  mb={1}
                >
                  70-HOUR / 8-DAY RECAP
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0.5,
                  }}
                >
                  {[
                    [
                      "A. Total on-duty hours today",
                      (log.totals.driving + log.totals.on_duty).toFixed(2),
                    ],
                    [
                      "B. Total hours available tomorrow",
                      Math.max(0, 70 - tripSummary.cycle_hours_used).toFixed(2),
                    ],
                    [
                      "C. Total hours on duty last 7 days",
                      Math.min(70, tripSummary.cycle_hours_used).toFixed(2),
                    ],
                    [
                      "Cycle hours remaining",
                      Math.max(0, 70 - tripSummary.cycle_hours_used).toFixed(2),
                    ],
                  ].map(([label, val]) => (
                    <React.Fragment key={label}>
                      <Typography variant="caption" color="text.secondary">
                        {label}:
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {val} hrs
                      </Typography>
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  border: "1px solid #CCC",
                  borderRadius: 1,
                  p: 2,
                  bgcolor: "#FFF8F0",
                }}
              >
                <Typography
                  variant="caption"
                  color="secondary"
                  fontWeight={700}
                  display="block"
                  mb={1}
                >
                  SHIPPING DOCUMENTS
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  Pickup:{" "}
                  {locations.pickup.display_name
                    .split(",")
                    .slice(0, 2)
                    .join(",")}
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  Dropoff:{" "}
                  {locations.dropoff.display_name
                    .split(",")
                    .slice(0, 2)
                    .join(",")}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mt={1}
                >
                  Property Carrier • 70-hr/8-day cycle • No adverse conditions
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
