import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "./Badge";
import { AudioVisualizer } from "./AudioVisualizer";
import { GuestPicker } from "./GuestPicker";
import { formatRoomNumber, renderScenarioText, type Guest } from "../../types";
import {
  Mic,
  Video,
  X,
  Target,
  Play
} from "lucide-react";

export const BriefingSheet: React.FC = () => {
  const {
    isBriefingOpen,
    closeBriefing,
    selectedScenario,
    beginSimulation,
    activeSessionGuest,
    setSessionGuest,
    guests,
    settings,
    updateSettings
  } = useApp();

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);

  // Active guest for this session (falls back to scenario default)
  const currentGuest: Guest = useMemo(() => {
    if (activeSessionGuest) return activeSessionGuest;
    const defaultG = guests.find((g) => g.id === selectedScenario.guestId || g.name === selectedScenario.guestName);
    return defaultG || guests[0];
  }, [activeSessionGuest, guests, selectedScenario]);

  const handleSelectGuest = (newGuest: Guest) => {
    if (settings.reducedMotion) {
      setSessionGuest(newGuest);
      return;
    }
    setIsCrossfading(true);
    setTimeout(() => {
      setSessionGuest(newGuest);
      setIsCrossfading(false);
    }, 75);
  };

  // Handle escape to close (only when countdown not running)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isBriefingOpen && countdown === null) {
        closeBriefing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBriefingOpen, countdown, closeBriefing]);

  // Countdown timer before simulation begins
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 1) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 650);
      return () => clearTimeout(timer);
    } else if (countdown === 1) {
      const timer = setTimeout(() => {
        setCountdown(null);
        beginSimulation(currentGuest);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [countdown, beginSimulation, currentGuest]);

  if (!isBriefingOpen) return null;

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

  const handleStartSession = () => {
    setCountdown(3);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "grid",
        placeItems: "center",
        padding: "24px"
      }}
      onClick={() => {
        if (countdown === null) closeBriefing();
      }}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "880px",
          height: "580px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          border: "1px solid var(--separator)"
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1100,
              backgroundColor: "rgba(11, 11, 12, 0.92)",
              backdropFilter: "blur(20px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px"
            }}
          >
            <span
              className="font-serif-luxury"
              style={{
                fontSize: "72px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1
              }}
            >
              {countdown}
            </span>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", letterSpacing: "0.02em" }}>
              Connecting live feed with {currentGuest.name}…
            </span>
          </div>
        )}

        {/* Sheet Top Bar */}
        <div
          style={{
            height: "52px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CategoryIcon type={selectedScenario.interactionType} size={26} />
            <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
              Session Briefing
            </span>
            <Badge variant="neutral" size="sm">
              {selectedScenario.interactionType}
            </Badge>
          </div>

          <button
            onClick={closeBriefing}
            aria-label="Close"
            style={{
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              display: "grid",
              placeItems: "center",
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
            <X size={16} />
          </button>
        </div>

        {/* Sheet Body: Split Columns */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            overflow: "hidden"
          }}
        >
          {/* Left Column: Guest Context & Objectives */}
          <div
            style={{
              padding: "24px 28px",
              borderRight: "1px solid var(--separator)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            {/* Guest Summary Card (Crossfades live when guest changes) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                opacity: isCrossfading ? 0.2 : 1,
                transform: isCrossfading ? "scale(0.98)" : "scale(1)",
                transition: settings.reducedMotion ? "none" : "opacity 150ms ease, transform 150ms ease"
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--separator)",
                  boxShadow: "var(--shadow-card)",
                  flexShrink: 0,
                  backgroundColor: "var(--bg-window)"
                }}
              >
                {currentGuest.avatarUrl ? (
                  <img
                    src={currentGuest.avatarUrl}
                    alt={currentGuest.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, rgba(10, 132, 255, 0.35), rgba(191, 90, 242, 0.35))",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "18px",
                      fontWeight: 650,
                      color: "var(--text-primary)"
                    }}
                  >
                    {currentGuest.monogram || currentGuest.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: 650,
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.015em"
                  }}
                >
                  {currentGuest.name}
                </h3>
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {formatRoomNumber(currentGuest.roomNumber)} • {currentGuest.loyaltyTier}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--accent-orange)", marginTop: "2px", fontWeight: 500 }}>
                  Mood: {currentGuest.temperamentTraits.join(" & ") || currentGuest.title}
                </div>
              </div>
            </div>

            {/* GUEST Section */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary)",
                  margin: "0 0 6px 0",
                  fontWeight: 600
                }}
              >
                Guest
              </h4>
              <GuestPicker
                scenario={selectedScenario}
                selectedGuest={currentGuest}
                onSelectGuest={handleSelectGuest}
              />
            </div>

            {/* Situation Context */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary)",
                  margin: "0 0 6px 0",
                  fontWeight: 600
                }}
              >
                Situation Context
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  margin: 0
                }}
              >
                {renderScenarioText(selectedScenario.context, selectedScenario, currentGuest)}
              </p>
            </div>

            {/* Key Objectives */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary)",
                  margin: "0 0 8px 0",
                  fontWeight: 600
                }}
              >
                Key Objectives
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedScenario.learningObjectives.map((obj, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(10, 132, 255, 0.15)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        marginTop: "2px"
                      }}
                    >
                      <Target size={10} style={{ color: "var(--accent-blue)" }} />
                    </div>
                    <span style={{ fontSize: "12.5px", color: "var(--text-primary)", lineHeight: 1.45 }}>
                      {renderScenarioText(obj, selectedScenario, currentGuest)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Hardware Preview & Controls */}
          <div
            style={{
              padding: "24px 28px",
              backgroundColor: "rgba(30, 30, 32, 0.4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", margin: "0 0 12px 0", fontWeight: 600 }}>
                Hardware & Camera Check
              </h4>

              {/* 16:9 Camera tile */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  backgroundColor: "var(--bg-window)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--separator)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  marginBottom: "14px",
                  overflow: "hidden"
                }}
              >
                {cameraOff ? (
                  <span style={{ fontSize: "12.5px", color: "var(--text-tertiary)" }}>
                    Camera is turned off
                  </span>
                ) : (
                  <>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        fontWeight: 650,
                        marginBottom: "6px"
                      }}
                    >
                      EV
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      Mirror Preview
                    </span>
                  </>
                )}

                {/* Mic level visualizer */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(255, 255, 255, 0.08)"
                  }}
                >
                  <AudioVisualizer active={!micMuted} barsCount={8} size="sm" />
                </div>
              </div>

              {/* Camera & Mic selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    Camera Source
                  </label>
                  <select
                    value={settings.selectedCamera}
                    onChange={(e) => updateSettings({ selectedCamera: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none"
                    }}
                  >
                    {cameraOptions.map((cam) => (
                      <option key={cam} value={cam}>
                        {cam}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    Microphone Input
                  </label>
                  <select
                    value={settings.selectedMicrophone}
                    onChange={(e) => updateSettings({ selectedMicrophone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none"
                    }}
                  >
                    {micOptions.map((mic) => (
                      <option key={mic} value={mic}>
                        {mic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hardware toggles */}
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant={micMuted ? "outline" : "secondary"}
                  size="sm"
                  icon={<Mic size={13} />}
                  onClick={() => setMicMuted((prev) => !prev)}
                  style={{ flex: 1, fontSize: "12px" }}
                >
                  {micMuted ? "Unmute Mic" : "Mute Mic"}
                </Button>
                <Button
                  variant={cameraOff ? "outline" : "secondary"}
                  size="sm"
                  icon={<Video size={13} />}
                  onClick={() => setCameraOff((prev) => !prev)}
                  style={{ flex: 1, fontSize: "12px" }}
                >
                  {cameraOff ? "Video On" : "Video Off"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sheet Footer */}
        <div
          style={{
            height: "60px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)"
          }}
        >
          <span style={{ fontSize: "12.5px", color: "var(--text-tertiary)" }}>
            Session length: ~{selectedScenario.durationMinutes} minutes
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Button variant="secondary" size="md" onClick={closeBriefing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Play size={13} fill="currentColor" />}
              onClick={handleStartSession}
            >
              Start Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

