import React from "react";
import { useApp } from "../../context";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const ToastNotification: React.FC = () => {
  const { toastMessage, toastAction } = useApp();

  if (!toastMessage) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        pointerEvents: "auto"
      }}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 18px",
          borderRadius: "var(--radius-full)",
          boxShadow: "0 8px 28px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          fontSize: "12.5px",
          color: "var(--text-primary)"
        }}
      >
        <CheckCircle2 size={15} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
        <span>{toastMessage}</span>

        {toastAction && (
          <button
            onClick={toastAction.onClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--accent-blue)",
              color: "#ffffff",
              fontSize: "11.5px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              marginLeft: "4px"
            }}
          >
            <span>{toastAction.label}</span>
            <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

