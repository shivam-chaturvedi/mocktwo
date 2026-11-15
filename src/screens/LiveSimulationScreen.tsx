import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../context";
import { AudioVisualizer } from "../components/common/AudioVisualizer";
import { Button } from "../components/common/Button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  ListOrdered,
  Target,
  Maximize2
} from "lucide-react";
import { VALIDATION_HINTS, type ValidationStatusCode } from "../types";

export const LiveSimulationScreen: React.FC = () => {
  const { selectedScenario, activeSessionPersona, finishSimulation, user, activeSessionId } = useApp();

  const currentPersona = activeSessionPersona || {
    id: selectedScenario.id,
    name: selectedScenario.personaName || selectedScenario.guestName,
    avatarUrl: selectedScenario.personaAvatarUrl || selectedScenario.guestAvatarUrl,
    setting: selectedScenario.setting || selectedScenario.roomNumber,
    seniority: selectedScenario.seniority || selectedScenario.loyaltyTier,
    temperamentTraits: [selectedScenario.personaTone || selectedScenario.guestMood],
    voice: "Alloy (Warm British)"
  };

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isSpeakerActive, setIsSpeakerActive] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showObjectivesPanel, setShowObjectivesPanel] = useState(false);
  const [counterpartSpeaking, setCounterpartSpeaking] = useState(true);
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);

  const TOTAL_SESSION_SECONDS = 60;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFinishedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Audio chunk recording subsystem for rehearsals
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = activeSessionId || `session-${Date.now()}`;
    }
    const sessionId = sessionIdRef.current;
    let mediaRecorder: MediaRecorder | null = null;
    let audioStream: MediaStream | null = null;
    let isCancelled = false;

    const initAudio = async () => {
      if (window.electronAPI?.audio) {
        try {
          await window.electronAPI.audio.startRecording(sessionId);
          if (isCancelled) return;
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (isCancelled) {
              audioStream.getTracks().forEach((t) => t.stop());
              return;
            }
            mediaRecorder = new MediaRecorder(audioStream);
            mediaRecorder.ondataavailable = async (e) => {
              if (e.data && e.data.size > 0 && window.electronAPI?.audio && !isCancelled) {
                try {
                  const buffer = await e.data.arrayBuffer();
                  await window.electronAPI.audio.appendChunk(sessionId, buffer);
                } catch (err) {
                  console.warn("[LiveSimulationScreen] Failed to append audio chunk:", err);
                }
              }
            };
            mediaRecorder.start(1000);
          }
        } catch (err) {
          console.error("[LiveSimulationScreen] Audio recording setup error:", err);
        }
      }
    };

    initAudio();

    return () => {
      isCancelled = true;
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
          mediaRecorder.stop();
        } catch {
          // ignore
        }
      }
      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }
      if (window.electronAPI?.audio) {
        window.electronAPI.audio.finalizeRecording(sessionId).catch((err) => {
          console.error("[LiveSimulationScreen] Failed to finalize audio recording:", err);
        });
      }
    };
  }, [activeSessionId]);

  // Optical sensor validation status: simulated briefly without showing live numbers
  const currentValidationStatus: ValidationStatusCode = useMemo(() => {
    if (cameraOff) return "NO_FACE_FOUND";
    if (secondsElapsed >= 18 && secondsElapsed <= 23) return "EXCESSIVE_MOTION";
    return "OK";
  }, [cameraOff, secondsElapsed]);

  // Monotonic timer using performance.now to prevent background timer drift and pure updater violations
  useEffect(() => {
    startTimeRef.current = performance.now();
    hasFinishedRef.current = false;

    const timer = setInterval(() => {
      if (startTimeRef.current === null) return;
      const elapsed = Math.floor((performance.now() - startTimeRef.current) / 1000);
      const clampedElapsed = Math.min(TOTAL_SESSION_SECONDS, elapsed);
      setSecondsElapsed(clampedElapsed);

      if (clampedElapsed >= TOTAL_SESSION_SECONDS && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        clearInterval(timer);
        finishSimulation(TOTAL_SESSION_SECONDS);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [finishSimulation]);

  // Turn-taking simulation
  useEffect(() => {
    const turnInterval = setInterval(() => {
      setCounterpartSpeaking((prev) => !prev);
    }, 4500);
    return () => clearInterval(turnInterval);
  }, []);

  // Auto-hide top bar after 3.5 seconds of inactivity
  const handleMouseMove = () => {
    setIsTopBarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsTopBarVisible(false);
    }, 3500);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Handle Escape to confirm end session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEndModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleEndEarly = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setShowEndModal(false);
    finishSimulation(secondsElapsed);
  };

  const toggleFullscreen = () => {
    (window as unknown as { electronAPI?: { sendWindowAction?: (action: string) => void } }).electronAPI?.sendWindowAction?.("toggle-fullscreen");
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0b0b0c",
        position: "fixed",
        inset: 0,
        zIndex: 500,
        overflow: "hidden"
      }}
    >
      {/* Minimal Translucent Top Bar (Auto-hides) */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(11, 11, 12, 0.75)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          zIndex: 510,
          opacity: isTopBarVisible ? 1 : 0,
          transform: isTopBarVisible ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: isTopBarVisible ? "auto" : "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
            {currentPersona.name}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            • {selectedScenario.title}
          </span>
        </div>

        {/* Minimal Session Timer Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(42, 42, 44, 0.6)",
            padding: "4px 14px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "0.03em"
            }}
          >
            {formatTime(secondsElapsed)} / {formatTime(TOTAL_SESSION_SECONDS)}
          </span>
        </div>

        {/* Live Status & Fullscreen toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-green)",
                boxShadow: "0 0 8px rgba(48, 209, 88, 0.6)"
              }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              Live Dialogue
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Toggle Full Screen (⌃⌘F)"
            style={{
              padding: "4px",
              color: "var(--text-tertiary)",
              borderRadius: "var(--radius-sm)"
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </header>

      {/* Optical Sensor Validation Hint Pill (Only appears when not OK, auto-hides when OK) */}
      {currentValidationStatus !== "OK" && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 512,
            backgroundColor: "rgba(255, 159, 10, 0.18)",
            border: "1px solid rgba(255, 159, 10, 0.4)",
            backdropFilter: "blur(16px)",
            padding: "5px 14px",
            borderRadius: "var(--radius-full)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-orange)" }} />
          <span style={{ fontSize: "11.5px", color: "#ffffff", fontWeight: 500 }}>
            {VALIDATION_HINTS[currentValidationStatus]}
          </span>
        </div>
      )}

      {/* Counterpart Video Stage */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        {/* Subtle breathing ambient halo */}
        <div
          style={{
            position: "absolute",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: counterpartSpeaking
              ? "radial-gradient(circle, rgba(10, 132, 255, 0.12) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%)",
            transition: "background 0.5s ease"
          }}
        />

        {/* Counterpart Video Centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              overflow: "hidden",
              border: counterpartSpeaking ? "2.5px solid var(--accent-blue)" : "1.5px solid rgba(255, 255, 255, 0.12)",
              boxShadow: counterpartSpeaking
                ? "0 0 36px rgba(10, 132, 255, 0.35), 0 12px 32px rgba(0, 0, 0, 0.5)"
                : "0 12px 32px rgba(0, 0, 0, 0.5)",
              transition: "border-color 0.25s ease, box-shadow 0.25s ease",
              marginBottom: "20px"
            }}
          >
            <img
              src={currentPersona.avatarUrl}
              alt={currentPersona.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <h2
              className="font-serif-luxury"
              style={{
                fontSize: "22px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
                letterSpacing: "-0.015em"
              }}
            >
              {currentPersona.name}
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12.5px",
                color: counterpartSpeaking ? "var(--accent-blue)" : "var(--text-secondary)",
                backgroundColor: "rgba(42, 42, 44, 0.6)",
                padding: "4px 14px",
                borderRadius: "var(--radius-full)",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <span style={{ fontWeight: 550 }}>{counterpartSpeaking ? `${currentPersona.name} Speaking` : "Listening to you"}</span>
              <AudioVisualizer
                active={counterpartSpeaking}
                barsCount={8}
                color={counterpartSpeaking ? "var(--accent-blue)" : "var(--text-tertiary)"}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Collapsible Key Objectives Glass Panel (Right edge) */}
        {showObjectivesPanel && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              position: "absolute",
              top: "70px",
              right: "24px",
              width: "320px",
              maxHeight: "calc(100vh - 160px)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-modal)",
              padding: "18px 20px",
              zIndex: 515,
              overflowY: "auto",
              border: "1px solid rgba(255, 255, 255, 0.12)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", fontWeight: 600 }}>
                Session Objectives
              </span>
              <button
                onClick={() => setShowObjectivesPanel(false)}
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Hide
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedScenario.learningObjectives.map((obj, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Target size={13} style={{ color: "var(--accent-blue)", flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "12.5px", color: "var(--text-primary)", lineHeight: 1.45 }}>
                    {obj}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Picture-in-Picture User Preview (Bottom Right Corner) */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            right: "28px",
            width: "200px",
            height: "125px",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "rgba(30, 30, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(16px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 502
          }}
        >
          {cameraOff ? (
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              Camera Off
            </span>
          ) : (
            <>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "4px"
                }}
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                {user?.name ? `You (${user.name})` : "You"}
              </span>
            </>
          )}

          {micMuted && (
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                padding: "2px 6px",
                backgroundColor: "rgba(255, 69, 58, 0.2)",
                border: "1px solid rgba(255, 69, 58, 0.4)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                color: "var(--accent-red)",
                fontWeight: 500
              }}
            >
              <MicOff size={11} />
              <span>Muted</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom HUD Pill (Center) */}
      <footer
        style={{
          position: "absolute",
          bottom: "24px",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 510,
          pointerEvents: "auto"
        }}
      >
        <div
          className="glass-surface"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 14px",
            borderRadius: "var(--radius-full)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.55)",
            border: "1px solid rgba(255, 255, 255, 0.12)"
          }}
        >
          {/* Objectives Toggle Button */}
          <button
            onClick={() => setShowObjectivesPanel((prev) => !prev)}
            style={{
              height: "40px",
              padding: "0 14px",
              borderRadius: "var(--radius-full)",
              backgroundColor: showObjectivesPanel ? "rgba(10, 132, 255, 0.2)" : "var(--bg-control)",
              color: showObjectivesPanel ? "var(--accent-blue)" : "var(--text-secondary)",
              border: showObjectivesPanel ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12.5px",
              fontWeight: 500,
              transition: "all 0.12s ease"
            }}
          >
            <ListOrdered size={15} />
            <span>Objectives</span>
          </button>

          <div style={{ width: "1px", height: "24px", backgroundColor: "var(--separator)" }} />

          {/* Mic Button */}
          <button
            onClick={() => setMicMuted((prev) => !prev)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: micMuted ? "rgba(255, 69, 58, 0.2)" : "var(--bg-control)",
              color: micMuted ? "var(--accent-red)" : "var(--text-primary)",
              border: micMuted ? "1px solid var(--accent-red)" : "1px solid var(--separator)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease"
            }}
            title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Camera Button */}
          <button
            onClick={() => setCameraOff((prev) => !prev)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: cameraOff ? "rgba(255, 69, 58, 0.2)" : "var(--bg-control)",
              color: cameraOff ? "var(--accent-red)" : "var(--text-primary)",
              border: cameraOff ? "1px solid var(--accent-red)" : "1px solid var(--separator)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease"
            }}
            title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {cameraOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerActive((prev) => !prev)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-control)",
              color: isSpeakerActive ? "var(--text-primary)" : "var(--text-tertiary)",
              border: "1px solid var(--separator)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease"
            }}
            title="Audio Volume"
          >
            <Volume2 size={16} />
          </button>

          <div style={{ width: "1px", height: "24px", backgroundColor: "var(--separator)" }} />

          {/* Destructive End Session Button */}
          <button
            onClick={() => setShowEndModal(true)}
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--accent-red)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              boxShadow: "0 2px 10px rgba(255, 69, 58, 0.4)",
              cursor: "pointer"
            }}
          >
            <PhoneOff size={15} />
            <span>End Session</span>
          </button>
        </div>
      </footer>

      {/* End Session Confirmation Modal */}
      {showEndModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
            display: "grid",
            placeItems: "center",
            padding: "20px"
          }}
          onClick={() => setShowEndModal(false)}
        >
          <div
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "420px",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-modal)",
              padding: "24px",
              border: "1px solid var(--separator)",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
                letterSpacing: "-0.015em"
              }}
            >
              End session now?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                margin: "0 0 20px 0"
              }}
            >
              Your completed session of {formatTime(secondsElapsed)} will be analyzed for pressure response and composure.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <Button variant="secondary" size="md" onClick={() => setShowEndModal(false)} style={{ flex: 1 }}>
                Continue Session
              </Button>
              <Button variant="danger" size="md" onClick={handleEndEarly} style={{ flex: 1 }}>
                End & View Debrief
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
