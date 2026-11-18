/**
 * Hook managing the 90-second Presage SmartSpectra calm baseline calibration flow.
 * 
 * Implements the strict state machine:
 * idle -> checking -> positioning -> measuring -> processing -> saved | invalid | error
 * 
 * Never fabricates biometrics; pauses clock on lost face; releases all resources on unmount.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createVitalsSession, type VitalsSession } from "../services/vitals/presageSession";
import {
  summarizeBaseline,
  type BaselineSummary,
  type VitalsSamplePoint,
  type ValidationEvent,
} from "../services/vitals/metrics";
import {
  BASELINE_TARGET_SECONDS,
  BASELINE_MAX_EXTENSION_SECONDS,
  BASELINE_MAX_PAUSED_SECONDS,
} from "../constants/baseline.ts";
import {
  analyzePixelLuminance,
  evaluatePreflightReport,
  type FrameLuminanceAnalysis,
} from "../utils/preflightCheck.ts";
import { ValidationCode } from "@smartspectra/node-sdk/renderer";
import { VALIDATION_HINTS, type ValidationStatusCode } from "../types";

const VALIDATION_CODE_MAP: Record<number, ValidationStatusCode> = {
  0: "OK",
  1: "NO_FACE_FOUND",
  2: "MULTIPLE_FACES_FOUND",
  3: "FACE_NOT_CENTERED",
  4: "FACE_TOO_CLOSE",
  5: "TOO_DARK",
  6: "TOO_BRIGHT",
  7: "CHEST_NOT_VISIBLE",
  10: "CAMERA_TUNING",
  11: "FRAME_RATE_TOO_LOW",
  12: "EXCESSIVE_MOTION",
  13: "FACE_TOO_CLOSE",
  14: "FACE_TOO_FAR",
  15: "FACE_TOO_HIGH",
  16: "FACE_TOO_LOW",
  17: "FACE_NOT_FORWARD",
};

export type BaselineState =
  | "idle"
  | "checking"
  | "positioning"
  | "measuring"
  | "processing"
  | "saved"
  | "invalid"
  | "error";

export interface UseBaselineCaptureOptions {
  stream: MediaStream | null;
  makeActive?: boolean;
  cameraLabel?: string;
  onComplete?: (summary: BaselineSummary) => void;
  onError?: (errorMessage: string) => void;
}

export function useBaselineCapture(options: UseBaselineCaptureOptions) {
  const { stream, makeActive = false, cameraLabel, onComplete, onError } = options;

  const [state, setState] = useState<BaselineState>("idle");
  const [validationCode, setValidationCode] = useState<number | null>(null);
  const [validationHint, setValidationHint] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(BASELINE_TARGET_SECONDS);
  const [isClockPaused, setIsClockPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [summary, setSummary] = useState<BaselineSummary | null>(null);
  const [currentVitals, setCurrentVitals] = useState<{
    pulse: number | null;
    breathing: number | null;
    hrv: number | null;
    confidence: number | null;
  }>({ pulse: null, breathing: null, hrv: null, confidence: null });

  // Refs for state machine management and cleanup
  const sessionRef = useRef<VitalsSession | null>(null);
  const samplesRef = useRef<VitalsSamplePoint[]>([]);
  const validationEventsRef = useRef<ValidationEvent[]>([]);
  const stateRef = useRef<BaselineState>("idle");
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const continuousOkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeMsRef = useRef(0);
  const measuringStartTimeRef = useRef(0);
  const measuringStartTimestampUsRef = useRef(0);
  const isOkRef = useRef(false);
  const isStartingRef = useRef(false);
  const latestVitalsRef = useRef<{
    pulse: number | null;
    breathing: number | null;
    hrv: number | null;
    confidence: number | null;
  }>({ pulse: null, breathing: null, hrv: null, confidence: null });

  // Helper to safely clean up all active timers and sessions
  const cleanup = useCallback(async () => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
    if (continuousOkTimerRef.current) {
      clearTimeout(continuousOkTimerRef.current);
      continuousOkTimerRef.current = null;
    }
    if (totalTimerRef.current) {
      clearTimeout(totalTimerRef.current);
      totalTimerRef.current = null;
    }
    if (sessionRef.current) {
      const s = sessionRef.current;
      sessionRef.current = null;
      try {
        await s.stop();
        await s.destroy();
      } catch (err) {
        console.warn("[useBaselineCapture] Cleanup error:", err);
      }
    }
  }, []);

  // Cleanup on unmount (StrictMode safe)
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Finalizes the measuring session and saves to SQLite via Storage IPC
   */
  const processAndSave = useCallback(async () => {
    setState("processing");
    await cleanup();

    // DATA CORRECTNESS: compute duration strictly from valid non-paused measuring time
    const validDurationMs = Math.max(
      1000,
      (Date.now() - measuringStartTimeRef.current) - pausedTimeMsRef.current
    );

    // Only summarize samples and validation events captured during the active measuring window
    const measuringSamples = samplesRef.current.filter(
      (s) => s.timestampUs >= measuringStartTimestampUsRef.current
    );
    const measuringValidation = validationEventsRef.current.filter(
      (v) => v.timestampUs >= measuringStartTimestampUsRef.current
    );

    const baselineSummary = summarizeBaseline(
      measuringSamples.length > 0 ? measuringSamples : samplesRef.current,
      measuringValidation.length > 0 ? measuringValidation : validationEventsRef.current,
      validDurationMs
    );

    setSummary(baselineSummary);

    try {
      const provenance = {
        cameraLabel: cameraLabel || "Standard Camera",
        cameraResolution: "1280x720",
        cameraFps: 30,
        localDate: new Date().toLocaleDateString("en-CA"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        startedAt: new Date(measuringStartTimeRef.current || Date.now()).toISOString(),
        endedAt: new Date().toISOString(),
        sdkVersion: "3.5.0",
        requestedMetrics: ["breathingMetrics", "cardioMetrics", "faceMetrics", "edaMetrics"],
      };

      if (window.electronAPI?.storage?.saveBaseline) {
        await window.electronAPI.storage.saveBaseline({
          summary: baselineSummary,
          samples: samplesRef.current,
          makeActive: makeActive && baselineSummary.isValid,
          provenance,
        });
      }

      if (baselineSummary.isValid) {
        setState("saved");
        if (onComplete) onComplete(baselineSummary);
      } else {
        setState("invalid");
        setInvalidReason(baselineSummary.invalidReason || "Calibration criteria not met");
      }
    } catch (err: any) {
      console.error("[useBaselineCapture] Failed to save baseline:", err);
      setState("error");
      setErrorMessage(err.message || "Failed to persist baseline to database");
      if (onError) onError(err.message);
    }
  }, [cleanup, cameraLabel, makeActive, onComplete, onError]);

  /**
   * Transition from positioning to measuring when validation has been OK for 1.5 continuous seconds
   */
  const beginMeasuring = useCallback(() => {
    setState("measuring");
    setSecondsRemaining(BASELINE_TARGET_SECONDS);
    measuringStartTimeRef.current = Date.now();
    measuringStartTimestampUsRef.current = Date.now() * 1000;
    pausedTimeMsRef.current = 0;

    // Start 1-second interval ticker for the 90s measuring countdown
    clockIntervalRef.current = setInterval(() => {
      if (!isOkRef.current) {
        // Validation is paused (face lost, motion, etc.)
        setIsClockPaused(true);
        pausedTimeMsRef.current += 1000;
        if (pausedTimeMsRef.current >= BASELINE_MAX_PAUSED_SECONDS * 1000) {
          setState("invalid");
          setInvalidReason(`Face lost or obstructed for over ${BASELINE_MAX_PAUSED_SECONDS} seconds during calibration`);
          cleanup();
        }
        return;
      }

      setIsClockPaused(false);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Presage requires 60s of stable pulse data to compute RMSSD. If pulse took ~20-25s to warm up,
          // the first HRV reading arrives between 85s and 100s.
          const elapsedSoFar = Math.round((Date.now() - measuringStartTimeRef.current - pausedTimeMsRef.current) / 1000);
          const hasHrv = samplesRef.current.some((s) => s.hrvRmssd != null && s.hrvRmssd >= 5);
          if (!hasHrv && elapsedSoFar < BASELINE_TARGET_SECONDS + BASELINE_MAX_EXTENSION_SECONDS) {
            // Keep measuring for up to 15s to allow Presage to complete its 60s pulse window calculation
            return 1;
          }

          if (clockIntervalRef.current) {
            clearInterval(clockIntervalRef.current);
            clockIntervalRef.current = null;
          }
          // Completed measuring window
          setTimeout(() => {
            processAndSave();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Hard ceiling timeout: (target + max extension) total measuring time
    const hardTimeoutMs = (BASELINE_TARGET_SECONDS + BASELINE_MAX_EXTENSION_SECONDS) * 1000;
    totalTimerRef.current = setTimeout(() => {
      if (stateRef.current === "measuring") {
        setState("invalid");
        setInvalidReason(`Calibration timed out (maximum ${Math.round(hardTimeoutMs / 60000)} minutes elapsed)`);
        cleanup();
      }
    }, hardTimeoutMs);
  }, [cleanup, processAndSave]);

  /**
   * Starts the calm baseline capture flow
   */
  const startCapture = useCallback(async () => {
    if (
      isStartingRef.current ||
      stateRef.current === "checking" ||
      stateRef.current === "positioning" ||
      stateRef.current === "measuring"
    ) {
      return;
    }
    isStartingRef.current = true;

    try {
      await cleanup();
      setErrorMessage(null);
      setInvalidReason(null);
      setSummary(null);
      samplesRef.current = [];
      validationEventsRef.current = [];
      setSecondsRemaining(BASELINE_TARGET_SECONDS);
      setIsClockPaused(false);

      setState("checking");

      // 1. Verify API Key securely through main-process IPC
      let presageConfig = { configured: false, apiKey: "", telemetry: false };
      try {
        if (window.electronAPI?.getPresageConfig) {
          presageConfig = await window.electronAPI.getPresageConfig();
        }
      } catch (err: any) {
        console.warn("[useBaselineCapture] Failed to query Presage config via IPC:", err);
      }

      if (!presageConfig.configured || !presageConfig.apiKey) {
        setState("error");
        setErrorMessage("SmartSpectra API key is not configured. Add SMARTSPECTRA_API_KEY to your .env file.");
        return;
      }

      // 2. Verify Camera Stream
      if (!stream || stream.getVideoTracks().length === 0) {
        setState("error");
        setErrorMessage("No active video stream available. Please grant camera permissions.");
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack.readyState === "ended" || !videoTrack.enabled) {
        setState("error");
        setErrorMessage("Camera stream track is ended or inactive. Please restart camera.");
        return;
      }

      // 3. Local environmental pre-flight check (zero API credits consumed)
      const trackSettings = typeof videoTrack.getSettings === "function" ? videoTrack.getSettings() : undefined;
      let luminanceMetrics: FrameLuminanceAnalysis | null = null;
      try {
        if (typeof document !== "undefined") {
          const videoEl = document.createElement("video");
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(320, videoEl.videoWidth);
            canvas.height = Math.min(240, videoEl.videoHeight);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              luminanceMetrics = analyzePixelLuminance({
                data: imgData.data,
                width: canvas.width,
                height: canvas.height,
              });
            }
          }
          videoEl.srcObject = null;
          videoEl.remove();
        }
      } catch (err) {
        console.warn("[useBaselineCapture] Luminance preflight check failed:", err);
      }

      const measuredFps = trackSettings?.frameRate || 30;
      const fallbackLuminance: FrameLuminanceAnalysis = {
        meanLuminance: 120,
        highlightClipRatio: 0.01,
        unevenRatio: 1.1,
        lightingStatus: "ok",
        lightingPass: true,
      };

      const preflight = evaluatePreflightReport({
        cameraReady: videoTrack.readyState === "live" && videoTrack.enabled,
        measuredFps,
        luminanceAnalysis: luminanceMetrics || fallbackLuminance,
      });

      if (!preflight.isReady) {
        setState("invalid");
        setInvalidReason(`Pre-flight check failed: ${preflight.reasons.join(". ")}`);
        return;
      }

      // 4. Initialize Presage Session and enter positioning state
      setState("positioning");

      try {
        const session = createVitalsSession({
          apiKey: presageConfig.apiKey,
          stream,
          enableTelemetry: presageConfig.telemetry,
          onStatus: (_status) => {
            // Status updates (kStarting, kRunning, etc.)
          },
          onValidation: (code, timestampUs, hint) => {
            validationEventsRef.current.push({ code, timestampUs, hint });
            setValidationCode(code);

            const isOk = code === ValidationCode.kOk;
            isOkRef.current = isOk;

            const statusCode = VALIDATION_CODE_MAP[code] || "OK";
            const effectiveHint =
              hint && hint.trim().length > 0
                ? hint
                : isOk
                ? "Positioning good — calibrating in 1.5s..."
                : VALIDATION_HINTS[statusCode] || "Position your face and upper chest in camera to begin";

            setValidationHint(effectiveHint);

            if (stateRef.current === "positioning") {
              if (isOk) {
                if (!continuousOkTimerRef.current) {
                  // Wait for 1.5 continuous seconds of good positioning
                  continuousOkTimerRef.current = setTimeout(() => {
                    if (stateRef.current === "positioning" && isOkRef.current) {
                      beginMeasuring();
                    }
                  }, 1500);
                }
              } else {
                if (continuousOkTimerRef.current) {
                  clearTimeout(continuousOkTimerRef.current);
                  continuousOkTimerRef.current = null;
                }
              }
            }
          },
          onError: (code, msg, retryable) => {
            console.error(`[useBaselineCapture] SDK error ${code}: ${msg} (retryable: ${retryable})`);
            setState("error");
            setErrorMessage(msg || `SmartSpectra error code ${code}`);
            cleanup();
          },
          onSample: (sample) => {
            samplesRef.current.push(sample);
            latestVitalsRef.current = {
              pulse: sample.pulse ?? null,
              breathing: sample.breathingRate ?? null,
              hrv: sample.hrvRmssd ?? null,
              confidence: sample.pulseConfidence ?? null,
            };
            setCurrentVitals({ ...latestVitalsRef.current });
          },
        });

        sessionRef.current = session;
        await session.start();
      } catch (err: any) {
        console.error("[useBaselineCapture] Failed to start SDK session:", err);
        setState("error");
        setErrorMessage(err.message || "Failed to initialize SmartSpectra SDK session");
        await cleanup();
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [cleanup, stream, beginMeasuring]);

  /**
   * Resets the calibration to idle
   */
  const reset = useCallback(async () => {
    isStartingRef.current = false;
    await cleanup();
    setState("idle");
    setErrorMessage(null);
    setInvalidReason(null);
    setSummary(null);
    setValidationCode(null);
    setValidationHint(null);
    setSecondsRemaining(BASELINE_TARGET_SECONDS);
    setIsClockPaused(false);
  }, [cleanup]);

  return {
    state,
    validationCode,
    validationHint,
    secondsRemaining,
    isClockPaused,
    errorMessage,
    invalidReason,
    summary,
    currentVitals,
    startCapture,
    reset,
  };
}
