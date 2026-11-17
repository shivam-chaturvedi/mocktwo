/**
 * Hook managing the 60-second Presage SmartSpectra calm baseline calibration flow.
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
import { ValidationCode } from "@smartspectra/node-sdk/renderer";

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
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isClockPaused, setIsClockPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [summary, setSummary] = useState<BaselineSummary | null>(null);
  const [currentVitals, setCurrentVitals] = useState<{
    pulse: number | null;
    breathing: number | null;
    hrv: number | null;
    eda: number | null;
  }>({ pulse: null, breathing: null, hrv: null, eda: null });

  // Refs for state machine management and cleanup
  const sessionRef = useRef<VitalsSession | null>(null);
  const samplesRef = useRef<VitalsSamplePoint[]>([]);
  const validationEventsRef = useRef<ValidationEvent[]>([]);
  const stateRef = useRef<BaselineState>("idle");
  stateRef.current = state;

  const continuousOkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeMsRef = useRef(0);
  const measuringStartTimeRef = useRef(0);
  const isOkRef = useRef(false);

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

    const measuringDurationMs = measuringStartTimeRef.current > 0
      ? Date.now() - measuringStartTimeRef.current
      : 60000;

    const baselineSummary = summarizeBaseline(
      samplesRef.current,
      validationEventsRef.current,
      measuringDurationMs
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
          makeActive,
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
   * Transition from positioning to measuring when validation has been OK for 3 continuous seconds
   */
  const beginMeasuring = useCallback(() => {
    setState("measuring");
    setSecondsRemaining(60);
    measuringStartTimeRef.current = Date.now();
    pausedTimeMsRef.current = 0;

    // Start 1-second interval ticker for the 60s measuring countdown
    clockIntervalRef.current = setInterval(() => {
      if (!isOkRef.current) {
        // Validation is paused (face lost, motion, etc.)
        setIsClockPaused(true);
        pausedTimeMsRef.current += 1000;
        if (pausedTimeMsRef.current >= 20000) {
          // Max paused time (20s) exceeded
          setState("invalid");
          setInvalidReason("Face lost or obstructed for over 20 seconds during calibration");
          cleanup();
        }
        return;
      }

      setIsClockPaused(false);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (clockIntervalRef.current) {
            clearInterval(clockIntervalRef.current);
            clockIntervalRef.current = null;
          }
          // Completed 60s measuring window
          setTimeout(() => {
            processAndSave();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Hard ceiling timeout: 180 seconds total measuring time
    totalTimerRef.current = setTimeout(() => {
      if (stateRef.current === "measuring") {
        setState("invalid");
        setInvalidReason("Calibration timed out (maximum 3 minutes elapsed)");
        cleanup();
      }
    }, 180000);
  }, [cleanup, processAndSave]);

  /**
   * Starts the calm baseline capture flow
   */
  const startCapture = useCallback(async () => {
    await cleanup();
    setErrorMessage(null);
    setInvalidReason(null);
    setSummary(null);
    samplesRef.current = [];
    validationEventsRef.current = [];
    setSecondsRemaining(60);
    setIsClockPaused(false);

    setState("checking");

    // 1. Verify API Key
    let presageConfig = { configured: false, apiKey: "", telemetry: false };
    try {
      if (window.electronAPI?.getPresageConfig) {
        presageConfig = await window.electronAPI.getPresageConfig();
      }
    } catch (err: any) {
      console.warn("[useBaselineCapture] Failed to query Presage config:", err);
    }

    if (!presageConfig.configured || !presageConfig.apiKey) {
      setState("error");
      setErrorMessage("SmartSpectra API key is not configured. Add SMARTSPECTRA_API_KEY to your .env file.");
      return;
    }

    // 2. Verify Camera Stream
    if (!stream || stream.getVideoTracks().length === 0 || !stream.getVideoTracks()[0].enabled) {
      setState("error");
      setErrorMessage("No active video stream available. Please grant camera permissions.");
      return;
    }

    // 3. Initialize Presage Session and enter positioning state
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
          setValidationHint(hint || null);

          const isOk = code === ValidationCode.kOk;
          isOkRef.current = isOk;

          if (stateRef.current === "positioning") {
            if (isOk) {
              if (!continuousOkTimerRef.current) {
                // Wait for 3 continuous seconds of good positioning
                continuousOkTimerRef.current = setTimeout(() => {
                  if (stateRef.current === "positioning" && isOkRef.current) {
                    beginMeasuring();
                  }
                }, 3000);
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
          setCurrentVitals({
            pulse: sample.pulse ?? null,
            breathing: sample.breathingRate ?? null,
            hrv: sample.hrvRmssd ?? null,
            eda: sample.eda ?? null,
          });
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
  }, [cleanup, stream, beginMeasuring]);

  /**
   * Resets the calibration to idle
   */
  const reset = useCallback(async () => {
    await cleanup();
    setState("idle");
    setErrorMessage(null);
    setInvalidReason(null);
    setSummary(null);
    setValidationCode(null);
    setValidationHint(null);
    setSecondsRemaining(60);
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
