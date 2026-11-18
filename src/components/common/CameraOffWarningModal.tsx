import React, { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";
import { Button } from "./Button";

export interface CameraOffWarningModalProps {
  isOpen: boolean;
  onKeepOn: () => void;
  onTurnOffAnyway: () => void;
}

export const CameraOffWarningModal: React.FC<CameraOffWarningModalProps> = ({
  isOpen,
  onKeepOn,
  onTurnOffAnyway,
}) => {
  const keepOnBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus primary "Keep camera on" by default
      keepOnBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onKeepOn();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onKeepOn]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
      onClick={onKeepOn}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "24px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(255, 69, 58, 0.4)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="camera-warning-title"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 69, 58, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-red)",
              flexShrink: 0,
            }}
          >
            <VideoOff size={20} />
          </div>
          <div>
            <h3
              id="camera-warning-title"
              style={{ margin: 0, fontSize: "16px", fontWeight: 650, color: "var(--text-primary)" }}
            >
              Camera needed for your analysis
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              Biometric telemetry will be suspended
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "var(--accent-red)",
            lineHeight: 1.5,
            margin: "0 0 22px 0",
            fontWeight: 500,
          }}
        >
          Your camera is required to capture your heart rate, HRV and breathing. If you turn it off you will lose all body analytics for this session and your credits will be used without the insights.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Button
            ref={keepOnBtnRef}
            variant="primary"
            size="sm"
            onClick={onKeepOn}
          >
            Keep camera on
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onTurnOffAnyway}
          >
            Turn off anyway
          </Button>
        </div>
      </div>
    </div>
  );
};
