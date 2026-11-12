import React, { useEffect } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import { LogOut } from "lucide-react";

export const SignOutConfirmSheet: React.FC = () => {
  const { isSignOutConfirmOpen, closeSignOutConfirm, confirmSignOut } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSignOutConfirmOpen) return;
      if (e.key === "Escape") {
        closeSignOutConfirm();
      } else if (e.key === "Enter") {
        confirmSignOut();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSignOutConfirmOpen, closeSignOutConfirm, confirmSignOut]);

  if (!isSignOutConfirmOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: "20px"
      }}
      onClick={closeSignOutConfirm}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "400px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          padding: "24px",
          textAlign: "center",
          border: "1px solid var(--separator)"
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 69, 58, 0.14)",
            color: "var(--accent-red)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 16px auto"
          }}
        >
          <LogOut size={20} strokeWidth={2} />
        </div>

        <h3
          style={{
            fontSize: "17px",
            fontWeight: 650,
            color: "var(--text-primary)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.015em"
          }}
        >
          Sign Out of mocktwo?
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            margin: "0 0 20px 0"
          }}
        >
          Your session progress and saved reflections will be safely synced to your account.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Button variant="secondary" size="md" onClick={closeSignOutConfirm} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={confirmSignOut} style={{ flex: 1 }}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

