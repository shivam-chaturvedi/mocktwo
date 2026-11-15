import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "16px",
  borderRadius = "var(--radius-sm)",
  style,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "var(--bg-control)",
        opacity: 0.6,
        animation: "skeletonPulse 1.8s ease-in-out infinite",
        ...style,
      }}
    />
  );
};

export const ScreenLoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        padding: "20px 24px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width="180px" height="24px" />
        <Skeleton width="80px" height="20px" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <Skeleton height="90px" borderRadius="var(--radius-md)" />
        <Skeleton height="90px" borderRadius="var(--radius-md)" />
        <Skeleton height="90px" borderRadius="var(--radius-md)" />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height="56px" borderRadius="var(--radius-sm)" />
        ))}
      </div>
    </div>
  );
};
