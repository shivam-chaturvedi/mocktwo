import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from "recharts";
import type { SessionBiometrics } from "../../types";
import {
  buildTimelineSeries,
  formatTimeSeconds,
  type TimelinePoint,
} from "../../services/timelineAdapter";
import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import { WELLNESS_DISCLAIMER } from "../../services/biometrics";

interface PressureTimelineChartProps {
  biometrics: SessionBiometrics | undefined | null;
  durationSeconds: number;
  baselinePulse?: number;
  playbackTime?: number;
  onSeek?: (seconds: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Custom Recharts Tooltip styled with application design tokens
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const pt: TimelinePoint = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: "rgba(26, 26, 28, 0.94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "var(--radius-md)",
        padding: "8px 12px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
        fontSize: "11px",
        color: "var(--text-primary)",
        pointerEvents: "none",
        minWidth: "150px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontWeight: 650, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
          {pt.timeLabel}
        </span>
        <span
          style={{
            fontSize: "9.5px",
            padding: "1px 5px",
            borderRadius: "var(--radius-xs)",
            backgroundColor: pt.speaking ? "rgba(10, 132, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
            color: pt.speaking ? "var(--accent-blue)" : "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          {pt.speaking ? "Speaking" : "Listening"}
        </span>
      </div>

      {pt.isWarmingUp ? (
        <div style={{ color: "var(--text-tertiary)", fontStyle: "italic", fontSize: "10.5px" }}>
          Sensor warming up (0–12s)
        </div>
      ) : pt.outOfRange ? (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent-red)" }}>
          <AlertTriangle size={11} />
          <span style={{ fontWeight: 600 }}>&gt;110 bpm (Above range)</span>
        </div>
      ) : pt.pulse != null ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Pulse (12s avg):</span>
          <span style={{ fontWeight: 650, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
            {pt.pulse} bpm {pt.pulseConfidence ? `(${pt.pulseConfidence}%)` : ""}
          </span>
        </div>
      ) : (
        <div style={{ color: "var(--text-tertiary)", fontSize: "10.5px" }}>
          Pulse: missing reading
        </div>
      )}

      {pt.eda != null && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "var(--text-secondary)" }}>EDA arousal:</span>
          <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--accent-orange)" }}>
            {pt.eda}% relative
          </span>
        </div>
      )}

      {pt.isExcessiveMotion && (
        <div
          style={{
            marginTop: "4px",
            paddingTop: "4px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            color: "var(--accent-orange)",
            fontSize: "10px",
          }}
        >
          Motion artifact detected
        </div>
      )}

      {pt.isPeak && (
        <div
          style={{
            marginTop: "4px",
            paddingTop: "4px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            color: "var(--accent-purple)",
            fontSize: "10px",
            fontWeight: 600,
          }}
        >
          Peak #{pt.peakRank} (Click to jump to trigger at {formatTimeSeconds(pt.peakTriggerSec || 0)})
        </div>
      )}
    </div>
  );
};

export const PressureTimelineChart: React.FC<PressureTimelineChartProps> = ({
  biometrics,
  durationSeconds,
  baselinePulse = 68,
  playbackTime = 0,
  onSeek,
  style,
}) => {
  const timeline = useMemo(
    () => buildTimelineSeries(biometrics, durationSeconds, baselinePulse),
    [biometrics, durationSeconds, baselinePulse]
  );

  // Evenly spaced X-axis ticks (5 ticks from 0 to duration)
  const xTicks = useMemo(() => {
    const dur = Math.max(12, Math.round(durationSeconds || 0));
    const step = dur <= 30 ? 5 : dur <= 60 ? 10 : 15;
    const ticks: number[] = [];
    for (let t = 0; t <= dur; t += step) {
      ticks.push(t);
    }
    if (ticks[ticks.length - 1] !== dur) {
      ticks.push(dur);
    }
    return ticks;
  }, [durationSeconds]);

  // Handle Too Short (<12s) state
  if (timeline.isTooShort) {
    return (
      <div
        className="glass-surface"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "20px 22px",
          border: "1px solid var(--separator)",
          ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Activity size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
            Pressure timeline
          </span>
          <span
            style={{
              fontSize: "10.5px",
              padding: "1px 6px",
              borderRadius: "var(--radius-xs)",
              backgroundColor: "rgba(255, 159, 10, 0.15)",
              color: "var(--accent-orange)",
              fontWeight: 600,
            }}
          >
            Too short ({durationSeconds}s)
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
          Optical camera pulse rate requires at least 12 seconds to establish measurement windows. Practice for at least 15–30 seconds to capture physiological curves.
        </p>
      </div>
    );
  }

  // Handle Biometrics Unavailable state
  if (!timeline.hasBiometrics) {
    return (
      <div
        className="glass-surface"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "20px 22px",
          border: "1px solid var(--separator)",
          ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Activity size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
            Pressure timeline
          </span>
          <span
            style={{
              fontSize: "10.5px",
              padding: "1px 6px",
              borderRadius: "var(--radius-xs)",
              backgroundColor: "var(--bg-control)",
              color: "var(--text-tertiary)",
              fontWeight: 500,
            }}
          >
            Unavailable
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
          Camera pulse measurement was disabled or unavailable for this session. Enable camera pulse measurement in Settings to view autonomic curves.
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass-surface"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "16px 20px 14px",
        border: "1px solid var(--separator)",
        ...style,
      }}
      aria-label={timeline.summaryText}
    >
      {/* HTML Header: Title, Subtitle, Badges (Never cramped) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "10px",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={14} style={{ color: "var(--accent-blue)" }} />
            <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Pressure timeline
            </span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "var(--radius-xs)",
                backgroundColor:
                  timeline.status === "Full read"
                    ? "rgba(48, 209, 88, 0.15)"
                    : "rgba(10, 132, 255, 0.15)",
                color:
                  timeline.status === "Full read"
                    ? "var(--accent-green)"
                    : "var(--accent-blue)",
                fontWeight: 600,
              }}
            >
              {timeline.status}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Pulse (12 s average) and arousal (EDA proxy)
          </div>
        </div>

        {/* Quick Readout Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          {timeline.averagePulse && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "9.5px", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>
                Avg Pulse
              </span>
              <span style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {timeline.averagePulse} bpm
              </span>
            </div>
          )}
          {timeline.peakPulse && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "9.5px", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>
                Peak
              </span>
              <span style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>
                {timeline.peakPulse} bpm
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Real Data-Driven Recharts Container (Fixed 200px height, zero font stretch) */}
      <div
        style={{ width: "100%", height: 200, position: "relative", cursor: onSeek ? "pointer" : "default" }}
        onClick={(e) => {
          if (!onSeek || durationSeconds <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const plotLeft = 28;
          const plotRight = rect.width - 10;
          const plotWidth = plotRight - plotLeft;
          if (clickX >= plotLeft && clickX <= plotRight && plotWidth > 0) {
            const fraction = (clickX - plotLeft) / plotWidth;
            const seekSec = Math.max(0, Math.min(durationSeconds, Math.round(fraction * durationSeconds)));
            onSeek(seekSec);
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeline.points}
            margin={{ top: 12, right: 10, left: -22, bottom: 4 }}
            onClick={(e: any) => {
              if (onSeek) {
                if (typeof e?.activeLabel === "number") {
                  onSeek(Math.round(e.activeLabel));
                } else if (e?.activePayload && e.activePayload.length > 0) {
                  const clickedSec = e.activePayload[0].payload.t;
                  if (typeof clickedSec === "number") onSeek(Math.round(clickedSec));
                }
              }
            }}
          >
            {/* Shaded Background: 0-12s Sensor Warming Up Band */}
            <ReferenceArea
              x1={0}
              x2={Math.min(12, durationSeconds)}
              fill="rgba(255, 255, 255, 0.02)"
              strokeOpacity={0}
            />

            {/* Shaded Background: Above Measurable Range Band (>110 to 120 bpm) */}
            <ReferenceArea
              y1={110}
              y2={120}
              fill="rgba(255, 69, 58, 0.09)"
              stroke="rgba(255, 69, 58, 0.2)"
              strokeDasharray="2 2"
            />

            {/* Speaking Bands (Subtle vertical tinted strips) */}
            {timeline.speakingBands.map((band, idx) => (
              <ReferenceArea
                key={`spk-${idx}`}
                x1={band.start}
                x2={band.end}
                fill="rgba(10, 132, 255, 0.04)"
                strokeOpacity={0}
              />
            ))}

            {/* Excessive Motion Bands */}
            {timeline.motionBands.map((band, idx) => (
              <ReferenceArea
                key={`mot-${idx}`}
                x1={band.start}
                x2={band.end}
                fill="rgba(255, 159, 10, 0.09)"
                stroke="rgba(255, 159, 10, 0.25)"
                strokeDasharray="2 2"
              />
            ))}

            {/* Resting Baseline Horizontal Dashed Reference Line */}
            <ReferenceLine
              y={baselinePulse}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* Playhead Vertical Line */}
            {playbackTime > 0 && (
              <ReferenceLine
                x={playbackTime}
                stroke="#ffffff"
                strokeWidth={1.5}
                strokeOpacity={0.85}
              />
            )}

            {/* X Axis: Evenly spaced ticks as m:ss, start at 0:00, end at session duration */}
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, durationSeconds]}
              ticks={xTicks}
              tickFormatter={(val: number) => formatTimeSeconds(val)}
              tick={{ fill: "var(--text-tertiary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              stroke="var(--separator)"
              tickLine={{ stroke: "var(--separator)" }}
              axisLine={{ stroke: "var(--separator)" }}
            />

            {/* Primary Y Axis: Pulse Rate in bpm (Domain 40 to 120, ticks every 20) */}
            <YAxis
              yAxisId="pulse"
              domain={[40, 120]}
              ticks={[40, 60, 80, 100, 120]}
              tick={{ fill: "var(--text-tertiary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              stroke="var(--separator)"
              tickLine={{ stroke: "var(--separator)" }}
              axisLine={{ stroke: "var(--separator)" }}
            />

            {/* Secondary Y Axis: EDA Arousal (0 to 100 relative, hidden labels to avoid clutter) */}
            <YAxis
              yAxisId="eda"
              orientation="right"
              domain={[0, 100]}
              hide={true}
            />

            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

            {/* Solid Pulse Line (connectNulls=false to preserve gaps) */}
            <Line
              yAxisId="pulse"
              type="monotone"
              dataKey="pulse"
              stroke="var(--accent-blue)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--accent-blue)", strokeWidth: 2, fill: "#ffffff" }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Dashed EDA Proxy Trace (starts at ~35s) */}
            <Line
              yAxisId="eda"
              type="monotone"
              dataKey="eda"
              stroke="var(--accent-orange)"
              strokeWidth={1.4}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 3, stroke: "var(--accent-orange)", strokeWidth: 1.5, fill: "#ffffff" }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Peak Markers on top 2 or 3 local pulse peaks */}
            {timeline.peakPoints.map((pk) => (
              <ReferenceDot
                key={`peak-${pk.t}`}
                yAxisId="pulse"
                x={pk.t}
                y={pk.pulse!}
                r={5}
                fill="var(--accent-purple)"
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (onSeek) onSeek(pk.peakTriggerSec || Math.max(0, pk.t - 12));
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* HTML Legend (App font, 11-12px, tabular numbers) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "10px",
          paddingTop: "8px",
          borderTop: "1px solid var(--separator)",
          fontSize: "11px",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          {/* Solid Pulse */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "12px", height: "2px", backgroundColor: "var(--accent-blue)", borderRadius: "1px" }} />
            <span>Pulse (12s)</span>
          </div>

          {/* Dashed EDA */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "12px",
                height: "2px",
                borderTop: "2px dashed var(--accent-orange)",
              }}
            />
            <span>EDA arousal (relative)</span>
          </div>

          {/* Speaking Band */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                backgroundColor: "rgba(10, 132, 255, 0.18)",
                border: "1px solid rgba(10, 132, 255, 0.3)",
              }}
            />
            <span>Speaking</span>
          </div>

          {/* Peak Dot */}
          {timeline.peakPoints.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-purple)",
                  border: "1px solid #ffffff",
                }}
              />
              <span>Peak stress (click to seek -12s trigger)</span>
            </div>
          )}

          {/* Above Range */}
          {timeline.outOfRangeBands.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  backgroundColor: "rgba(255, 69, 58, 0.2)",
                  border: "1px solid rgba(255, 69, 58, 0.4)",
                }}
              />
              <span style={{ color: "var(--accent-red)" }}>&gt;110 bpm (Above range)</span>
            </div>
          )}
        </div>

        {/* Resting Baseline Annotation */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)" }}>
          <span style={{ borderTop: "1px dashed var(--text-tertiary)", width: "12px" }} />
          <span>Resting: {baselinePulse} bpm</span>
        </div>
      </div>

      {/* Footnote Disclaimer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "6px",
          fontSize: "10px",
          color: "var(--text-tertiary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ShieldCheck size={11} />
          <span>{WELLNESS_DISCLAIMER}</span>
        </div>
        <span>0:00 to 0:12s shaded as sensor warm-up window</span>
      </div>
    </div>
  );
};
