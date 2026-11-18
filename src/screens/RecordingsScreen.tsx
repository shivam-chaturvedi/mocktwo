import React, { useState, useRef, useEffect, useMemo } from "react";
import { useApp } from "../context";
import { ScoreRing } from "../components/common/ScoreRing";
import { PressureTimelineChart } from "../components/common/PressureTimelineChart";
import { EmptyState } from "../components/common/EmptyState";
import { LazyAvatarImage } from "../components/common/LazyAvatarImage";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  Search,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Film,
  Activity,
  Clock,
  FileText,
  Trash2,
} from "lucide-react";
import {
  getComposureTier,
  type MetricState,
  type Recording,
} from "../types";
import { WELLNESS_DISCLAIMER } from "../services/biometrics";
import { serviceRegistry } from "../services/api";

export const RecordingsScreen: React.FC = () => {
  const {
    recordings,
    selectedRecording,
    selectRecording,
    isDebriefMode,
    closeDebriefMode,
    navigateTo,
    openBriefing,
    scenarios,
    addRecordingNote,
    deleteRecording,
    showToast,
    baseline,
  } = useApp();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleRecordingsCount, setVisibleRecordingsCount] = useState<number>(20);

  // Player & Detail State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<"coaching" | "analytics">("coaching");
  const [noteInput, setNoteInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [fullRecording, setFullRecording] = useState<Recording | null>(null);
  const baseRecording = selectedRecording || (recordings.length > 0 ? recordings[0] : null);
  const activeRecordingId = baseRecording?.id;

  useEffect(() => {
    let isMounted = true;
    if (!activeRecordingId) {
      setFullRecording(null);
      return;
    }

    serviceRegistry.recordings.getRecording(activeRecordingId).then((full: Recording | null) => {
      if (isMounted && full) {
        setFullRecording(full);
      }
    }).catch((err: unknown) => {
      console.warn("[RecordingsScreen] Failed to fetch full recording detail:", err);
    });

    return () => { isMounted = false; };
  }, [activeRecordingId]);

  const activeRecording = (fullRecording && fullRecording.id === activeRecordingId) ? fullRecording : baseRecording;

  const lastRecordingIdRef = useRef<string | null>(activeRecording?.id || null);
  useEffect(() => {
    if (activeRecording?.id !== lastRecordingIdRef.current) {
      lastRecordingIdRef.current = activeRecording?.id || null;
      setIsPlaying(false);
      setPlaybackTime(0);
    }
  }, [activeRecording?.id]);

  const handleSelectRecording = (rec: Recording | null) => {
    setIsPlaying(false);
    setPlaybackTime(0);
    selectRecording(rec);
  };

  const handleCloseDebrief = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    setPlaybackTime(0);
    closeDebriefMode();
  };

  const activeRecordingDuration = activeRecording?.durationSeconds || 0;

  // Reset player when recording changes
  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    setHasVideoError(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [activeRecordingId]);

  // Synchronize play state with video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Synchronize playback speed with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleSeek = (newTimeSec: number) => {
    const clamped = Math.max(0, Math.min(activeRecordingDuration, newTimeSec));
    setPlaybackTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // Keyboard Shortcuts for Media Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) return;

      if (e.key === " " && activeRecording) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "ArrowLeft" && activeRecording) {
        e.preventDefault();
        handleSeek(playbackTime - 5);
      } else if (e.key === "ArrowRight" && activeRecording) {
        e.preventDefault();
        handleSeek(playbackTime + 5);
      } else if (e.metaKey && e.altKey && e.key === "0") {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRecording]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecording || !noteInput.trim()) return;
    addRecordingNote(activeRecording.id, playbackTime, noteInput.trim());
    setNoteInput("");
    showToast(`Note saved at ${formatSeconds(playbackTime)}`);
  };

  const handlePracticeAgain = () => {
    if (!activeRecording) return;
    const sc = scenarios.find((s) => s.id === activeRecording.scenarioId);
    if (sc) {
      openBriefing(sc);
    }
  };

  const filteredRecordings = useMemo(() => {
    return recordings.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.scenarioTitle.toLowerCase().includes(q) ||
        r.personaName.toLowerCase().includes(q)
      );
    });
  }, [recordings, searchQuery]);

  // Helper for metric state badges
  const renderStateBadge = (state: MetricState, confidence?: number) => {
    switch (state) {
      case "measured":
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "rgba(48, 209, 88, 0.15)", color: "var(--accent-green)", fontWeight: 600 }}>
            Measured {confidence ? `(${confidence}%)` : ""}
          </span>
        );
      case "warmingUp":
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "rgba(10, 132, 255, 0.15)", color: "var(--accent-blue)", fontWeight: 600 }}>
            Warming up
          </span>
        );
      case "notEnoughTime":
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "rgba(255, 159, 10, 0.15)", color: "var(--accent-orange)", fontWeight: 600 }}>
            Needs more time
          </span>
        );
      case "lowConfidence":
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "rgba(255, 159, 10, 0.15)", color: "var(--accent-orange)", fontWeight: 600 }}>
            Low confidence
          </span>
        );
      case "outOfRange":
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "rgba(255, 69, 58, 0.15)", color: "var(--accent-red)", fontWeight: 600 }}>
            Out of range (&gt;110 bpm)
          </span>
        );
      case "notMeasurableWhileSpeaking":
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "rgba(255, 159, 10, 0.15)", color: "var(--accent-orange)", fontWeight: 600 }}>
            Speaking
          </span>
        );
      case "unavailable":
      default:
        return (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "var(--bg-control)", color: "var(--text-tertiary)", fontWeight: 500 }}>
            Unavailable
          </span>
        );
    }
  };

  // ========================================================================
  // 1. DETAIL / DEBRIEF VIEW
  // ========================================================================
  if (isDebriefMode && !activeRecording) {
    return (
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--bg-window)",
        }}
      >
        <div
          style={{
            height: "44px",
            minHeight: "44px",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--separator)",
          }}
        >
          <button
            onClick={handleCloseDebrief}
            className="focus-ring"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              fontSize: "12px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={14} />
            <span>Recordings</span>
          </button>
        </div>
        <EmptyState
          icon={<Film size={24} />}
          title="Recording not found"
          description="It may have been deleted."
          primaryAction={{
            label: "Back to recordings",
            onClick: handleCloseDebrief,
          }}
        />
      </div>
    );
  }

  if (isDebriefMode && activeRecording) {
    const isTooShort = activeRecording.status === "Too short" || activeRecording.durationSeconds < 12;
    const score = activeRecording.composureScore;
    const tier = score ? getComposureTier(score) : "Building";
    const biometrics = activeRecording.sessionBiometrics;
    const coaching = activeRecording.pressureCoaching;
    const personaName = activeRecording.personaName;
    const signalsCount = biometrics?.signalsAvailableCount ?? (isTooShort ? 0 : 4);
    const isPartial = biometrics?.isPartialScore ?? (signalsCount < 5);

    return (
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--bg-window)",
        }}
      >
        {/* Top 44px Navigation Toolbar */}
        <div
          style={{
            height: "44px",
            minHeight: "44px",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "var(--bg-window)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <button
              onClick={handleCloseDebrief}
              aria-label="Back to recordings list"
              className="focus-ring"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "var(--accent-blue)",
                fontWeight: 500,
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <ChevronLeft size={14} />
              <span>Recordings</span>
            </button>
            <div style={{ width: "1px", height: "16px", backgroundColor: "var(--separator)" }} />
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {activeRecording.scenarioTitle}
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              · {activeRecording.relativeDate} · {activeRecording.durationSeconds}s
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePracticeAgain}
              className="mac-btn focus-ring"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--accent-blue)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <RotateCcw size={12} />
              <span>Practice Again</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete Recording"
              title="Delete Recording"
              className="focus-ring hover-subtle"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-control)",
                color: "var(--accent-red)",
                border: "1px solid var(--separator)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setIsInspectorOpen((prev) => !prev)}
              aria-label="Toggle Inspector"
              title="Toggle Inspector (⌥⌘0)"
              className="focus-ring"
              style={{
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                color: isInspectorOpen ? "var(--text-primary)" : "var(--text-tertiary)",
                backgroundColor: isInspectorOpen ? "var(--bg-control)" : "transparent",
              }}
            >
              {isInspectorOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--separator)",
                borderRadius: "var(--radius-md)",
                padding: "22px",
                maxWidth: "400px",
                width: "100%",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--accent-red)",
                  }}
                >
                  <Trash2 size={16} />
                </div>
                <div style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)" }}>
                  Delete Rehearsal Recording?
                </div>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 18px 0" }}>
                Are you sure you want to delete this recording for &ldquo;{activeRecording.scenarioTitle}&rdquo;? Audio files and physiological telemetry debriefs will be permanently removed.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    fontSize: "12.5px",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteRecording(activeRecording.id);
                    setShowDeleteConfirm(false);
                    handleCloseDebrief();
                  }}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "#ef4444",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Delete Recording
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Master Detail Grid (No outer scrolling!) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* ============================================================ */}
          {/* LEFT: FIXED PLAYER ON TOP + INTERNALLY SCROLLING TRANSCRIPT */}
          {/* ============================================================ */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRight: isInspectorOpen ? "1px solid var(--separator)" : "none",
            }}
          >
            {/* Top Fixed Video Stage & Player */}
            <div
              style={{
                backgroundColor: "#0d0d0e",
                padding: "16px 24px",
                borderBottom: "1px solid var(--separator)",
                flexShrink: 0,
              }}
            >
              {/* Video Player Display Tile */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  maxHeight: "320px",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "#000000",
                  border: "1px solid var(--separator)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {activeRecording?.id && !hasVideoError ? (
                  <>
                    <video
                      ref={videoRef}
                      src={`mocktwo-asset://recordings/sessions/${activeRecording.id}/video.webm`}
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onTimeUpdate={() => {
                        if (videoRef.current) {
                          setPlaybackTime(Math.floor(videoRef.current.currentTime));
                        }
                      }}
                      onEnded={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onError={() => setHasVideoError(true)}
                    />
                    {/* Layout Format Badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        fontSize: "11px",
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: activeRecording.layout === "camera_only" ? "rgba(255, 255, 255, 0.65)" : "#30d158",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        backdropFilter: "blur(6px)",
                        pointerEvents: "none",
                      }}
                    >
                      {activeRecording.layout === "camera_only" ? "Camera only (older recording)" : "Stage recording"}
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <LazyAvatarImage
                      src={activeRecording.personaAvatarUrl}
                      name={personaName}
                      size={68}
                    />
                    <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", marginTop: "10px" }}>
                      {personaName}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {activeRecording?.videoPath
                        ? activeRecording.layout === "camera_only"
                          ? "Camera only (older recording)"
                          : "Stage recorded"
                        : "Audio-only session"}{" "}
                      · {biometrics?.coverageRatio || `${activeRecording.durationSeconds}s`}
                    </div>
                  </div>
                )}

                {/* Big Center Play / Pause Overlay Button */}
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    margin: "auto",
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    cursor: "default",
                    opacity: isPlaying ? 0 : 0.9,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: "2px" }} />}
                </button>
              </div>

              {/* Player Scrubber & Interactive Stress Curve */}
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => setIsPlaying((prev) => !prev)}
                      style={{ padding: "4px", color: "var(--text-primary)" }}
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <span className="tabular-nums" style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
                      {formatSeconds(playbackTime)} / {formatSeconds(activeRecording.durationSeconds)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      Speed:
                    </span>
                    <button
                      onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))}
                      style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 600 }}
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                </div>

                {/* Scrubber slider */}
                <input
                  type="range"
                  min={0}
                  max={activeRecording.durationSeconds}
                  value={playbackTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-blue)", height: "4px" }}
                />

                {/* Pulse timeline bar below scrubber with peak pins */}
                <div style={{ height: "18px", width: "100%", position: "relative", marginTop: "2px" }}>
                  {biometrics?.peakStressMoments.map((moment, idx) => {
                    const pct = (moment.timestampSeconds / activeRecording.durationSeconds) * 100;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSeek(moment.timestampSeconds)}
                        title={`Pressure moment at ${formatSeconds(moment.timestampSeconds)}`}
                        style={{
                          position: "absolute",
                          left: `${pct}%`,
                          top: 0,
                          transform: "translateX(-50%)",
                          padding: "2px 4px",
                          borderRadius: "3px",
                          backgroundColor: "rgba(255, 159, 10, 0.2)",
                          border: "1px solid var(--accent-orange)",
                          color: "var(--accent-orange)",
                          fontSize: "9px",
                          fontWeight: 700,
                        }}
                      >
                        Pin {formatSeconds(moment.timestampSeconds)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Transcript Pane (Internally Scrolling with custom-scroll) */}
            <div
              className="custom-scroll selectable-text"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                Session Dialogue Transcript
              </div>

              {activeRecording.transcript && activeRecording.transcript.length > 0 ? (
                activeRecording.transcript.map((line, idx) => {
                  const lineTime =
                    typeof line.timestampSeconds === "number"
                      ? line.timestampSeconds
                      : typeof (line as any).startMs === "number"
                      ? Math.floor((line as any).startMs / 1000)
                      : 0;
                  const isActive = playbackTime >= lineTime && playbackTime < lineTime + 6;
                  const isUser =
                    line.speaker === "You" ||
                    String(line.speaker).toLowerCase() === "user";

                  return (
                    <div
                      key={line.id || `line-${idx}`}
                      onClick={() => handleSeek(lineTime)}
                      className="focus-ring"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSeek(lineTime);
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: isActive ? "rgba(10, 132, 255, 0.12)" : "var(--bg-elevated)",
                        border: isActive ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 650, color: isUser ? "var(--accent-blue)" : "var(--accent-orange)" }}>
                          {isUser ? "You" : personaName}
                        </span>
                        <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                          {formatSeconds(lineTime)}
                        </span>
                      </div>
                      <p style={{ fontSize: "12.5px", color: "var(--text-primary)", lineHeight: 1.45, margin: 0 }}>
                        {line.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                  No transcript segments recorded for this session.
                </div>
              )}

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder={`Add a timestamped note at ${formatSeconds(playbackTime)}…`}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: noteInput.trim() ? 1 : 0.5,
                  }}
                >
                  Save Note
                </button>
              </form>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT: FIXED-WIDTH INSPECTOR WITH ITS OWN SCROLLING BODY */}
          {/* ============================================================ */}
          {isInspectorOpen && (
            <div
              style={{
                width: "440px",
                minWidth: "440px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                backgroundColor: "var(--bg-content)",
              }}
            >
              {/* 44px Sub-Toolbar with 12px Top/Bottom Padding (Fixed spacing) */}
              <div
                style={{
                  height: "44px",
                  minHeight: "44px",
                  padding: "12px 18px",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--separator)",
                  backgroundColor: "var(--bg-window)",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setInspectorTab("coaching")}
                    className="focus-ring"
                    style={{
                      padding: "3px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontWeight: inspectorTab === "coaching" ? 600 : 450,
                      color: inspectorTab === "coaching" ? "var(--text-primary)" : "var(--text-secondary)",
                      backgroundColor: inspectorTab === "coaching" ? "var(--bg-control)" : "transparent",
                    }}
                  >
                    Coaching
                  </button>
                  <button
                    onClick={() => setInspectorTab("analytics")}
                    className="focus-ring"
                    style={{
                      padding: "3px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontWeight: inspectorTab === "analytics" ? 600 : 450,
                      color: inspectorTab === "analytics" ? "var(--text-primary)" : "var(--text-secondary)",
                      backgroundColor: inspectorTab === "analytics" ? "var(--bg-control)" : "transparent",
                    }}
                  >
                    Analytics
                  </button>
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  {activeRecording.readinessStatus || (isTooShort ? "Too short" : "Full read")}
                </div>
              </div>

              {/* Scrolling Inspector Body */}
              <div
                className="custom-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Status Line */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", color: "var(--text-secondary)" }}>
                  <span>Status: <strong>{activeRecording.readinessStatus || (isTooShort ? "Too short" : "Full read")}</strong></span>
                  <span>{biometrics?.coverageRatio || `${activeRecording.durationSeconds}s clean`}</span>
                </div>

                {/* ======================================================== */}
                {/* COACHING TAB (SDK REWRITTEN - 7 SECTIONS) */}
                {/* ======================================================== */}
                {inspectorTab === "coaching" && (
                  !coaching ? (
                    <EmptyState
                      icon={<FileText size={20} />}
                      title="Coaching is not ready yet"
                      description="Your coaching summary will appear here once the session has been analyzed."
                    />
                  ) : (
                  <>
                    {/* 1. Composure Card */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--separator)",
                        boxShadow: "var(--shadow-card)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <ScoreRing score={score || 0} size={76} strokeWidth={5.5} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 650,
                                color:
                                  tier === "Unshakeable"
                                    ? "var(--accent-purple)"
                                    : tier === "Composed"
                                    ? "var(--accent-green)"
                                    : "var(--accent-blue)",
                                textTransform: "uppercase",
                              }}
                            >
                              {tier}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                              · {activeRecording.nervousnessLevel || "Mild"}
                            </span>
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", marginTop: "2px" }}>
                            mocktwo Composure Index
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            Based on {signalsCount} of 5 signals {isPartial ? "(Partial)" : ""}
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "10px", lineHeight: 1.45, margin: 0 }}>
                        {coaching?.summarySentence || "Autonomic return occurred in approx. 14 seconds following acute challenge."}
                      </p>
                    </div>

                    {/* 2. Pressure Moments (Look back 12s, body reaction, practical reset) */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                        Pressure Moments
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(coaching?.pressureMoments || biometrics?.peakStressMoments || []).map((moment, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--bg-elevated)",
                              border: "1px solid var(--separator)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                              <button
                                onClick={() => handleSeek(moment.timestampSeconds)}
                                style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 600, fontFamily: "var(--font-mono)" }}
                              >
                                ▶ {formatSeconds(moment.timestampSeconds)}
                              </button>
                              <span style={{ fontSize: "10.5px", color: "var(--accent-orange)", fontWeight: 600 }}>
                                Pressure Peak
                              </span>
                            </div>
                            <div style={{ fontSize: "11.5px", fontStyle: "italic", color: "var(--text-primary)", marginBottom: "4px" }}>
                              &ldquo;{moment.counterpartQuote}&rdquo;
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                              <strong>What your body did:</strong> {moment.reaction}
                            </div>
                            <div style={{ marginTop: "4px", padding: "4px 8px", borderRadius: "3px", backgroundColor: "var(--bg-control)", fontSize: "11px", color: "var(--accent-teal)" }}>
                              <strong>Reset suggestion:</strong> {moment.suggestion}
                            </div>
                            {moment.evidence && moment.evidence.length > 0 && (
                              <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--text-tertiary)", lineHeight: 1.3 }}>
                                {moment.evidence.map((ev, i) => (
                                  <div key={i}>• {ev}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Where You Held Steady / Where You Showed Strain */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                        Autonomic Observations
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {coaching?.whereHeldSteady.map((item) => (
                          <div key={item.id} style={{ padding: "8px 10px", borderRadius: "var(--radius-xs)", backgroundColor: "rgba(48, 209, 88, 0.08)", border: "1px solid rgba(48, 209, 88, 0.2)" }}>
                            <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--accent-green)" }}>
                              ✓ {item.title}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              {item.description}
                            </div>
                            {item.evidence && item.evidence.length > 0 && (
                              <div style={{ marginTop: "3px", fontSize: "10px", color: "var(--text-tertiary)" }}>
                                {item.evidence.map((ev, i) => (
                                  <div key={i}>• {ev}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {coaching?.whereShowedStrain.map((item) => (
                          <div key={item.id} style={{ padding: "8px 10px", borderRadius: "var(--radius-xs)", backgroundColor: "rgba(255, 159, 10, 0.08)", border: "1px solid rgba(255, 159, 10, 0.2)" }}>
                            <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--accent-orange)" }}>
                              ⚠ {item.title}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              {item.description}
                            </div>
                            {item.evidence && item.evidence.length > 0 && (
                              <div style={{ marginTop: "3px", fontSize: "10px", color: "var(--text-tertiary)" }}>
                                {item.evidence.map((ev, i) => (
                                  <div key={i}>• {ev}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. 5 Pressure Skills */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                        5 Pressure Skills
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {coaching?.pressureSkills.map((skill) => (
                          <div
                            key={skill.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--bg-elevated)",
                              border: "1px solid var(--separator)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                                {skill.name}
                              </span>
                              <span className="tabular-nums" style={{ fontSize: "12px", fontWeight: 700, color: skill.score >= 80 ? "var(--accent-green)" : "var(--accent-orange)" }}>
                                {skill.score > 0 ? `${skill.score}%` : "—"}
                              </span>
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              {skill.assessment}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 5. Recommended Drills */}
                    {coaching?.drills && coaching.drills.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                          Recommended Practice Drill
                        </div>
                        {coaching.drills.map((d) => (
                          <div key={d.id} style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-blue)" }}>{d.title}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.35 }}>{d.description}</div>
                            {d.evidence && d.evidence.length > 0 && (
                              <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--text-tertiary)" }}>
                                {d.evidence.map((ev, i) => (
                                  <div key={i}>• {ev}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                  )
                )}

                {/* ======================================================== */}
                {/* ANALYTICS TAB (REBUILT TO SDK TRUTH SPEC) */}
                {/* ======================================================== */}
                {inspectorTab === "analytics" && (
                  isTooShort ? (
                    <EmptyState
                      icon={<Clock size={20} />}
                      title="Session too short to analyze"
                      description="Sessions under 12 seconds do not include enough data for a reading."
                    />
                  ) : !biometrics ? (
                    <EmptyState
                      icon={<Activity size={20} />}
                      title="Body signals unavailable"
                      description="This session was recorded without camera measurements."
                    />
                  ) : (
                    <>
                      {/* Top: Pressure Timeline (Pulse + EDA + Talking Bands + Out-of-Range Band) */}
                    <PressureTimelineChart
                      biometrics={activeRecording.sessionBiometrics}
                      durationSeconds={activeRecording.durationSeconds}
                      baselinePulse={baseline?.restingPulse || 68}
                      playbackTime={playbackTime}
                      onSeek={handleSeek}
                    />

                    {/* BODY Metrics Group */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                        Body Metrics
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {/* Pulse */}
                        <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Pulse (Avg / Peak)</span>
                            {renderStateBadge(biometrics?.pulse?.state || "measured")}
                          </div>
                          <div className="tabular-nums" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                            {biometrics?.pulse?.avg ? `${biometrics.pulse.avg} / ${biometrics.pulse.peak}` : "—"} <span style={{ fontSize: "11px", fontWeight: 400 }}>bpm</span>
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--accent-orange)", marginTop: "2px" }}>
                            {biometrics?.pulse?.deltaVsBaseline !== undefined ? `+${biometrics.pulse.deltaVsBaseline} vs baseline (12s window)` : "12s window · 40–110 bpm"}
                          </div>
                        </div>

                        {/* HRV (RMSSD, Only 60s reached) */}
                        <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>HRV (RMSSD)</span>
                            {renderStateBadge(biometrics?.hrv?.state || "notEnoughTime", biometrics?.hrv?.confidence)}
                          </div>
                          <div className="tabular-nums" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                            {biometrics?.hrv?.rmssd ? `${biometrics.hrv.rmssd} ms` : "—"}
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            {biometrics?.hrv?.rmssd ? `Baseline: ${baseline?.restingHrvRmssd || 54} ms` : "Requires 60s steady read"}
                          </div>
                        </div>

                        {/* Baevsky Index */}
                        <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Baevsky Index</span>
                            {renderStateBadge(biometrics?.hrv?.state || "notEnoughTime")}
                          </div>
                          <div className="tabular-nums" style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-blue)", marginTop: "2px" }}>
                            {biometrics?.hrv?.baevskyDeltaVsBaseline !== undefined ? `${biometrics.hrv.baevskyDeltaVsBaseline > 0 ? "+" : ""}${biometrics.hrv.baevskyDeltaVsBaseline}%` : "—"}
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            {biometrics?.hrv?.baevskyDeltaVsBaseline !== undefined ? "vs calm baseline (unitless)" : "Requires 60s window"}
                          </div>
                        </div>

                        {/* Recovery approx */}
                        <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Recovery (approx.)</span>
                            {renderStateBadge("measured")}
                          </div>
                          <div className="tabular-nums" style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-green)", marginTop: "2px" }}>
                            ~{biometrics?.recoverySecondsApprox || 14}s
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            Resolution ~12s
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BREATHING Metrics Group (When Quiet) */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                        Breathing (Quiet Segments)
                      </div>
                      <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>Breathing Rate</span>
                          {renderStateBadge(biometrics?.breathing?.state || "notMeasurableWhileSpeaking", biometrics?.breathing?.confidence)}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                          {biometrics?.breathing?.quietRateBpm ? `${biometrics.breathing.quietRateBpm} br/min` : "Not measurable while speaking"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                          Window: 30s · Range: 5–40 br/min · Camera must remain steady
                        </div>
                      </div>
                    </div>

                    {/* FACE Metrics Group (8 Expression Stacked Mix + Blink + Speaking) */}
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                        Face & Landmark Signals (478 Landmarks)
                      </div>
                      <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--separator)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>Expression Mix Over Time</span>
                          {renderStateBadge(biometrics?.face?.state || "measured")}
                        </div>

                        {/* Stacked expression distribution bar */}
                        {biometrics?.face?.expressionAverages && (
                          <div>
                            <div style={{ height: "10px", width: "100%", borderRadius: "var(--radius-full)", overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${biometrics.face.expressionAverages.neutral * 100}%`, backgroundColor: "var(--accent-blue)" }} title="Neutral" />
                              <div style={{ width: `${biometrics.face.expressionAverages.fear * 100}%`, backgroundColor: "var(--accent-orange)" }} title="Fear" />
                              <div style={{ width: `${biometrics.face.expressionAverages.contempt * 100}%`, backgroundColor: "var(--accent-purple)" }} title="Contempt" />
                              <div style={{ width: `${biometrics.face.expressionAverages.surprise * 100}%`, backgroundColor: "var(--accent-teal)" }} title="Surprise" />
                              <div style={{ width: `${biometrics.face.expressionAverages.happy * 100}%`, backgroundColor: "var(--accent-green)" }} title="Happy" />
                              <div style={{ width: `${(biometrics.face.expressionAverages.sad + biometrics.face.expressionAverages.angry + biometrics.face.expressionAverages.disgust) * 100}%`, backgroundColor: "var(--accent-red)" }} title="Tension" />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                              <span>Neutral: {Math.round(biometrics.face.expressionAverages.neutral * 100)}%</span>
                              <span>Fear: {Math.round(biometrics.face.expressionAverages.fear * 100)}%</span>
                              <span>Surprise: {Math.round(biometrics.face.expressionAverages.surprise * 100)}%</span>
                              <span>Other: {Math.round((1 - biometrics.face.expressionAverages.neutral - biometrics.face.expressionAverages.fear - biometrics.face.expressionAverages.surprise) * 100)}%</span>
                            </div>
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--separator)" }}>
                          <div>
                            <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>Blink Frequency</div>
                            <div className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", marginTop: "1px" }}>
                              {biometrics?.face?.blinkRatePerMin || 18} blinks/min
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>Speaking Share</div>
                            <div className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", marginTop: "1px" }}>
                              {biometrics?.face?.speakingSharePct || 45}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wellness Disclaimer */}
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--separator)",
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        textAlign: "center",
                      }}
                    >
                      {WELLNESS_DISCLAIMER}
                    </div>
                  </>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========================================================================
  // 2. LIST VIEW (Grouped list scrolls inside its pane, header pinned)
  // ========================================================================
  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "var(--bg-content)",
        padding: "20px 28px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          width: "100%",
          margin: "0 auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Pinned Header */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "14px",
            paddingBottom: "10px",
            borderBottom: "1px solid var(--separator)",
            flexShrink: 0,
          }}
        >
          <div>
            <h1 style={{ fontSize: "23px", fontWeight: 650, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              Recordings &amp; Debriefs
            </h1>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px", margin: 0 }}>
              Review physiological composure signals and counterpart exchange dynamics.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--bg-control)",
                padding: "5px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--separator)",
              }}
            >
              <Search size={13} style={{ color: "var(--text-tertiary)" }} />
              <input
                type="text"
                placeholder="Filter recordings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  width: "180px",
                }}
              />
            </div>
          </div>
        </header>

        {/* Scrollable Grouped List Pane (Thin scrollbar on hover) */}
        <div
          className="custom-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {filteredRecordings.slice(0, visibleRecordingsCount).map((rec) => {
            const isTooShort = rec.status === "Too short" || rec.durationSeconds < 12;
            const score = rec.composureScore;
            const tier = score ? getComposureTier(score) : null;

            return (
              <div
                key={rec.id}
                onClick={() => {
                  handleSelectRecording(rec);
                }}
                className="mac-list-row mac-card-hoverable"
                style={{
                  padding: "14px 18px",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--separator)",
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                  <LazyAvatarImage
                    src={rec.personaAvatarUrl}
                    name={rec.personaName}
                    size={40}
                  />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {rec.scenarioTitle}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      With {rec.personaName} · {rec.relativeDate} · {rec.durationSeconds}s · {rec.readinessStatus || (isTooShort ? "Too short" : "Full read")}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    {isTooShort ? (
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 500 }}>Too short</span>
                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>No score</div>
                      </div>
                    ) : (
                      <div>
                        <span className="tabular-nums" style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-green)" }}>
                          {score}%
                        </span>
                        <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                          {tier}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRecording(rec);
                    }}
                    className="mac-btn focus-ring"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>View Debrief</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredRecordings.length > visibleRecordingsCount && (
            <div style={{ padding: "12px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setVisibleRecordingsCount((prev) => prev + 20)}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent-blue)",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--separator)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                Load more recordings ({filteredRecordings.length - visibleRecordingsCount} remaining)
              </button>
            </div>
          )}

          {recordings.length === 0 ? (
            <EmptyState
              icon={<Film size={28} />}
              title="No recordings yet"
              description="Completed sessions appear here with a transcript, coaching notes and body-signal analytics."
              primaryAction={{
                label: "Start a practice session",
                onClick: () => navigateTo("scenarios"),
              }}
            />
          ) : filteredRecordings.length === 0 ? (
            <EmptyState
              icon={<Search size={20} />}
              title="No matching results"
              description="Try a different search term or clear your filters."
              primaryAction={{
                label: "Clear filters",
                onClick: () => {
                  setSearchQuery("");
                },
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
