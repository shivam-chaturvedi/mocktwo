import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "surface" | "elevated";
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "surface",
  hoverable = false,
  padding = "md",
  className = "",
  style,
  ...props
}) => {
  const getPadding = () => {
    switch (padding) {
      case "none":
        return 0;
      case "sm":
        return "12px 14px";
      case "lg":
        return "20px 24px";
      case "md":
      default:
        return "16px 20px";
    }
  };

  const baseStyles: React.CSSProperties = {
    backgroundColor: variant === "elevated" ? "var(--bg-control)" : "var(--bg-elevated)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--separator)",
    boxShadow: "var(--shadow-card)",
    padding: getPadding(),
    transition: "border-color 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease",
    position: "relative",
    ...(hoverable ? { cursor: "pointer" } : {}),
    ...style
  };

  return (
    <div
      style={baseStyles}
      className={`mac-card ${hoverable ? "mac-card-hoverable" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
