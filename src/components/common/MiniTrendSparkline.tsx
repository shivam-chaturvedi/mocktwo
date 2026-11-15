import React, { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { computeTrendYDomain } from "../../services/trendChart.ts";

export interface SessionTrendItem {
  id: string;
  score: number;
  title: string;
  date: string;
}

interface MiniTrendSparklineProps {
  sessions?: SessionTrendItem[];
  baselineScore?: number;
  height?: number;
  color?: string;
}

// Module-level custom tooltip for zero-warning React compiler / oxlint compliance
const TrendTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: "rgba(26, 26, 28, 0.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "var(--radius-sm)",
        padding: "6px 10px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
        fontSize: "11px",
        color: "var(--text-primary)",
        pointerEvents: "none",
        minWidth: "120px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontWeight: 700, color: "var(--accent-green)", fontSize: "12.5px" }}>
          {data.score}%
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
          {data.date}
        </span>
      </div>
      <div
        style={{
          fontSize: "10.5px",
          color: "var(--text-secondary)",
          marginTop: "2px",
          maxWidth: "180px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.title}
      </div>
    </div>
  );
};

export const MiniTrendSparkline: React.FC<MiniTrendSparklineProps> = ({
  sessions = [],
  baselineScore = 72,
  height = 64,
  color = "var(--accent-green)",
}) => {
  const gradId = useId().replace(/:/g, "_");

  // Fewer than 2 scored sessions: show fallback message in the same space
  if (!sessions || sessions.length < 2) {
    return (
      <div
        style={{
          width: "100%",
          height: `${height}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-control)",
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--separator)",
          padding: "8px 12px",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center" }}>
          Complete 2 sessions to see your trend
        </span>
      </div>
    );
  }

  const scores = sessions.map((s) => s.score);
  const yDomain = computeTrendYDomain(scores);
  const chartData = sessions.map((s, index) => ({
    index,
    score: s.score,
    title: s.title,
    date: s.date,
    isLatest: index === sessions.length - 1,
  }));

  const firstScore = scores[0];
  const latestScore = scores[scores.length - 1];
  const lastIndex = chartData.length - 1;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Container with explicit pixel height */}
      <div style={{ width: "100%", height: `${height}px`, position: "relative" }}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 10, bottom: 6, left: 10 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>

            {/* Non-fixed computed Y-Axis to prevent flat line perception */}
            <YAxis domain={yDomain} hide={true} />

            {/* Baseline Reference Line */}
            {baselineScore && (
              <ReferenceLine
                y={baselineScore}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
            )}

            <Tooltip content={<TrendTooltip />} isAnimationActive={false} />

            <Area
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
              dot={(props) => {
                const { cx, cy, index } = props;
                const isLatest = index === lastIndex;
                if (isLatest) {
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
                    />
                  );
                }
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={color}
                    stroke="var(--bg-elevated)"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{
                r: 5,
                fill: color,
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tiny End Labels: First value left, Latest value right */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "9.5px",
          color: "var(--text-tertiary)",
          marginTop: "1px",
          padding: "0 2px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{firstScore}%</span>
        <span style={{ fontWeight: 650, color: "var(--accent-green)" }}>{latestScore}%</span>
      </div>
    </div>
  );
};
