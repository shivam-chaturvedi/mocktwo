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

  const innerDiameter = Math.max(10, size - strokeWidth * 2);
  const numberFontSize = Math.max(11, Math.round(innerDiameter * 0.35));
  const percentFontSize = Math.max(7.5, Math.round(numberFontSize * 0.62));

  useEffect(() => {
    if (!animate) return;

    let start = 0;
    const duration = 750; // ms
    const startTime = performance.now();
    let animId: number = 0;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (score - start) * eased));

      if (progress < 1) {
        animId = requestAnimationFrame(frame);
      }
    };

    animId = requestAnimationFrame(frame);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
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
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: `${numberFontSize}px`,
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--text-primary)",
            display: "inline-flex",
            alignItems: "baseline",
            justifyContent: "center",
          }}
        >
          {displayedScore}
          <span
            style={{
              fontSize: `${percentFontSize}px`,
              fontWeight: 500,
              marginLeft: "1px",
              opacity: 0.85,
            }}
          >
            %
          </span>
        </span>
      </div>
    </div>
  );
};
