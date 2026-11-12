import React, { useEffect, useState } from "react";

interface AudioVisualizerProps {
  active?: boolean;
  barsCount?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  active = true,
  barsCount = 12,
  color = "var(--success-color)",
  size = "md"
}) => {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barsCount }, () => 20)
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barsCount }, () => Math.floor(Math.random() * 70) + 15)
      );
    }, 120);

    return () => clearInterval(interval);
  }, [active, barsCount]);

  const getDimensions = () => {
    switch (size) {
      case "sm":
        return { maxHeight: "14px", barWidth: "2px", gap: "2px" };
      case "lg":
        return { maxHeight: "28px", barWidth: "3px", gap: "3px" };
      case "md":
      default:
        return { maxHeight: "20px", barWidth: "2.5px", gap: "2.5px" };
    }
  };

  const { maxHeight, barWidth, gap } = getDimensions();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: maxHeight,
        gap
      }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: barWidth,
            height: active ? `${h}%` : "15%",
            backgroundColor: color,
            borderRadius: "var(--radius-full)",
            transition: "height 0.1s ease-out, opacity 0.15s ease",
            opacity: active ? 0.9 : 0.25
          }}
        />
      ))}
    </div>
  );
};
