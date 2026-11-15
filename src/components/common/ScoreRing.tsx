import React, { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  animate?: boolean;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 110,
  strokeWidth = 7,
  color,
  animate = true
}) => {
  const [animatedScore, setAnimatedScore] = useState(animate ? 0 : score);

  const displayedScore = animate ? animatedScore : score;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  const defaultColor =
    score >= 90
      ? "var(--accent-green)"
      : score >= 75
      ? "var(--accent-blue)"
      : score >= 60
      ? "var(--accent-orange)"
      : "var(--accent-red)";

  const strokeColor = color || defaultColor;

  useEffect(() => {
    if (!animate) return;

    let start = 0;
    const duration = 750; // ms
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (score - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [score, animate]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center"
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--bg-control)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            transition: "stroke-dashoffset 0.15s ease-out, stroke 0.2s ease"
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: size >= 100 ? "34px" : "22px",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--text-primary)"
          }}
        >
          {displayedScore}
          <span style={{ fontSize: size >= 100 ? "18px" : "13px", fontWeight: 400, marginLeft: "1px" }}>%</span>
        </span>
      </div>
    </div>
  );
};
