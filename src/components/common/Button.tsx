import React from "react";

export type ButtonVariant = "primary" | "secondary" | "link" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  isLoading = false,
  className = "",
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: "var(--accent-blue)",
          color: "#ffffff",
          border: "1px solid rgba(0, 0, 0, 0.2)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 1px 2px rgba(0, 0, 0, 0.25)",
          fontWeight: 500
        };
      case "secondary":
        return {
          backgroundColor: "var(--bg-control)",
          color: "var(--text-primary)",
          border: "1px solid var(--separator)",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
          fontWeight: 500
        };
      case "link":
        return {
          backgroundColor: "transparent",
          color: "var(--accent-blue)",
          border: "1px solid transparent",
          padding: 0,
          fontWeight: 450,
          height: "auto"
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: "var(--text-primary)",
          border: "1px solid var(--separator)"
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: "var(--text-secondary)",
          border: "1px solid transparent"
        };
      case "danger":
        return {
          backgroundColor: "var(--accent-red)",
          color: "#ffffff",
          border: "1px solid rgba(0, 0, 0, 0.2)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 1px 2px rgba(0, 0, 0, 0.25)",
          fontWeight: 500
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    if (variant === "link") {
      return { fontSize: "13px" };
    }

    switch (size) {
      case "sm":
        return {
          height: "28px",
          padding: "0 10px",
          fontSize: "12.5px",
          borderRadius: "var(--radius-sm)",
          gap: "5px"
        };
      case "lg":
        return {
          height: "36px",
          padding: "0 18px",
          fontSize: "14px",
          borderRadius: "var(--radius-md)",
          gap: "8px"
        };
      case "md":
      default:
        return {
          height: "32px",
          padding: "0 14px",
          fontSize: "13.5px",
          borderRadius: "var(--radius-md)",
          gap: "6px"
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    opacity: disabled || isLoading ? 0.45 : 1,
    userSelect: "none",
    whiteSpace: "nowrap",
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style
  };

  return (
    <button
      style={baseStyles}
      disabled={disabled || isLoading}
      className={`mac-btn ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          className="animate-spin-apple"
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%"
          }}
        />
      ) : (
        <>
          {icon && iconPosition === "left" && <span style={{ display: "inline-flex" }}>{icon}</span>}
          {children}
          {icon && iconPosition === "right" && <span style={{ display: "inline-flex" }}>{icon}</span>}
        </>
      )}
    </button>
  );
};
