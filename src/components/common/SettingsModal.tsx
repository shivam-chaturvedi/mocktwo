import React, { useState, useEffect } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import {
  X,
  Sliders,
  Mic,
  Bell,
  User,
  Shield,
  Film
} from "lucide-react";

const SettingsModalDialog: React.FC = () => {
  const {
    closeSettings,
    settings,
    updateSettings,
    employee,
    updateEmployee,
    openSignOutConfirm,
    isDevMode,
    toggleDevMode,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<"general" | "hardware" | "notifications" | "recordings" | "account">("general");
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role);
  const [property, setProperty] = useState(employee.property);
  const [isTestingMic, setIsTestingMic] = useState(false);
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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmployee({ name, role, property });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const cameraOptions = [
    "FaceTime HD Camera (Built-in)",
    "Studio Display Camera",
    "External Webcam"
  ];

  const micOptions = [
    "MacBook Studio Microphone (Built-in)",
    "AirPods Pro",
    "External USB Microphone"
  ];

  const speakerOptions = [
    "Internal MacBook Speakers",
    "AirPods Pro (Spatial Audio)",
    "Studio Display Audio"
  ];

  const tabs: { id: "general" | "hardware" | "notifications" | "recordings" | "account"; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Sliders size={13} /> },
    { id: "hardware", label: "Audio & Video", icon: <Mic size={13} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={13} /> },
    { id: "recordings", label: "Recordings", icon: <Film size={13} /> },
    { id: "account", label: "Account", icon: <User size={13} /> }
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
        padding: "20px"
      }}
      onClick={closeSettings}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "680px",
          height: "540px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--separator)"
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="mocktwo Settings"
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
            position: "relative"
          }}
        >
          <button
            onClick={closeSettings}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              background: "none",
              border: "none",
              cursor: "pointer"
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
              border: "1px solid var(--separator)"
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
                    transition: "all 0.12s ease"
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
                      Primary Operational Language
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Language used for AI guest speech generation and coaching reports.
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
                      cursor: "pointer"
                    }}
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="French">French (Français)</option>
                    <option value="German">German (Deutsch)</option>
                  </select>
                </div>
              </div>

              {/* Haptic Cues */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Haptic Audio Cues
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Subtle audio feedback when transitioning between dialogue turns.
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

          {/* AUDIO & VIDEO TAB */}
          {activeTab === "hardware" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                  Camera Source
                </label>
                <select
                  value={settings.selectedCamera}
                  onChange={(e) => updateSettings({ selectedCamera: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
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
                    style={{ flex: 1, padding: "8px 12px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
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
                    {isTestingMic ? "Testing (98%)..." : "Test Mic"}
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
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
                >
                  {speakerOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
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
                    Receive a gentle reminder to complete your recommended scenario before your shift.
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
                    Notify if daily practice streak is at risk before 20:00.
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
                    fontSize: "13px"
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
                  gap: "12px"
                }}
              >
                <Shield size={18} style={{ color: "var(--accent-green)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Local macOS Sandbox Encryption
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
                    All local video buffers and transcript utterances are encrypted at rest using macOS Keychain and AES-256 in accordance with Grand Palais employee privacy standards.
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
                    style={{ width: "100%", padding: "7px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
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
                      style={{ width: "100%", padding: "7px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                      Property Assignment
                    </label>
                    <input
                      type="text"
                      value={property}
                      onChange={(e) => setProperty(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
                  <span style={{ fontSize: "11.5px", color: isSaved ? "var(--accent-green)" : "var(--text-tertiary)" }}>
                    {isSaved ? "Saved" : `Employee ID: ${employee.employeeId}`}
                  </span>
                  <Button variant="secondary" size="sm" type="submit">
                    Save Details
                  </Button>
                </div>
              </form>

              {/* Developer Diagnostics toggle */}
              <div style={{ borderTop: "1px solid var(--separator)", marginTop: "20px", paddingTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Hardware Sensor Diagnostics
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Show demonstration sensor metrics in performance reports (⌥⌘D).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDevMode}
                    onChange={toggleDevMode}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      closeSettings();
                      openSignOutConfirm();
                    }}
                  >
                    Sign Out of mocktwo…
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Footer */}
        <div
          style={{
            height: "52px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            borderTop: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.35)"
          }}
        >
          <Button variant="primary" size="sm" onClick={closeSettings}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen } = useApp();
  if (!isSettingsOpen) return null;
  return <SettingsModalDialog />;
};
