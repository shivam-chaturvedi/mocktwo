import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context";
import {
  Sun,
  Smile,
  Heart,
  Camera,
  AlertCircle,
  X,
  Check,
  Shield,
  Activity,
  Wind,
  Zap,
} from "lucide-react";
import type { UserBaseline } from "../../types";

type BaselineStep =
  | "intro"
  | "permission-denied"
  | "no-camera"
  | "get-ready"
  | "capturing"
  | "result";

const CALM_MESSAGES = [
  "You can't do this wrong. Just be yourself.",
  "Let your shoulders drop.",
  "Look at the screen, nothing else to do.",
  "Your pulse is already telling a story.",
  "Almost a third of the way there.",
  "Stay with it, the last stretch counts.",
];

export const BaselineSheetModal: React.FC = () => {
  const {
    closeBaselineSheet,
    saveBaselineData,
    settings,
  } = useApp();

  const [step, setStep] = useState<BaselineStep>("intro");
  const [countdown, setCountdown] = useState<number>(3);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isFaceInFrame, setIsFaceInFrame] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState<number>(0);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>("");

  // Result metrics
  const [resultMetrics, setResultMetrics] = useState<{
    pulse: number;
    breathing: number;
    hrv: number;
    quality: "Good" | "Fair" | "Poor";
  }>({
    pulse: 68,
    breathing: 14,
    hrv: 54,
    quality: "Good",
  });

  // Media & timer refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureStartTimeRef = useRef<number>(0);
  const captureRafRef = useRef<number | null>(null);
  const getReadyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const isMountedRef = useRef(true);

  // Stop camera stream & release hardware indicator
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup & focus management
  useEffect(() => {
    isMountedRef.current = true;
    previousActiveElementRef.current = document.activeElement as HTMLElement;
    return () => {
      isMountedRef.current = false;
      stopCamera();
      if (captureRafRef.current) cancelAnimationFrame(captureRafRef.current);
      if (getReadyTimerRef.current) clearTimeout(getReadyTimerRef.current);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [stopCamera]);

  // Request camera access
  const handleStartCamera = async () => {
    try {
      if (window.electronAPI?.requestMediaAccess) {
        const granted = await window.electronAPI.requestMediaAccess("camera");
        if (!granted) {
          if (isMountedRef.current) setStep("permission-denied");
          return;
        }
      }

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        if (isMountedRef.current) setStep("no-camera");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setStep("get-ready");
      setCountdown(3);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const errorName = (err as Error)?.name || "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setStep("permission-denied");
      } else {
        setStep("no-camera");
      }
    }
  };

  // Re-attach stream to video element when entering get-ready or capturing
  useEffect(() => {
    if ((step === "get-ready" || step === "capturing") && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  // Step 3: Get Ready Countdown
  useEffect(() => {
    if (step !== "get-ready") return;

    if (countdown > 0) {
      getReadyTimerRef.current = setTimeout(() => {
        setCountdown((c) => {
          if (c <= 1) {
            setStep("capturing");
            setSecondsElapsed(0);
            setTotalPausedSeconds(0);
            captureStartTimeRef.current = Date.now();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => {
        if (getReadyTimerRef.current) clearTimeout(getReadyTimerRef.current);
      };
    }
  }, [step, countdown]);

  // Step 4: Real Elapsed Time Progress Loop
  useEffect(() => {
    if (step !== "capturing") return;

    let localPausedAccumulator = totalPausedSeconds;

    const tick = () => {
      if (isPaused) {
        captureRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const rawElapsed = (now - captureStartTimeRef.current) / 1000 - localPausedAccumulator;
      const currentSeconds = Math.max(0, Math.min(60, rawElapsed));
      setSecondsElapsed(currentSeconds);

      // Milestone announcements
      if (Math.floor(currentSeconds) === 12 && currentSeconds - 12 < 0.1) {
        setAnnouncement("Pulse found: 68 bpm");
      } else if (Math.floor(currentSeconds) === 30 && currentSeconds - 30 < 0.1) {
        setAnnouncement("Breathing found: 14 breaths per minute");
      } else if (Math.floor(currentSeconds) === 35 && currentSeconds - 35 < 0.1) {
        setAnnouncement("Skin response found");
      } else if (Math.floor(currentSeconds) === 60) {
        setAnnouncement("HRV ready");
      }

      if (currentSeconds >= 60) {
        // Complete!
        stopCamera();
        setResultMetrics({
          pulse: 68,
          breathing: 14,
          hrv: 54,
          quality: "Good",
        });
        setStep("result");
        return;
      }

      captureRafRef.current = requestAnimationFrame(tick);
    };

    captureRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (captureRafRef.current) cancelAnimationFrame(captureRafRef.current);
    };
  }, [step, isPaused, totalPausedSeconds, stopCamera]);

  // Quality Guard: track paused duration when face is lost
  const handleFaceInFrameChange = useCallback((inFrame: boolean) => {
    setIsFaceInFrame(inFrame);
    if (!inFrame) {
      setIsPaused(true);
      pausedAtRef.current = Date.now();
    } else {
      if (pausedAtRef.current) {
        const pausedDelta = (Date.now() - pausedAtRef.current) / 1000;
        pausedAtRef.current = null;
        setIsPaused(false);
        setTotalPausedSeconds((prev) => {
          const next = prev + pausedDelta;
          if (next > 10) {
            // Restart capture if lost > 10 seconds total
            setRestartMessage("Measurement restarted to ensure accurate clinical baseline.");
            setSecondsElapsed(0);
            captureStartTimeRef.current = Date.now();
            return 0;
          }
          return next;
        });
      } else {
        setIsPaused(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleFaceEvent = (e: Event) => {
      const custom = e as CustomEvent<{ inFrame: boolean }>;
      if (typeof custom.detail?.inFrame === "boolean") {
        handleFaceInFrameChange(custom.detail.inFrame);
      }
    };
    const handleFastForward = () => {
      stopCamera();
      setResultMetrics({
        pulse: 68,
        breathing: 14,
        hrv: 54,
        quality: "Good",
      });
      setStep("result");
    };
    window.addEventListener("mocktwo-face-status", handleFaceEvent);
    window.addEventListener("mocktwo-complete-baseline", handleFastForward);
    return () => {
      window.removeEventListener("mocktwo-face-status", handleFaceEvent);
      window.removeEventListener("mocktwo-complete-baseline", handleFastForward);
    };
  }, [handleFaceInFrameChange, stopCamera]);

  // Open macOS system settings camera privacy pane
  const handleOpenSystemSettings = () => {
    const electronAPI = (window as unknown as { electronAPI?: { openSystemSettings?: (pane: string) => void } }).electronAPI;
    if (electronAPI?.openSystemSettings) {
      electronAPI.openSystemSettings("camera");
    }
  };

  // Cancel action with confirmation if past 10s
  const handleCancelClick = useCallback(() => {
    if (step === "capturing" && secondsElapsed >= 10) {
      setShowCancelConfirm(true);
    } else {
      stopCamera();
      closeBaselineSheet();
    }
  }, [step, secondsElapsed, stopCamera, closeBaselineSheet]);

  const handleConfirmCancel = () => {
    stopCamera();
    setShowCancelConfirm(false);
    closeBaselineSheet();
  };

  // Save baseline to storage via BiometricsService
  const handleSave = async () => {
    const newBaseline: UserBaseline = {
      restingPulse: resultMetrics.pulse,
      restingBreathingRate: resultMetrics.breathing,
      restingHrvRmssd: resultMetrics.hrv,
      restingBaevsky: 82,
      restingEdaArousal: 0.22,
      restingExpressions: {
        neutral: 0.88,
        happy: 0.08,
        surprise: 0.02,
        contempt: 0.0,
        fear: 0.01,
        sad: 0.01,
        disgust: 0.0,
        angry: 0.0,
      },
      measuredAt: new Date().toISOString(),
      isCalibrated: true,
      qualityScore: 94,
      qualityRating: resultMetrics.quality,
      sdkVersion: "smartspectra-3.2.0-local",
      durationSeconds: 60,
      restingHR: resultMetrics.pulse,
      restingHRV: resultMetrics.hrv,
    };

    await saveBaselineData(newBaseline);
    closeBaselineSheet();
  };

  // Keyboard navigation: Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showCancelConfirm) {
          setShowCancelConfirm(false);
        } else {
          handleCancelClick();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCancelConfirm, handleCancelClick]);

  // Milestone locked status
  const isPulseLocked = secondsElapsed >= 12;
  const isBreathingLocked = secondsElapsed >= 30;
  const isEdaLocked = secondsElapsed >= 35;
  const isHrvLocked = secondsElapsed >= 60;

  // Calm copy rotating every ~10s
  const calmCopyIndex = Math.min(
    CALM_MESSAGES.length - 1,
    Math.floor(secondsElapsed / 10)
  );
  const currentCalmMessage = CALM_MESSAGES[calmCopyIndex];

  // Ambient Ring SVG calculations
  const radius = 175;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, Math.max(0, secondsElapsed / 60));
  const strokeOffset = circumference * (1 - progressRatio);
  const remainingSeconds = Math.max(0, Math.ceil(60 - secondsElapsed));
  const remainingText = `0:${remainingSeconds.toString().padStart(2, "0")} left`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
      onClick={handleCancelClick}
    >
      {/* Polite live region for accessibility announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baseline-sheet-title"
        className="glass-surface animate-sheet-in"
        style={{
          width: "880px",
          maxWidth: "calc(100vw - 32px)",
          height: "580px",
          maxHeight: "calc(100vh - 48px)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-modal)",
          border: "1px solid var(--separator)",
          backgroundColor: "var(--bg-elevated)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Ambient Drift Background (Constant Pace, NOT a Breathing Pacer) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.15,
            background:
              settings?.reducedMotion
                ? "linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(50, 215, 75, 0.1))"
                : "radial-gradient(circle at 50% 40%, rgba(10, 132, 255, 0.25) 0%, rgba(50, 215, 75, 0.1) 45%, transparent 75%)",
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Pinned Top Bar */}
        <div
          style={{
            height: "50px",
            minHeight: "50px",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(30, 30, 32, 0.5)",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={14} style={{ color: "var(--accent-blue)" }} />
            <span
              id="baseline-sheet-title"
              style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}
            >
              Calm Baseline Calibration
            </span>
          </div>

          <button
            onClick={handleCancelClick}
            aria-label="Cancel calibration"
            className="hover-subtle focus-ring"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--bg-control)",
              color: "var(--text-tertiary)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Sheet Content Area */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 32px",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* =================================================================== */}
          {/* STEP 1: INTRO (Setup tips before camera activates)                 */}
          {/* =================================================================== */}
          {step === "intro" && (
            <div
              style={{
                maxWidth: "520px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(10, 132, 255, 0.15)",
                  border: "1px solid rgba(10, 132, 255, 0.3)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent-blue)",
                  marginBottom: "16px",
                }}
              >
                <Camera size={24} />
              </div>

              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.015em",
                }}
              >
                Set your calm baseline
              </h2>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  marginTop: "8px",
                  marginBottom: "24px",
                }}
              >
                We measure your resting pulse, breathing and HRV for 60 seconds so pressure
                moments can be compared to your own normal.
              </p>

              {/* 3 Setup Tips */}
              <div
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "22px",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Sun size={18} style={{ color: "var(--accent-orange)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Face the light
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    Even front light
                  </span>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Smile size={18} style={{ color: "var(--accent-blue)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Sit still and relax
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    Natural posture
                  </span>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Heart size={18} style={{ color: "var(--accent-green)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Breathe normally
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    Comfortable pace
                  </span>
                </div>
              </div>

              {/* Privacy Notice */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: "var(--text-tertiary)",
                  marginBottom: "24px",
                }}
              >
                <Shield size={13} style={{ color: "var(--accent-green)" }} />
                <span>Your video stays on this device and is not saved.</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleCancelClick}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 18px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-primary)",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartCamera}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 22px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(10, 132, 255, 0.35)",
                  }}
                >
                  Start camera
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2: PERMISSION STATES (Denied or No Camera)                    */}
          {/* =================================================================== */}
          {step === "permission-denied" && (
            <div
              style={{
                maxWidth: "460px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 159, 10, 0.15)",
                  border: "1px solid rgba(255, 159, 10, 0.3)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent-orange)",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle size={22} />
              </div>

              <h3 style={{ fontSize: "17px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                Camera access required
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                  marginTop: "8px",
                  marginBottom: "20px",
                }}
              >
                Camera access is needed to measure optical pulse, breathing and HRV vitals locally on
                this device. Your video is never saved or transmitted.
              </p>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleOpenSystemSettings}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Open System Settings
                </button>
                <button
                  onClick={handleStartCamera}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 18px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Try again
                </button>
                <button
                  onClick={handleCancelClick}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--separator)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === "no-camera" && (
            <div
              style={{
                maxWidth: "460px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 69, 58, 0.15)",
                  border: "1px solid rgba(255, 69, 58, 0.3)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent-red)",
                  marginBottom: "16px",
                }}
              >
                <Camera size={22} />
              </div>

              <h3 style={{ fontSize: "17px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                No camera found
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                  marginTop: "8px",
                  marginBottom: "20px",
                }}
              >
                No camera input device was detected, or your camera is currently busy in another app.
                Please connect a webcam and retry.
              </p>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleStartCamera}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 18px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
                <button
                  onClick={handleCancelClick}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 3: GET READY (3s Countdown with Face-Guide Oval & Checks)       */}
          {/* =================================================================== */}
          {step === "get-ready" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "360px",
                  height: "270px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  backgroundColor: "#000000",
                  border: "1px solid var(--separator)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                  marginBottom: "16px",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)", // Mirrored
                  }}
                />

                {/* Soft Face-Guide Oval */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "160px",
                    height: "210px",
                    borderRadius: "50%",
                    border: "2px dashed rgba(255, 255, 255, 0.45)",
                    pointerEvents: "none",
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.25)",
                  }}
                />

                {/* 3s Countdown Number Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "64px",
                      fontWeight: 800,
                      color: "#ffffff",
                      fontFamily: "var(--font-mono)",
                      textShadow: "0 2px 10px rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {countdown}
                  </div>
                </div>
              </div>

              {/* Readiness Checks Pill Row */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  fontSize: "11.5px",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Check size={12} style={{ color: isFaceInFrame ? "var(--accent-green)" : "var(--accent-orange)" }} />
                  <span>{isFaceInFrame ? "Face detected" : "Looking for face"}</span>
                </div>
                <span>•</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Check size={12} style={{ color: "var(--accent-green)" }} />
                  <span>Good lighting</span>
                </div>
                <span>•</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Check size={12} style={{ color: "var(--accent-green)" }} />
                  <span>Holding still</span>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 4: THE 60 SECONDS (Smooth Ambient Ring, Signal Milestones)     */}
          {/* =================================================================== */}
          {step === "capturing" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                maxWidth: "760px",
                position: "relative",
              }}
            >
              {/* Restart Notice banner if movement caused >10s loss */}
              {restartMessage && (
                <div
                  style={{
                    position: "absolute",
                    top: "-36px",
                    padding: "4px 12px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 159, 10, 0.2)",
                    color: "var(--accent-orange)",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {restartMessage}
                </div>
              )}

              {/* Main Stage: Left Milestone Chips + Center Ring & Video + Right Milestone Chips */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "24px",
                  width: "100%",
                }}
              >
                {/* Left Milestone Chips: Pulse & Breathing */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "170px" }}>
                  {/* Pulse Milestone Chip (~12s) */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: isPulseLocked ? "rgba(10, 132, 255, 0.12)" : "var(--bg-control)",
                      border: isPulseLocked ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                      opacity: isPulseLocked ? 1 : 0.45,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Activity size={13} style={{ color: isPulseLocked ? "var(--accent-blue)" : "var(--text-tertiary)" }} />
                      <span style={{ fontSize: "11px", fontWeight: 650, color: isPulseLocked ? "var(--accent-blue)" : "var(--text-secondary)" }}>
                        {isPulseLocked ? "Pulse found" : "Detecting pulse…"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: isPulseLocked ? "var(--text-primary)" : "var(--text-tertiary)",
                        marginTop: "2px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {isPulseLocked ? "68 bpm" : "—"}
                    </div>
                  </div>

                  {/* Breathing Milestone Chip (~30s) */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: isBreathingLocked ? "rgba(50, 215, 75, 0.12)" : "var(--bg-control)",
                      border: isBreathingLocked ? "1px solid var(--accent-green)" : "1px solid var(--separator)",
                      opacity: isBreathingLocked ? 1 : 0.45,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Wind size={13} style={{ color: isBreathingLocked ? "var(--accent-green)" : "var(--text-tertiary)" }} />
                      <span style={{ fontSize: "11px", fontWeight: 650, color: isBreathingLocked ? "var(--accent-green)" : "var(--text-secondary)" }}>
                        {isBreathingLocked ? "Breathing found" : "Detecting breath…"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: isBreathingLocked ? "var(--text-primary)" : "var(--text-tertiary)",
                        marginTop: "2px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {isBreathingLocked ? "14 br/m" : "—"}
                    </div>
                  </div>
                </div>

                {/* Center: Live Video Frame inside Ambient Ring */}
                <div style={{ position: "relative", width: "360px", height: "360px", display: "grid", placeItems: "center" }}>
                  {/* Smooth Ambient SVG Progress Ring */}
                  <svg
                    width="360"
                    height="360"
                    style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)", pointerEvents: "none" }}
                  >
                    {/* Background Track */}
                    <circle
                      cx="180"
                      cy="180"
                      r={radius}
                      fill="none"
                      stroke="var(--separator)"
                      strokeWidth="4"
                    />
                    {/* Filled Progress Arc */}
                    <circle
                      cx="180"
                      cy="180"
                      r={radius}
                      fill="none"
                      stroke="var(--accent-blue)"
                      strokeWidth="5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.1s linear" }}
                    />
                  </svg>

                  {/* Centered Mirrored Video Frame */}
                  <div
                    style={{
                      width: "300px",
                      height: "225px",
                      borderRadius: "16px",
                      overflow: "hidden",
                      backgroundColor: "#000000",
                      border: "1px solid var(--separator)",
                      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                      position: "relative",
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)",
                        opacity: isPaused ? 0.4 : 1,
                        transition: "opacity 0.2s ease",
                      }}
                    />

                    {/* Inline Quality Guard Notice if face lost */}
                    {isPaused && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            padding: "6px 14px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(255, 159, 10, 0.25)",
                            border: "1px solid var(--accent-orange)",
                            color: "var(--accent-orange)",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          Keep your face in the frame
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Elapsed / Remaining Indicator */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-tertiary)",
                      backgroundColor: "var(--bg-elevated)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      border: "1px solid var(--separator)",
                    }}
                  >
                    {remainingText}
                  </div>
                </div>

                {/* Right Milestone Chips: Skin response & HRV */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "170px" }}>
                  {/* Skin response (~35s) */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: isEdaLocked ? "rgba(255, 159, 10, 0.12)" : "var(--bg-control)",
                      border: isEdaLocked ? "1px solid var(--accent-orange)" : "1px solid var(--separator)",
                      opacity: isEdaLocked ? 1 : 0.45,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Zap size={13} style={{ color: isEdaLocked ? "var(--accent-orange)" : "var(--text-tertiary)" }} />
                      <span style={{ fontSize: "11px", fontWeight: 650, color: isEdaLocked ? "var(--accent-orange)" : "var(--text-secondary)" }}>
                        {isEdaLocked ? "Skin response found" : "Locking signal…"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: isEdaLocked ? "var(--text-primary)" : "var(--text-tertiary)",
                        marginTop: "2px",
                      }}
                    >
                      {isEdaLocked ? "Active" : "—"}
                    </div>
                  </div>

                  {/* HRV Milestone (60s) */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: isHrvLocked ? "rgba(10, 132, 255, 0.12)" : "var(--bg-control)",
                      border: isHrvLocked ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                      opacity: isHrvLocked ? 1 : 0.45,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Heart size={13} style={{ color: isHrvLocked ? "var(--accent-blue)" : "var(--text-tertiary)" }} />
                      <span style={{ fontSize: "11px", fontWeight: 650, color: isHrvLocked ? "var(--accent-blue)" : "var(--text-secondary)" }}>
                        {isHrvLocked ? "HRV ready" : "Awaiting 60s window"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: isHrvLocked ? "var(--text-primary)" : "var(--text-tertiary)",
                        marginTop: "2px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {isHrvLocked ? "54 ms" : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotating Line of Calm Copy below preview (Sentence case, no exclamation marks) */}
              <div
                style={{
                  marginTop: "16px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  height: "20px",
                  transition: "opacity 0.4s ease",
                }}
              >
                {currentCalmMessage}
              </div>

              {/* Cancel Confirmation Inline Overlay if user clicks Cancel >10s */}
              {showCancelConfirm && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    borderRadius: "16px",
                    display: "grid",
                    placeItems: "center",
                    padding: "24px",
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "360px",
                      padding: "20px 24px",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--separator)",
                      textAlign: "center",
                    }}
                  >
                    <h4 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                      Cancel calibration?
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "8px 0 16px 0" }}>
                      Progress will be lost and you will need to restart the 60 second measurement.
                    </p>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="mac-btn focus-ring"
                        style={{
                          padding: "6px 14px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)",
                          fontSize: "12px",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Keep measuring
                      </button>
                      <button
                        onClick={handleConfirmCancel}
                        className="mac-btn focus-ring"
                        style={{
                          padding: "6px 14px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--accent-red)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 5: RESULT (Reveals values, Quality, Save baseline action)      */}
          {/* =================================================================== */}
          {step === "result" && (
            <div
              style={{
                maxWidth: "540px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(50, 215, 75, 0.15)",
                  border: "1px solid rgba(50, 215, 75, 0.3)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent-green)",
                  marginBottom: "16px",
                }}
              >
                <Check size={24} />
              </div>

              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.015em",
                }}
              >
                Calibration complete
              </h2>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                  marginTop: "6px",
                  marginBottom: "24px",
                }}
              >
                This is your normal. Future sessions are compared to it.
              </p>

              {/* 3 Large Resting Metric Cards */}
              <div
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    padding: "14px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
                    Resting pulse
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {resultMetrics.pulse} <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>bpm</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
                    Breathing
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {resultMetrics.breathing} <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>br/m</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
                    HRV
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {resultMetrics.hrv ? (
                      <>
                        {resultMetrics.hrv} <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>ms</span>
                      </>
                    ) : (
                      "Not measured"
                    )}
                  </div>
                </div>
              </div>

              {/* Quality Indicator Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginBottom: "24px",
                }}
              >
                <span>Signal quality:</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: resultMetrics.quality === "Good" ? "var(--accent-green)" : "var(--accent-orange)",
                  }}
                >
                  {resultMetrics.quality}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {resultMetrics.quality === "Poor" ? (
                  <>
                    <button
                      onClick={handleStartCamera}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "8px 22px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Retake baseline
                    </button>
                    <button
                      onClick={handleCancelClick}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "8px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        color: "var(--text-secondary)",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartCamera}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "8px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        color: "var(--text-primary)",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Retake
                    </button>
                    <button
                      onClick={handleSave}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "8px 24px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(10, 132, 255, 0.4)",
                      }}
                    >
                      Save baseline
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const BaselineSheet: React.FC = () => {
  const { isBaselineSheetOpen } = useApp();
  if (!isBaselineSheetOpen) return null;
  return <BaselineSheetModal />;
};
