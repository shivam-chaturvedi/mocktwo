import React, { useEffect, useRef } from "react";
import {
  Activity,
  Heart,
  Clock,
  ShieldCheck,
  X,
  CheckCircle2,
  Zap,
  Gauge,
} from "lucide-react";
import { Button } from "./Button";

export interface ComposureExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComposureExplainerModal: React.FC<ComposureExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--separator)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.75)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="composure-explainer-title"
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--separator)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(10, 132, 255, 0.15)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent-blue)",
              }}
            >
              <Activity size={18} />
            </div>
            <div>
              <h2
                id="composure-explainer-title"
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Understanding Composure
              </h2>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                How your score is measured, calculated, and interpreted
              </span>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="mac-btn focus-ring"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              backgroundColor: "var(--bg-control)",
              border: "1px solid var(--separator)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: "22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Section 1: In Plain Layman English */}
          <div>
            <h3
              style={{
                margin: "0 0 6px 0",
                fontSize: "13px",
                fontWeight: 650,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              What is Composure Snapshot?
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
              }}
            >
              Your <strong>Composure Snapshot</strong> reflects how calmly and steadily your body holds up when under conversational pressure.
              Using your camera, the system tracks micro-capillary pulses on your face to observe your heart rate and autonomic nervous system in real time, comparing your reactions against your personal resting calm baseline.
            </p>
          </div>

          {/* Section 2: How It Gets Calculated & Formulae */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-control)",
              border: "1px solid var(--separator)",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "13px",
                fontWeight: 650,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              How It Gets Calculated &amp; Mathematical Formulae
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <Heart size={16} style={{ color: "var(--accent-red)", marginTop: "2px", flexShrink: 0 }} />
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  <strong style={{ color: "var(--text-primary)" }}>1. Pulse Control (60% weight):</strong>
                  {" "}Compares your peak pulse spike during the rehearsal against your calibrated resting baseline:
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-xs)",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--accent-blue)",
                    }}
                  >
                    PulseControl = clamp(40, 100, 100 - (PeakPulse - RestingPulse) × 2.2)
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <Clock size={16} style={{ color: "var(--accent-green)", marginTop: "2px", flexShrink: 0 }} />
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  <strong style={{ color: "var(--text-primary)" }}>2. Autonomic Recovery (40% weight):</strong>
                  {" "}Measures how many seconds your pulse takes to return within +5 bpm of your calm baseline following peak tension:
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-xs)",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--accent-green)",
                    }}
                  >
                    RecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <Gauge size={16} style={{ color: "var(--accent-purple)", marginTop: "2px", flexShrink: 0 }} />
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  <strong style={{ color: "var(--text-primary)" }}>3. Composite Composure Score:</strong>
                  {" "}Combines pulse stability and autonomic vagal return into a single 0% to 100% score:
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-xs)",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--accent-purple)",
                    }}
                  >
                    ComposureScore = round(PulseControl × 0.60 + RecoveryScore × 0.40)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2.5: Nervousness Level Breakdown */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-control)",
              border: "1px solid var(--separator)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Activity size={16} style={{ color: "var(--accent-orange)" }} />
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 650,
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Nervousness Levels &amp; How They Are Derived
              </h3>
            </div>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              Nervousness measures the degree of sympathetic autonomic arousal triggered during your conversation:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "rgba(48, 209, 88, 0.08)",
                  border: "1px solid rgba(48, 209, 88, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--accent-green)" }}>CALM</span>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>Score ≥ 88%</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                  Heart rate remains within +0 to +3 bpm of baseline. Instant recovery (&le; 12s).
                </div>
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "rgba(10, 132, 255, 0.08)",
                  border: "1px solid rgba(10, 132, 255, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--accent-blue)" }}>MILD</span>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>76% – 87%</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                  Healthy conversational focus. Minor pulse elevation (+4 to +8 bpm) stabilizing within 16s.
                </div>
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "rgba(255, 159, 10, 0.08)",
                  border: "1px solid rgba(255, 159, 10, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--accent-orange)" }}>MODERATE</span>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>60% – 75%</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                  Noticeable cardiovascular activation (+9 to +16 bpm) or recovery taking 17 to 24 seconds.
                </div>
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "rgba(255, 69, 58, 0.08)",
                  border: "1px solid rgba(255, 69, 58, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--accent-red)" }}>HIGH</span>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>&lt; 60%</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                  Elevated stress arousal (+17+ bpm) or extended recovery taking longer than 25 seconds.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2.7: Stress & Pressure Moments Detection */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-control)",
              border: "1px solid var(--separator)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Zap size={16} style={{ color: "var(--accent-purple)" }} />
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 650,
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                How Pressure &amp; Stress Moments Are Detected
              </h3>
            </div>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              On your timeline chart, <strong>purple dots</strong> mark peak stress moments. The optical engine monitors your instantaneous capillary pulse: whenever your heart rate jumps by <strong>+8 bpm or more</strong> within a rolling 12-second window, an acute pressure event is flagged.
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              The system applies a <strong>-12 second conversational lookback</strong>, synchronizing each physical spike directly with the transcript to show you the counterpart's exact objection or interruption that provoked the reaction.
            </p>
          </div>

          {/* Section 3: Composure Tiers & What Steady Means */}
          <div>
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "13px",
                fontWeight: 650,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              What Do The Percentages & Tiers Mean?
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(175, 82, 222, 0.08)",
                  border: "1px solid rgba(175, 82, 222, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-purple)" }}>
                    UNSHAKEABLE
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    93% – 100%
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Exceptional poise. Heart rate remains virtually flat at baseline with instant recovery.
                </p>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(48, 209, 88, 0.08)",
                  border: "1px solid rgba(48, 209, 88, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-green)" }}>
                    COMPOSED
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    83% – 92%
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  High emotional control. Minor pulse elevation that settles within a few seconds.
                </p>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(10, 132, 255, 0.08)",
                  border: "1px solid rgba(10, 132, 255, 0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-blue)" }}>
                    STEADY
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    70% – 82%
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Controlled and grounded. Healthy cardiovascular response with reliable recovery back to baseline.
                </p>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(255, 159, 10, 0.08)",
                  border: "1px solid rgba(255, 159, 10, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-orange)" }}>
                    BUILDING
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    &lt; 70%
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Developing poise. Higher pulse elevation or delayed recovery under sudden pressure.
                </p>
              </div>
            </div>

            {/* What Steady Means Highlight */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(10, 132, 255, 0.06)",
                border: "1px solid rgba(10, 132, 255, 0.2)",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <CheckCircle2 size={16} style={{ color: "var(--accent-blue)", marginTop: "1px", flexShrink: 0 }} />
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--accent-blue)" }}>What does Steady (e.g. 75%) mean?</strong>
                <br />
                Steady is a <strong>strong, dependable practice score</strong>. It means that when the AI counterpart pushed or objected, your body naturally became alert (a normal human reaction), but your autonomic nervous system stayed grounded and brought your heart rate right back to baseline without letting stress overwhelm your speech.
              </div>
            </div>
          </div>

          {/* Privacy & Wellness Disclaimer */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--separator)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShieldCheck size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.45 }}>
              100% on-device and private. Optical frames are processed in memory and never transmitted or recorded remotely. This is an educational coaching indicator, not a diagnostic medical evaluation.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--separator)",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <Button variant="primary" size="sm" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};
