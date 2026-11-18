import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "./Badge";
import { AudioVisualizer } from "./AudioVisualizer";
import { PersonaPicker } from "./PersonaPicker";
import { LazyAvatarImage } from "./LazyAvatarImage";
import { CameraOffWarningModal } from "./CameraOffWarningModal";
import { useMediaDevices } from "../../hooks/useMediaDevices";
import { formatContextSetting, renderScenarioText, type Persona } from "../../types";
import { WELLNESS_DISCLAIMER } from "../../services/biometrics";
import { serviceRegistry } from "../../services/api";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
  Target,
  Play,
  Activity,
  ShieldCheck,
  Camera,
  AlertCircle,
  Clock,
  ChevronDown,
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
    baseline,
    openBaselineSheet,
    openStudio,
  } = useApp();

  const isSessionServiceAvailable = serviceRegistry.session.isAvailable();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [showBaselineGateModal, setShowBaselineGateModal] = useState(false);
  const [showCameraOffModal, setShowCameraOffModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(3);

  // Sync selected duration when scenario opens, defaulting to 3 minutes
  useEffect(() => {
    if (selectedScenario) {
      const d = selectedScenario.durationMinutes;
      setSelectedDuration(typeof d === "number" && d >= 1 && d <= 10 ? d : 3);
    }
  }, [selectedScenario]);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleCameraChange = useCallback(
    (deviceId: string) => {
      updateSettings({ selectedCamera: deviceId });
    },
    [updateSettings]
  );

  const handleMicrophoneChange = useCallback(
    (deviceId: string) => {
      updateSettings({ selectedMicrophone: deviceId });
    },
    [updateSettings]
  );

  // Real hardware device enumeration & stream management
  const {
    cameras,
    microphones,
    stream,
    audioLevel,
    cameraOff,
    micMuted,
    permissionError,
    isLoading: isStreamLoading,
    toggleMute,
    turnVideoOff,
    turnVideoOn,
    stopAllTracks,
    setPermissionError,
  } = useMediaDevices({
    enabled: isBriefingOpen,
    selectedCameraId: settings.selectedCamera,
    selectedMicrophoneId: settings.selectedMicrophone,
    onCameraChange: handleCameraChange,
    onMicrophoneChange: handleMicrophoneChange,
  });

  const handleToggleVideo = () => {
    if (!cameraOff) {
      setShowCameraOffModal(true);
    } else {
      void turnVideoOn();
    }
  };

  const confirmTurnCameraOff = () => {
    setShowCameraOffModal(false);
    turnVideoOff();
  };

  // Attach live stream to mirror video element and ensure autoplay
  useEffect(() => {
    if (cameraOff && videoRef.current) {
      videoRef.current.srcObject = null;
    } else if (videoRef.current && stream && !cameraOff) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraOff]);

  useEffect(() => {
    return () => {
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
    };
  }, []);

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

  const effectivePersona: Persona | undefined = currentPersona;

  const handleSelectPersona = (newPersona: Persona) => {
    if (settings.reducedMotion) {
      setSessionPersona(newPersona);
      return;
    }
    setIsCrossfading(true);
    if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
    crossfadeTimerRef.current = setTimeout(() => {
      setSessionPersona(newPersona);
      setIsCrossfading(false);
    }, 75);
  };

  // Handle escape to close (only when countdown not running)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isBriefingOpen && countdown === null) {
        stopAllTracks();
        closeBriefing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBriefingOpen, countdown, closeBriefing, stopAllTracks]);

  // Countdown timer before simulation begins
  useEffect(() => {
    if (countdown === null || !effectivePersona) return;
    if (countdown > 1) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 650);
      return () => clearTimeout(timer);
    } else if (countdown === 1) {
      const timer = setTimeout(() => {
        setCountdown(null);
        setIsStarting(false);
        stopAllTracks();
        beginSimulation(effectivePersona, selectedDuration);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [countdown, beginSimulation, effectivePersona, selectedDuration, stopAllTracks]);

  if (!isBriefingOpen || !selectedScenario) return null;

  const handleStartSession = async () => {
    if (countdown !== null || isStarting) return;

    // Gate 1: Enforce Calm Baseline Calibration before first session
    if (!baseline) {
      setShowBaselineGateModal(true);
      return;
    }

    setIsStarting(true);
    setPermissionError(null);

    try {
      // Gate 2: Enforce OS Media Access
      if (window.electronAPI?.requestMediaAccess) {
        const camOk = await window.electronAPI.requestMediaAccess("camera");
        if (!camOk) {
          setPermissionError("camera");
          setIsStarting(false);
          return;
        }
        const micOk = await window.electronAPI.requestMediaAccess("microphone");
        if (!micOk) {
          setPermissionError("microphone");
          setIsStarting(false);
          return;
        }
      }

      setCountdown(3);
    } catch {
      setIsStarting(false);
    }
  };

  const setting = effectivePersona
    ? formatContextSetting(effectivePersona.contextSetting || effectivePersona.roomNumber || "")
    : "";
  const seniority = effectivePersona ? effectivePersona.seniority || effectivePersona.loyaltyTier || "" : "";
  const tone = effectivePersona?.temperamentTraits?.length
    ? effectivePersona.temperamentTraits.join(" · ")
    : effectivePersona?.title || "";

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
        if (countdown === null) {
          stopAllTracks();
          closeBriefing();
        }
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
        {countdown !== null && effectivePersona && (
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
            onClick={() => {
              stopAllTracks();
              closeBriefing();
            }}
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
            {/* Header Block shows real persona info */}
            {effectivePersona ? (
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
                <LazyAvatarImage
                  src={effectivePersona.avatarUrl}
                  name={effectivePersona.name}
                  size={56}
                />
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
                  {tone && (
                    <div style={{ fontSize: "11.5px", color: "var(--accent-orange)", marginTop: "2px", fontWeight: 500 }}>
                      Tone: {tone}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                No persona assigned to this scenario.
              </div>
            )}

            {/* PERSONA Picker Section */}
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

            {/* Learning Objectives */}
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
                Learning Objectives
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
                  Hardware & Camera Check
                </h4>

                {/* Real Hardware Status Indicator */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: stream && !cameraOff ? "rgba(48, 209, 88, 0.12)" : "rgba(255, 255, 255, 0.06)",
                    border: stream && !cameraOff ? "1px solid rgba(48, 209, 88, 0.25)" : "1px solid var(--separator)",
                    fontSize: "10.5px",
                    color: stream && !cameraOff ? "var(--accent-green)" : "var(--text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: stream && !cameraOff ? "var(--accent-green)" : "var(--text-tertiary)",
                    }}
                  />
                  <span>{stream && !cameraOff ? "Live Preview" : cameraOff ? "Camera Paused" : "Camera Ready"}</span>
                </div>
              </div>

              {/* 16:9 Live Camera Tile with Mirror Video Element */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  backgroundColor: "#0d0d0e",
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255, 69, 58, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-red)",
                      }}
                    >
                      <VideoOff size={22} />
                    </div>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      Camera is turned off
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      Hardware sensor released · Audio-only mode
                    </span>
                  </div>
                ) : isStreamLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <Camera size={24} style={{ color: "var(--text-tertiary)", opacity: 0.6 }} />
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                      Starting camera…
                    </span>
                  </div>
                ) : stream ? (
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)", // Mirror effect for natural self-view
                    }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <Camera size={24} style={{ color: "var(--text-tertiary)" }} />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Camera preview idle
                    </span>
                  </div>
                )}

                {/* Zoom-style Mic Mute Indicator — always visible, bottom-left of camera view */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
                  aria-label={micMuted ? "Unmute Microphone" : "Mute Microphone"}
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: micMuted ? "rgba(239, 68, 68, 0.9)" : "rgba(0, 0, 0, 0.72)",
                    border: micMuted ? "none" : "1px solid rgba(255, 255, 255, 0.18)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "background-color 0.15s ease, transform 0.1s ease",
                    zIndex: 10,
                    outline: "none",
                    boxShadow: micMuted ? "0 0 0 2px rgba(239,68,68,0.35)" : "none",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {/* Mic icon with optional red diagonal slash overlay (Zoom-style) */}
                  <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mic size={15} color={micMuted ? "#fff" : "rgba(255,255,255,0.9)"} />
                    {micMuted && (
                      /* Red diagonal slash — exact Zoom style */
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          pointerEvents: "none",
                        }}
                      >
                        {/* White outline stroke so slash is visible on any background */}
                        <line x1="3" y1="19" x2="19" y2="3" stroke="rgba(239,68,68,0.9)" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Real Live Mic Audio Visualizer */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <AudioVisualizer active={!micMuted && Boolean(stream)} stream={stream} level={audioLevel} barsCount={6} size="sm" />
                </div>
              </div>

              {/* Dynamic Camera & Microphone Hardware Selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "3px" }}>
                      Camera Source
                    </label>
                    <select
                      value={settings.selectedCamera || (cameras[0]?.deviceId ?? "")}
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
                      {cameras.length > 0 ? (
                        cameras.map((cam) => (
                          <option key={cam.deviceId} value={cam.deviceId}>
                            {cam.label}
                          </option>
                        ))
                      ) : (
                        <option value="">Default Camera</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "3px" }}>
                      Microphone
                    </label>
                    <select
                      value={settings.selectedMicrophone || (microphones[0]?.deviceId ?? "")}
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
                      {microphones.length > 0 ? (
                        microphones.map((mic) => (
                          <option key={mic.deviceId} value={mic.deviceId}>
                            {mic.label}
                          </option>
                        ))
                      ) : (
                        <option value="">Default Microphone</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hardware stream controls */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <Button
                  variant={micMuted ? "outline" : "secondary"}
                  size="sm"
                  icon={micMuted ? <MicOff size={13} style={{ color: "#ef4444" }} /> : <Mic size={13} />}
                  onClick={toggleMute}
                  style={{ flex: 1, fontSize: "11.5px", color: micMuted ? "#ef4444" : undefined }}
                >
                  {micMuted ? "Unmute Mic" : "Mute Mic"}
                </Button>
                <Button
                  variant={cameraOff ? "outline" : "secondary"}
                  size="sm"
                  icon={cameraOff ? <VideoOff size={13} style={{ color: "#ef4444" }} /> : <Video size={13} />}
                  onClick={handleToggleVideo}
                  style={{ flex: 1, fontSize: "11.5px", color: cameraOff ? "#ef4444" : undefined }}
                >
                  {cameraOff ? "Video On" : "Video Off"}
                </Button>
              </div>

              {/* Baseline Status Card */}
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <Activity size={13} style={{ color: baseline ? "var(--accent-green)" : "var(--accent-orange)" }} />
                    <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Calm Baseline Calibration
                    </span>
                  </div>

                  {baseline ? (
                    <span style={{ fontSize: "11px", color: "var(--accent-green)", fontWeight: 500 }}>
                      ✓ {baseline.restingPulse} bpm
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        stopAllTracks();
                        closeBriefing();
                        openBaselineSheet();
                      }}
                      className="hover-subtle"
                      style={{
                        fontSize: "11px",
                        color: "var(--accent-blue)",
                        fontWeight: 600,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Calibrate (90s)
                    </button>
                  )}
                </div>
              </div>

              {/* Mandatory Privacy & Wellness Disclaimer */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "auto" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={13} style={{ color: "var(--text-tertiary)" }} />
              Session length:
            </span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <select
                id="briefing-session-duration-select"
                aria-label="Session length"
                value={selectedDuration}
                disabled={countdown !== null || isStarting}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                style={{
                  padding: "5px 28px 5px 10px",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: countdown !== null || isStarting ? "not-allowed" : "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  outline: "none",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                  transition: "all 0.12s ease",
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((min) => (
                  <option key={min} value={min}>
                    {min} {min === 1 ? "minute" : "minutes"}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: "absolute",
                  right: "8px",
                  pointerEvents: "none",
                  color: "var(--text-tertiary)",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                stopAllTracks();
                closeBriefing();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!isSessionServiceAvailable || !currentPersona || isStarting || countdown !== null}
              title={!isSessionServiceAvailable ? "Practice sessions require a connected mocktwo backend service" : undefined}
              icon={<Play size={13} fill="currentColor" />}
              onClick={handleStartSession}
            >
              Start Session
            </Button>
          </div>
        </div>
      </div>

      {/* Calm Baseline Gate Modal: Shown when user clicks Start Session without a baseline */}
      {showBaselineGateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={() => setShowBaselineGateModal(false)}
        >
          <div
            className="glass-surface"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "24px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--bg-card)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(10, 132, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-blue)",
                }}
              >
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650, color: "var(--text-primary)" }}>
                  Set your calm baseline first
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Required before your rehearsal simulation
                </span>
              </div>
            </div>

            <p style={{ margin: "0 0 20px 0", fontSize: "13px", lineHeight: 1.5, color: "var(--text-secondary)" }}>
              We measure your resting pulse, breathing and HRV for 60 seconds so pressure moments during the simulation can be compared to your personal normal.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowBaselineGateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowBaselineGateModal(false);
                  stopAllTracks();
                  closeBriefing();
                  openBaselineSheet();
                }}
              >
                Set Baseline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video-Off Confirmation Warning Modal */}
      <CameraOffWarningModal
        isOpen={showCameraOffModal}
        onKeepOn={() => setShowCameraOffModal(false)}
        onTurnOffAnyway={confirmTurnCameraOff}
      />
    </div>
  );
};
