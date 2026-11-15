import React from "react";
import { Camera, Mic, ShieldAlert, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "./Button";

export interface PermissionPromptProps {
  resource: "camera" | "microphone" | "both";
  status?: "granted" | "not-determined" | "denied" | "restricted" | "unknown" | "loading";
  title?: string;
  description?: string;
  onRequest?: () => void;
  onOpenSettings?: () => void;
  compact?: boolean;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  resource,
  status = "not-determined",
  title,
  description,
  onRequest,
  onOpenSettings,
  compact = false,
}) => {
  const isMac = typeof window !== "undefined" && window.electronAPI?.platform === "darwin";
  const isDenied = status === "denied" || status === "restricted";

  const defaultTitle = isDenied
    ? resource === "both"
      ? "Camera and microphone access are turned off"
      : `${resource === "camera" ? "Camera" : "Microphone"} access is turned off`
    : resource === "both"
      ? "Allow camera and microphone access"
      : `Allow ${resource === "camera" ? "camera" : "microphone"} access`;

  const defaultDescription = isDenied
    ? resource === "both"
      ? `mocktwo needs access to your camera and microphone to conduct simulation rehearsals. Enable them in ${isMac ? "System Settings > Privacy & Security" : "Windows Settings > Privacy"}.`
      : `mocktwo needs access to your ${resource} for ${resource === "camera" ? "measuring calm baseline and live video" : "voice communication"}. Enable it in ${isMac ? "System Settings > Privacy & Security" : "Windows Settings > Privacy"}.`
    : resource === "both"
      ? "Rehearsal simulations use your camera to measure composure signals and microphone for natural conversation."
      : resource === "camera"
        ? "mocktwo uses your camera locally to detect optical blood volume pulse and facial composure during rehearsals. No video is ever stored or transmitted."
        : "mocktwo uses your microphone to transcribe and evaluate speaking cadence during rehearsals.";

  const renderIcon = () => {
    if (isDenied) {
      return <ShieldAlert size={compact ? 20 : 28} style={{ color: "#ef4444" }} />;
    }
    if (resource === "camera") {
      return <Camera size={compact ? 20 : 28} style={{ color: "#3b82f6" }} />;
    }
    if (resource === "microphone") {
      return <Mic size={compact ? 20 : 28} style={{ color: "#3b82f6" }} />;
    }
    return <ShieldCheck size={compact ? 20 : 28} style={{ color: "#3b82f6" }} />;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "20px" : "32px 24px",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        gap: "14px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: compact ? "40px" : "54px",
          height: compact ? "40px" : "54px",
          borderRadius: "50%",
          backgroundColor: isDenied ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderIcon()}
      </div>

      <div>
        <h4
          style={{
            margin: "0 0 6px 0",
            fontSize: compact ? "14px" : "16px",
            fontWeight: 600,
            color: "#f3f4f6",
            letterSpacing: "-0.01em",
          }}
        >
          {title || defaultTitle}
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: compact ? "12px" : "13px",
            lineHeight: 1.5,
            color: "#9ca3af",
          }}
        >
          {description || defaultDescription}
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        {isDenied ? (
          onOpenSettings && (
            <Button
              variant="secondary"
              onClick={onOpenSettings}
              icon={<ExternalLink size={14} />}
              style={{ fontSize: "12px", height: "32px", padding: "0 14px" }}
            >
              Open {isMac ? "System Settings" : "Privacy Settings"}
            </Button>
          )
        ) : (
          onRequest && (
            <Button
              variant="primary"
              onClick={onRequest}
              style={{ fontSize: "12px", height: "32px", padding: "0 16px" }}
            >
              Allow {resource === "both" ? "Access" : resource === "camera" ? "Camera" : "Microphone"}
            </Button>
          )
        )}
      </div>

      <div
        style={{
          fontSize: "11px",
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span>🔒 Processed 100% locally on your computer</span>
      </div>
    </div>
  );
};
