import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context";
import { Card } from "../components/common/Card";
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, X } from "lucide-react";

export type ProcessingState = "processing" | "ready" | "error" | "cancelled";

interface ProcessingScreenProps {
  timeoutMs?: number;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({ timeoutMs = 15000 }) => {
  const { navigateTo, selectedScenario, completeProcessingSession } = useApp();
  const [state, setState] = useState<ProcessingState>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const isMountedRef = useRef(true);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counterpartName =
    selectedScenario.personaName ||
    selectedScenario.guestName ||
    "Practice Counterpart";

  const handleReturnHome = useCallback(() => {
    setState("cancelled");
    navigateTo("today");
  }, [navigateTo]);

  const handleGoToRecordings = useCallback(() => {
    navigateTo("recordings");
  }, [navigateTo]);

  const processSession = useCallback(async () => {
    setState("processing");
    setErrorMessage("");

    // Set timeout guard to prevent infinite hang
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    timeoutTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setState("error");
        setErrorMessage("Synthesis timed out. The local analysis service did not respond in time.");
      }
    }, timeoutMs);

    try {
      await completeProcessingSession();
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

      if (!isMountedRef.current) return;

      setState("ready");
      navigateTo("recordings");
    } catch (err) {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (!isMountedRef.current) return;
      setState("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while analyzing the rehearsal session."
      );
    }
  }, [completeProcessingSession, navigateTo, timeoutMs]);

  useEffect(() => {
    isMountedRef.current = true;
    const startTimer = setTimeout(() => {
      processSession();
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(startTimer);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [processSession]);

  // Support Escape key to cancel and return to home safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleReturnHome();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleReturnHome]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "var(--bg-window)",
      }}
    >
      <div style={{ maxWidth: "460px", width: "100%" }}>
        {state === "processing" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  margin: "0 0 6px 0",
                }}
              >
                Processing Session
              </h1>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0 }}>
                Synthesizing composure debrief with {counterpartName}
              </p>
            </div>

            <Card style={{ padding: "26px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <Loader2 size={32} className="spin" style={{ color: "var(--accent-blue)" }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    Analyzing conversation signals
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                    Computing baseline comparison and physiological markers…
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    marginTop: "12px",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={handleReturnHome}
                    className="mac-btn focus-ring"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <X size={13} />
                    <span>Cancel & Exit</span>
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}

        {state === "error" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  margin: "0 0 6px 0",
                }}
              >
                Processing Unavailable
              </h1>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0 }}>
                {counterpartName} session concluded
              </p>
            </div>

            <Card style={{ padding: "26px", border: "1px solid var(--separator)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--accent-red, #ef4444)",
                  }}
                >
                  <AlertCircle size={22} />
                </div>

                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    Analysis could not be generated
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                    {errorMessage || "The session ended, but analysis telemetry could not be synthesized."}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    marginTop: "8px",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={processSession}
                    className="mac-btn focus-ring"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--accent-blue)",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Retry Analysis</span>
                  </button>

                  <button
                    onClick={handleGoToRecordings}
                    className="mac-btn focus-ring"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    <span>View Recordings</span>
                  </button>

                  <button
                    onClick={handleReturnHome}
                    className="mac-btn focus-ring"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "transparent",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Home</span>
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
