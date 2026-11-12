import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "440px"
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: width,
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--separator)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--separator)"
          }}
        >
          <div>
            <h3
              id="modal-title"
              style={{
                fontSize: "16px",
                fontWeight: 650,
                color: "var(--text-primary)",
                letterSpacing: "-0.015em",
                margin: 0
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  margin: "4px 0 0 0"
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.12s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
};
