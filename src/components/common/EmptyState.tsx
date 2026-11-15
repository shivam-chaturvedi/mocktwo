import React from "react";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  iconColor?: string;
  iconBgColor?: string;
  isError?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  iconColor = "var(--accent-blue)",
  iconBgColor = "rgba(10, 132, 255, 0.12)",
  isError = false,
  style,
  className,
}) => {
  const effectiveIconColor = isError ? "var(--accent-red)" : iconColor;
  const effectiveIconBgColor = isError ? "rgba(255, 69, 58, 0.12)" : iconBgColor;

  return (
    <div
      className={className}
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        boxSizing: "border-box",
        textAlign: "center",
        ...style,
      }}
    >
      {/* Soft circular icon (42px) */}
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          backgroundColor: effectiveIconBgColor,
          display: "grid",
          placeItems: "center",
          color: effectiveIconColor,
          marginBottom: "12px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Title: 15px / weight 600 */}
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>

      {/* Description: 13px secondary, max 2 lines, max-width 360px */}
      {description && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginTop: "6px",
            marginBottom: 0,
            maxWidth: "360px",
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      )}

      {/* Actions (Primary + Optional Secondary) */}
      {(primaryAction || secondaryAction) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              title={primaryAction.tooltip}
              className="mac-btn focus-ring"
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: primaryAction.disabled
                  ? "var(--bg-control)"
                  : primaryAction.variant === "secondary"
                  ? "var(--bg-control)"
                  : "var(--accent-blue)",
                color: primaryAction.disabled
                  ? "var(--text-tertiary)"
                  : primaryAction.variant === "secondary"
                  ? "var(--text-primary)"
                  : "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                border: primaryAction.variant === "secondary" ? "1px solid var(--separator)" : "none",
                cursor: primaryAction.disabled ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                opacity: primaryAction.disabled ? 0.6 : 1,
              }}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              title={secondaryAction.tooltip}
              className="mac-btn focus-ring"
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-control)",
                color: secondaryAction.disabled ? "var(--text-tertiary)" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 500,
                border: "1px solid var(--separator)",
                cursor: secondaryAction.disabled ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                opacity: secondaryAction.disabled ? 0.6 : 1,
              }}
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
