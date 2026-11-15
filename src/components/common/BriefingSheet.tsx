import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "./Badge";
import { AudioVisualizer } from "./AudioVisualizer";
import { PersonaPicker } from "./PersonaPicker";
import { formatContextSetting, renderScenarioText, type Persona, VALIDATION_HINTS } from "../../types";
import { WELLNESS_DISCLAIMER } from "../../services/biometrics";
import { serviceRegistry } from "../../services/api";
import {
  Mic,
  Video,
  X,
  Target,
  Play,
  Activity,
  ShieldCheck,
} from "lucide-react";

export const BriefingSheet: React.FC = () => {
  const {
    isBriefingOpen,
    closeBriefing,
    selectedScenario,
    beginSimulation,
    activeSessionPersona,
    setSessionPersona,
    personas,
    settings,
    updateSettings,
    runMiniBaseline,
    showToast,
    openStudio,
  } = useApp();

  const isSessionServiceAvailable = serviceRegistry.session.isAvailable();

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<"camera" | "microphone" | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [isMeasuringBaseline, setIsMeasuringBaseline] = useState(false);
  const [miniBaselineProgress, setMiniBaselineProgress] = useState<number | null>(null);
  const [baselinePulseResult, setBaselinePulseResult] = useState<number | null>(null);

  // Active persona for this session (falls back to scenario default)
  const currentPersona: Persona | undefined = useMemo(() => {
    if (activeSessionPersona) return activeSessionPersona;
    if (!selectedScenario) return personas[0];
    const defaultP = personas.find(
      (p) =>
        p.id === selectedScenario.personaId ||
        p.id === selectedScenario.guestId ||
        p.name === selectedScenario.personaName ||
        p.name === selectedScenario.guestName
    );
    return defaultP || personas[0];
  }, [activeSessionPersona, personas, selectedScenario]);

  const effectivePersona: Persona = useMemo(() => {
    if (currentPersona) return currentPersona;
    return {
      id: "persona-default",
      name: selectedScenario?.personaName || selectedScenario?.guestName || "Practice Counterpart",
      monogram: (selectedScenario?.personaName || "PC").slice(0, 2).toUpperCase(),
      title: "Counterpart",
      contextSetting: selectedScenario?.contextSetting || "Meeting Room",
      seniority: selectedScenario?.seniority || "Standard",
      language: "English (US)",
      temperamentTraits: ["Direct"],
      voice: "Default",
      backstory: "Practice counterpart for conversational simulation.",
      communicationNotes: "Focus on composure and clear responses.",
      scenariosCount: 1,
      source: "Library",
    };
  }, [currentPersona, selectedScenario]);

  const handleSelectPersona = (newPersona: Persona) => {
    if (settings.reducedMotion) {
      setSessionPersona(newPersona);
      return;
    }
    setIsCrossfading(true);
    setTimeout(() => {
      setSessionPersona(newPersona);
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
        beginSimulation(effectivePersona);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [countdown, beginSimulation, effectivePersona]);

  if (!isBriefingOpen || !selectedScenario) return null;

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

  const handleStartSession = async () => {
    if (countdown !== null) return;
    setPermissionError(null);

    if (window.electronAPI?.requestMediaAccess) {
      const camOk = await window.electronAPI.requestMediaAccess("camera");
      if (!camOk) {
        setPermissionError("camera");
        return;
      }
      const micOk = await window.electronAPI.requestMediaAccess("microphone");
      if (!micOk) {
        setPermissionError("microphone");
        return;
      }
    }

    setCountdown(3);
  };

  const setting = formatContextSetting(effectivePersona.contextSetting || effectivePersona.roomNumber || "");
  const seniority = effectivePersona.seniority || effectivePersona.loyaltyTier || "";
  const tone = effectivePersona.temperamentTraits ? effectivePersona.temperamentTraits.join(" & ") : (effectivePersona.title || "");

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
        padding: "24px",
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
          border: "1px solid var(--separator)",
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
              gap: "12px",
            }}
          >
            <span
              className="tabular-nums"
              style={{
                fontSize: "72px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {countdown}
            </span>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", letterSpacing: "0.02em" }}>
              Connecting live feed with {effectivePersona.name}…
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
            backgroundColor: "rgba(42, 42, 44, 0.4)",
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
            className="hover-subtle focus-ring"
            style={{
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease",
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
            overflow: "hidden",
          }}
        >
          {/* Left Column: Persona Context & Objectives */}
          <div
            style={{
              padding: "24px 28px",
              borderRight: "1px solid var(--separator)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Header Block shows: {setting} · {seniority} · {tone} */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                opacity: isCrossfading ? 0.2 : 1,
                transform: isCrossfading ? "scale(0.98)" : "scale(1)",
                transition: settings.reducedMotion ? "none" : "opacity 150ms ease, transform 150ms ease",
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
                  backgroundColor: "var(--bg-window)",
                }}
              >
                {effectivePersona.avatarUrl ? (
                  <img
                    src={effectivePersona.avatarUrl}
                    alt={effectivePersona.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "var(--bg-control)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "18px",
                      fontWeight: 650,
                      color: "var(--text-primary)",
                    }}
                  >
                    {effectivePersona.monogram || effectivePersona.name.slice(0, 2).toUpperCase()}
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
                    letterSpacing: "-0.015em",
                  }}
                >
                  {effectivePersona.name}
                </h3>
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {setting} · {seniority}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--accent-orange)", marginTop: "2px", fontWeight: 500 }}>
                  Tone: {tone}
                </div>
              </div>
            </div>

            {/* PERSONA Section */}
            <div>
              <h4
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary)",
                  margin: "0 0 6px 0",
                  fontWeight: 600,
                }}
              >
                Persona
              </h4>
              {!currentPersona ? (
                <div style={{ padding: "16px", borderRadius: "var(--radius-md)", border: "1px dashed var(--separator)", textAlign: "center", backgroundColor: "var(--bg-control)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    No personas available
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    Create a persona to practice with.
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openStudio("persona")}>
                    New persona
                  </Button>
                </div>
              ) : (
                <PersonaPicker
                  scenario={selectedScenario}
                  selectedPersona={currentPersona}
                  onSelectPersona={handleSelectPersona}
                />
              )}
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
                  fontWeight: 600,
                }}
              >
                Situation Context
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {renderScenarioText(selectedScenario.context, selectedScenario, currentPersona)}
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
                  fontWeight: 600,
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
                        marginTop: "2px",
                      }}
                    >
                      <Target size={10} style={{ color: "var(--accent-blue)" }} />
                    </div>
                    <span style={{ fontSize: "12.5px", color: "var(--text-primary)", lineHeight: 1.45 }}>
                      {renderScenarioText(obj, selectedScenario, currentPersona)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Hardware & Camera Check */}
          <div
            className="custom-scroll"
            style={{
              padding: "20px 24px",
              backgroundColor: "rgba(30, 30, 32, 0.4)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <h4
                  style={{
                    fontSize: "11.5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-tertiary)",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  Hardware &amp; Sensor Calibration
                </h4>
                {/* Live validation hint pill */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(48, 209, 88, 0.12)",
                    border: "1px solid rgba(48, 209, 88, 0.25)",
                    fontSize: "10.5px",
                    color: "var(--accent-green)",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "var(--accent-green)" }} />
                  <span>{VALIDATION_HINTS.OK}</span>
                </div>
              </div>

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
                  marginBottom: "12px",
                  overflow: "hidden",
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
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontWeight: 650,
                        marginBottom: "4px",
                      }}
                    >
                      EV
                    </div>
                    <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      Mirror Preview
                    </span>
                  </>
                )}

                {/* Mic level visualizer */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "6px",
                    right: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <AudioVisualizer active={!micMuted} barsCount={6} size="sm" />
                </div>
              </div>

              {/* Camera & Mic Selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "3px" }}>
                      Camera Source
                    </label>
                    <select
                      value={settings.selectedCamera}
                      onChange={(e) => updateSettings({ selectedCamera: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "11.5px",
                        outline: "none",
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
                    <label style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "3px" }}>
                      Microphone
                    </label>
                    <select
                      value={settings.selectedMicrophone}
                      onChange={(e) => updateSettings({ selectedMicrophone: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "11.5px",
                        outline: "none",
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

                {/* Camera Pulse Measurement (renamed from Heart Rate Sensor) */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Activity size={13} style={{ color: "var(--accent-green)" }} />
                      <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                        Camera Pulse Measurement
                      </span>
                    </div>

                    <button
                      onClick={async () => {
                        setIsMeasuringBaseline(true);
                        setMiniBaselineProgress(0);
                        const interval = setInterval(() => {
                          setMiniBaselineProgress((p) => (p === null || p >= 95 ? p : p + 5));
                        }, 90);
                        try {
                          const p = await runMiniBaseline(20);
                          clearInterval(interval);
                          setMiniBaselineProgress(100);
                          setBaselinePulseResult(p.restingPulse);
                          showToast(`Resting pulse verified: ${p.restingPulse} bpm`);
                        } catch {
                          clearInterval(interval);
                        } finally {
                          setTimeout(() => setIsMeasuringBaseline(false), 400);
                        }
                      }}
                      disabled={isMeasuringBaseline}
                      className="hover-subtle"
                      style={{
                        fontSize: "11px",
                        color: "var(--accent-blue)",
                        fontWeight: 500,
                        background: "none",
                        border: "none",
                        cursor: "default",
                        padding: 0,
                      }}
                    >
                      {isMeasuringBaseline ? "Calibrating…" : "Quick 20s baseline"}
                    </button>
                  </div>

                  {miniBaselineProgress !== null && (
                    <div style={{ marginTop: "4px" }}>
                      <div style={{ height: "3px", borderRadius: "1.5px", backgroundColor: "var(--bg-window)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${miniBaselineProgress}%`,
                            backgroundColor: "var(--accent-blue)",
                            transition: "width 0.1s ease",
                          }}
                        />
                      </div>
                      {baselinePulseResult && (
                        <span style={{ fontSize: "10.5px", color: "var(--accent-green)", display: "block", marginTop: "3px" }}>
                          ✓ Baseline pulse: {baselinePulseResult} bpm
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 3-point Environmental Checklist */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--separator)",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>
                    Optical Sensor Checklist:
                  </div>
                  <div>• Place device on a stable surface (minimizes motion artifacts)</div>
                  <div>• Face even front light (avoid harsh backlight or deep shadows)</div>
                  <div>• Remain reasonably still while speaking</div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                    Bright flickering screens or direct lights behind you reduce measurement accuracy.
                  </div>
                </div>
              </div>

              {/* Hardware toggles */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <Button
                  variant={micMuted ? "outline" : "secondary"}
                  size="sm"
                  icon={<Mic size={13} />}
                  onClick={() => setMicMuted((prev) => !prev)}
                  style={{ flex: 1, fontSize: "11.5px" }}
                >
                  {micMuted ? "Unmute Mic" : "Mute Mic"}
                </Button>
                <Button
                  variant={cameraOff ? "outline" : "secondary"}
                  size="sm"
                  icon={<Video size={13} />}
                  onClick={() => setCameraOff((prev) => !prev)}
                  style={{ flex: 1, fontSize: "11.5px" }}
                >
                  {cameraOff ? "Video On" : "Video Off"}
                </Button>
              </div>

              {/* Mandatory Disclaimer */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={12} style={{ color: "var(--text-tertiary)" }} />
                <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>
                  {WELLNESS_DISCLAIMER} Stored locally.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Declined In-Sheet Recovery */}
        {permissionError && (
          <div
            style={{
              padding: "10px 24px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderTop: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#fca5a5",
            }}
          >
            <span>
              {permissionError === "camera"
                ? "Camera access was declined. Enable camera in System Settings to start rehearsal."
                : "Microphone access was declined. Enable microphone in System Settings to start rehearsal."}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (window.electronAPI?.openSystemSettings) {
                  window.electronAPI.openSystemSettings(permissionError);
                }
              }}
              style={{ height: "26px", fontSize: "11px", padding: "0 10px" }}
            >
              Open Settings
            </Button>
          </div>
        )}

        {/* Sheet Footer */}
        <div
          style={{
            height: "60px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)",
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
              disabled={!isSessionServiceAvailable || !currentPersona}
              title={!isSessionServiceAvailable ? "Practice sessions require a connected mocktwo backend service" : undefined}
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
