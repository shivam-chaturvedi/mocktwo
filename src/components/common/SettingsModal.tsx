import React, { useState, useEffect } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import {
  X,
  Sliders,
  Mic,
  Bell,
  User,
  Shield,
  Film,
  Activity,
} from "lucide-react";
import { WELLNESS_DISCLAIMER } from "../../services/biometrics";
import type { AppSettings } from "../../types";

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    settings,
    updateSettings,
    user,
    updateUser,
    openSignOutConfirm,
    baseline,
    measureBaseline,
    showToast,
    isAuthenticated,
    navigateTo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"general" | "hardware" | "notifications" | "recordings" | "account">("general");
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [workspace, setWorkspace] = useState(user.workspace || "mocktwo Workspace");
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.metaKey && e.key === "w")) {
        e.preventDefault();
        closeSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSettings]);

  if (!isSettingsOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, role, workspace, property: workspace });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRecalibrateBaseline = async () => {
    setIsRecalibrating(true);
    try {
      await measureBaseline(30);
    } finally {
      setIsRecalibrating(false);
    }
  };

  const cameraOptions = [
    "FaceTime HD Camera (Built-in)",
    "Studio Display Camera",
    "External Webcam",
  ];

  const micOptions = [
    "MacBook Studio Microphone (Built-in)",
    "AirPods Pro",
    "External USB Microphone",
  ];

  const speakerOptions = [
    "Internal MacBook Speakers",
    "AirPods Pro (Spatial Audio)",
    "Studio Display Audio",
  ];

  const tabs: { id: "general" | "hardware" | "notifications" | "recordings" | "account"; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Sliders size={13} /> },
    { id: "hardware", label: "Audio, Video & Sensors", icon: <Mic size={13} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={13} /> },
    { id: "recordings", label: "Recordings", icon: <Film size={13} /> },
    { id: "account", label: "Account", icon: <User size={13} /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
      onClick={closeSettings}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "700px",
          height: "560px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--separator)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="mocktwo Preferences"
      >
        {/* Settings Header Toolbar */}
        <div
          style={{
            height: "76px",
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)",
            position: "relative",
          }}
        >
          <button
            onClick={closeSettings}
            aria-label="Close"
            className="hover-subtle focus-ring"
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>

          <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
            Preferences
          </span>

          {/* Segmented Toolbar Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              backgroundColor: "var(--bg-control)",
              padding: "2px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--separator)",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="focus-ring"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11.5px",
                    fontWeight: isActive ? 600 : 450,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                    boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.35)" : "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Body */}
        <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Language Selection */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Language
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Language used for counterpart voice generation and coaching reports.
                    </span>
                  </div>
                  <select
                    value={settings.language || "English (US)"}
                    onChange={(e) => updateSettings({ language: e.target.value })}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="French">French (Français)</option>
                    <option value="German">German (Deutsch)</option>
                  </select>
                </div>
              </div>

              {/* Turn-Taking Sounds */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Turn-taking sounds
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Subtle audio feedback when transitioning between dialogue speaking turns.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.hapticFeedback}
                    onChange={(e) => updateSettings({ hapticFeedback: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AUDIO, VIDEO & SENSORS TAB */}
          {activeTab === "hardware" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                  Camera Source
                </label>
                <select
                  value={settings.selectedCamera}
                  onChange={(e) => updateSettings({ selectedCamera: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                >
                  {cameraOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                  Microphone Input
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select
                    value={settings.selectedMicrophone}
                    onChange={(e) => updateSettings({ selectedMicrophone: e.target.value })}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    {micOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsTestingMic(true);
                      setTimeout(() => setIsTestingMic(false), 2000);
                    }}
                  >
                    {isTestingMic ? "Testing (98%)…" : "Test Mic"}
                  </Button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                  Speaker Output
                </label>
                <select
                  value={settings.selectedSpeaker}
                  onChange={(e) => updateSettings({ selectedSpeaker: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                >
                  {speakerOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* SENSORS SECTION: CAMERA PULSE MEASUREMENT */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Activity size={15} style={{ color: "var(--accent-red)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
                    Camera Pulse Measurement
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
                  Measures resting pulse rate, heart rate variability (HRV), and breathing using your built-in optical camera. No external straps or hardware required.
                </p>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Measurement Mode
                  </label>
                  <select
                    value={settings.heartRateSource || "camera"}
                    onChange={(e) => updateSettings({ heartRateSource: e.target.value as AppSettings["heartRateSource"] })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    <option value="camera">Optical Camera Pulse Measurement (Default)</option>
                    <option value="mock">Precision Pulse Sensor (Simulated Hardware)</option>
                    <option value="bluetooth">Bluetooth Strap / Apple Watch Bridge (BLE)</option>
                    <option value="unavailable">Disabled / Do not measure biometrics</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--separator)",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Resting Baseline Calibration
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {baseline ? (
                        <span>
                          Current baseline: <strong>{baseline.restingPulse || baseline.restingHR} bpm</strong> · HRV {baseline.restingHrvRmssd || baseline.restingHRV} ms
                        </span>
                      ) : (
                        "No baseline calibrated yet"
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRecalibrateBaseline}
                    disabled={isRecalibrating}
                  >
                    {isRecalibrating ? "Measuring…" : "Recalibrate baseline"}
                  </Button>
                </div>

                {/* Telemetry Toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Anonymous Diagnostics &amp; Telemetry
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Share anonymous crash logs and SDK calibration timing to improve mocktwo. Disabled by default.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => showToast("Telemetry preference saved (Disabled)")}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                </div>

                {/* Device-Only Privacy Notice */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(10, 132, 255, 0.06)",
                    border: "1px solid rgba(10, 132, 255, 0.2)",
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>Device-Only Privacy: </strong>
                  Video is analyzed on your device. Results are stored locally. {WELLNESS_DISCLAIMER}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "14px", borderBottom: "1px solid var(--separator)" }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                    Daily Practice Reminders
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Receive a notification before your workday to rehearse upcoming high-stakes talks.
                  </span>
                </div>
                <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                    Streak Protection
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Notify if daily rehearsal streak is at risk before 20:00.
                  </span>
                </div>
                <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px" }} />
              </div>
            </div>
          )}

          {/* RECORDINGS & PRIVACY TAB */}
          {activeTab === "recordings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                  Recording Retention Policy
                </h4>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
                  Automatically remove completed session recordings after a set period to preserve storage.
                </p>

                <select
                  value={settings.recordingsRetentionDays || 90}
                  onChange={(e) => updateSettings({ recordingsRetentionDays: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                >
                  <option value={30}>Keep for 30 days, then delete</option>
                  <option value={90}>Keep for 90 days (Recommended)</option>
                  <option value={365}>Keep for 1 year</option>
                  <option value={0}>Never auto-delete (Keep indefinitely)</option>
                </select>
              </div>

              {/* Encryption & Security Card */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(48, 209, 88, 0.08)",
                  border: "1px solid rgba(48, 209, 88, 0.25)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <Shield size={18} style={{ color: "var(--accent-green)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Local macOS Application Storage
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
                    Video buffers, body-signal metrics, and transcripts are stored locally inside the application sandbox on this Mac.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => showToast("Local recording cache cleared")}
                >
                  Clear Cached Video Buffers
                </Button>
              </div>
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === "account" && (
            !isAuthenticated || !user.email ? (
              <EmptyState
                icon={<User size={24} />}
                title="Not signed in"
                description="Sign in with your work email to access your workspace scenarios, records, and team settings."
                primaryAction={{
                  label: "Sign In",
                  onClick: () => {
                    closeSettings();
                    navigateTo("sign-in");
                  },
                }}
              />
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                      Role Title
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                      Workspace
                    </label>
                    <input
                      type="text"
                      value={workspace}
                      onChange={(e) => setWorkspace(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
                  <span style={{ fontSize: "11.5px", color: isSaved ? "var(--accent-green)" : "var(--text-tertiary)" }}>
                    {isSaved ? "Saved" : `User ID: ${user.userId || "USR-0001"}`}
                  </span>
                  <Button type="submit" variant="primary" size="sm">
                    Save Profile
                  </Button>
                </div>
              </form>

              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--accent-red)", display: "block" }}>
                    Sign Out of mocktwo
                  </span>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    Sign out of this workspace on this Mac.
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={openSignOutConfirm} style={{ color: "var(--accent-red)" }}>
                  Sign Out…
                </Button>
              </div>
            </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
