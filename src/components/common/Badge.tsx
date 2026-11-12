import React from "react";

export type BadgeVariant =
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "teal"
  | "indigo"
  | "pink"
  | "yellow"
  | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  dot = false
}) => {
  const getColors = () => {
    switch (variant) {
      case "blue":
        return {
          bg: "rgba(10, 132, 255, 0.16)",
          text: "var(--accent-blue)",
          border: "rgba(10, 132, 255, 0.28)",
          dot: "var(--accent-blue)"
        };
      case "green":
        return {
          bg: "rgba(48, 209, 88, 0.16)",
          text: "var(--accent-green)",
          border: "rgba(48, 209, 88, 0.28)",
          dot: "var(--accent-green)"
        };
      case "orange":
        return {
          bg: "rgba(255, 159, 10, 0.16)",
          text: "var(--accent-orange)",
          border: "rgba(255, 159, 10, 0.28)",
          dot: "var(--accent-orange)"
        };
      case "red":
        return {
          bg: "rgba(255, 69, 58, 0.16)",
          text: "var(--accent-red)",
          border: "rgba(255, 69, 58, 0.28)",
          dot: "var(--accent-red)"
        };
      case "purple":
        return {
          bg: "rgba(191, 90, 242, 0.16)",
          text: "var(--accent-purple)",
          border: "rgba(191, 90, 242, 0.28)",
          dot: "var(--accent-purple)"
        };
      case "teal":
        return {
          bg: "rgba(100, 210, 255, 0.16)",
          text: "var(--accent-teal)",
          border: "rgba(100, 210, 255, 0.28)",
          dot: "var(--accent-teal)"
        };
      case "indigo":
        return {
          bg: "rgba(94, 92, 230, 0.16)",
          text: "var(--accent-indigo)",
          border: "rgba(94, 92, 230, 0.28)",
          dot: "var(--accent-indigo)"
        };
      case "pink":
        return {
          bg: "rgba(255, 55, 95, 0.16)",
          text: "var(--accent-pink)",
          border: "rgba(255, 55, 95, 0.28)",
          dot: "var(--accent-pink)"
        };
      case "yellow":
        return {
          bg: "rgba(255, 214, 10, 0.16)",
          text: "var(--accent-yellow)",
          border: "rgba(255, 214, 10, 0.28)",
          dot: "var(--accent-yellow)"
        };
      case "neutral":
      default:
        return {
          bg: "rgba(255, 255, 255, 0.08)",
          text: "var(--text-secondary)",
          border: "var(--separator)",
          dot: "var(--text-tertiary)"
        };
    }
  };

  const colors = getColors();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: size === "sm" ? "1px 6px" : "2px 8px",
        fontSize: "12px",
        fontWeight: 500,
        borderRadius: "var(--radius-sm)",
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        lineHeight: 1.35,
        letterSpacing: "0.01em"
      }}
    >
      {dot && (
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: colors.dot
          }}
        />
      )}
      {children}
    </span>
  );
};
