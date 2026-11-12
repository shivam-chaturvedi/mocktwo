import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context";
import { ScoreRing } from "../components/common/ScoreRing";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  ChevronLeft,
  Search,
  Share2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  MessageSquare,
  Mic,
  Headphones,
  Gauge,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Calendar
} from "lucide-react";
import type { Recording } from "../types";

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
    renameRecording,
    showToast
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScoreFilter, setSelectedScoreFilter] = useState<"all" | "high" | "mid">("all");
  const [contextMenuRec, setContextMenuRec] = useState<{ id: string; x: number; y: number } | null>(null);

  // Player & Detail State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<"coaching" | "analytics">("coaching");
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"language" | "listening" | "delivery">("language");
  const [noteInput, setNoteInput] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState("");

  const activeTranscriptRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRecording = selectedRecording || recordings[0] || null;

  // React pattern to sync playback state upon active recording change without cascading renders
  const [prevRecId, setPrevRecId] = useState(activeRecording?.id);
  if (activeRecording && activeRecording.id !== prevRecId) {
    setPrevRecId(activeRecording.id);
    setEditableTitle(activeRecording.scenarioTitle);
    setPlaybackTime(0);
    setIsPlaying(false);
  }

  // Media Player Simulation Timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setPlaybackTime((prev) => {
          if (!activeRecording) return 0;
          if (prev >= activeRecording.durationSeconds) {
            setIsPlaying(false);
            return activeRecording.durationSeconds;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, activeRecording]);

  // Keyboard Shortcuts for Media Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === " " && activeRecording) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "ArrowLeft" && activeRecording) {
        e.preventDefault();
        setPlaybackTime((prev) => Math.max(0, prev - 5));
      } else if (e.key === "ArrowRight" && activeRecording) {
        e.preventDefault();
        setPlaybackTime((prev) => Math.min(activeRecording.durationSeconds, prev + 5));
      } else if (e.metaKey && e.altKey && e.key === "0") {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRecording]);

  // Auto-scroll transcript to active line
  useEffect(() => {
    if (activeTranscriptRef.current) {
      activeTranscriptRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [playbackTime]);

  const handleSeek = (seconds: number) => {
    setPlaybackTime(seconds);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !activeRecording) return;
    addRecordingNote(activeRecording.id, playbackTime, noteInput);
    setNoteInput("");
  };

  const handleCopyTranscript = () => {
    if (!activeRecording) return;
    const text = activeRecording.transcript
      .map((t) => `[${Math.floor(t.timestampSeconds / 60)}:${(t.timestampSeconds % 60).toString().padStart(2, "0")}] ${t.speaker}: ${t.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    showToast("Transcript copied to clipboard");
  };

  const handleShareRecording = () => {
    showToast("Shared privately with Grand Palais Hotel internal team");
  };

  // Grouped Filtered Recordings for List View
  const filteredRecordings = recordings.filter((r) => {
    const matchesSearch =
      r.scenarioTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.guestName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore =
      selectedScoreFilter === "all"
        ? true
        : selectedScoreFilter === "high"
        ? (r.score || 0) >= 90
        : (r.score || 0) < 90 && (r.score || 0) >= 75;
    return matchesSearch && matchesScore;
  });

  const dateGroups: Record<string, Recording[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: []
  };

  filteredRecordings.forEach((r) => {
    if (dateGroups[r.dateGroup]) {
      dateGroups[r.dateGroup].push(r);
    } else {
      dateGroups.Earlier.push(r);
    }
  });

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  // ========================================================================
  // 1. DETAIL / SPLIT VIEW (When a recording is actively viewed)
  // ========================================================================
  if (selectedRecording) {
    const isTooShort = (selectedRecording.durationSeconds || 0) < 30 || selectedRecording.status === "Too short";

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 52px)",
          backgroundColor: "var(--bg-content)",
          overflow: "hidden"
        }}
      >
        {/* Detail Top Header */}
        <header
          style={{
            height: "48px",
            minHeight: "48px",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: isDebriefMode ? "rgba(10, 132, 255, 0.08)" : "var(--bg-window)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => {
                selectRecording(null);
                if (isDebriefMode) closeDebriefMode();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-control)",
                border: "1px solid var(--separator)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                cursor: "pointer"
              }}
              className="hover-subtle"
            >
              <ChevronLeft size={13} />
              <span>All Recordings</span>
            </button>

            <div style={{ width: "1px", height: "16px", backgroundColor: "var(--separator)" }} />

            {/* Editable Title */}
            {isEditingTitle ? (
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  renameRecording(selectedRecording.id, editableTitle);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingTitle(false);
                    renameRecording(selectedRecording.id, editableTitle);
                  }
                }}
                autoFocus
                style={{
                  padding: "3px 8px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--accent-blue)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--text-primary)"
                }}
              />
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename"
                style={{
                  fontSize: "13.5px",
                  fontWeight: 650,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{selectedRecording.scenarioTitle}</span>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>✎</span>
              </div>
            )}

            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              • {selectedRecording.guestName}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isDebriefMode ? (
              <>
                <button
                  onClick={() => {
                    const sc = scenarios.find((s) => s.id === selectedRecording.scenarioId) || scenarios[0];
                    closeDebriefMode();
                    openBriefing(sc);
                  }}
                  style={{
                    height: "30px",
                    padding: "0 12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  Practice Again
                </button>

                <button
                  onClick={() => {
                    closeDebriefMode();
                    navigateTo("today");
                  }}
                  style={{
                    height: "30px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleShareRecording}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                    cursor: "pointer"
                  }}
                  className="hover-subtle"
                >
                  <Share2 size={12} />
                  <span>Share with Team</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this recording?")) {
                      deleteRecording(selectedRecording.id);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11.5px",
                    color: "var(--accent-red)",
                    cursor: "pointer"
                  }}
                  className="hover-subtle"
                >
                  <Trash2 size={12} />
                </button>

                {/* Inspector Toggle (⌥⌘0) */}
                <button
                  onClick={() => setIsInspectorOpen((prev) => !prev)}
                  title="Toggle Inspector (⌥⌘0)"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: isInspectorOpen ? "var(--bg-hover)" : "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-secondary)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer"
                  }}
                >
                  {isInspectorOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Split View Content: Left Player & Transcript + Right Inspector */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ============================================================ */}
          {/* LEFT / CENTER PANE: PLAYER & TRANSCRIPT */}
          {/* ============================================================ */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              borderRight: isInspectorOpen ? "1px solid var(--separator)" : "none",
              backgroundColor: "var(--bg-window)"
            }}
          >
            {/* Media Player Stage */}
            <div
              style={{
                backgroundColor: "#0d0d0e",
                borderBottom: "1px solid var(--separator)",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              {/* Video Screen Simulation */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "680px",
                  height: "240px",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "rgba(20, 20, 22, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)"
                }}
              >
                {/* Guest portrait avatar in center */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "88px",
                      height: "88px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isPlaying ? "2px solid var(--accent-blue)" : "1px solid rgba(255, 255, 255, 0.15)",
                      boxShadow: isPlaying ? "0 0 20px rgba(10, 132, 255, 0.35)" : "none",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <img
                      src={selectedRecording.guestAvatarUrl}
                      alt={selectedRecording.guestName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {selectedRecording.guestName}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                      Recorded Dialogue Session
                    </div>
                  </div>
                </div>

                {/* Status indicator on player */}
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "14px",
                    fontSize: "11px",
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  {formatSeconds(playbackTime)} / {formatSeconds(selectedRecording.durationSeconds)}
                </div>
              </div>

              {/* Scrubber & Controls */}
              <div style={{ width: "100%", maxWidth: "680px", marginTop: "12px" }}>
                {/* Scrubber Bar */}
                <input
                  type="range"
                  min={0}
                  max={selectedRecording.durationSeconds || 1}
                  value={playbackTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "4px",
                    appearance: "none",
                    backgroundColor: "var(--bg-control)",
                    borderRadius: "2px",
                    cursor: "pointer",
                    outline: "none"
                  }}
                />

                {/* Control Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "8px"
                  }}
                >
                  {/* Left: Play/Pause, ±5s */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={() => setIsPlaying((prev) => !prev)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        border: "none",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer"
                      }}
                    >
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>

                    <button
                      onClick={() => handleSeek(Math.max(0, playbackTime - 5))}
                      title="Rewind 5s (←)"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "var(--radius-sm)",
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer"
                      }}
                      className="hover-subtle"
                    >
                      <RotateCcw size={14} />
                    </button>

                    <button
                      onClick={() => handleSeek(Math.min(selectedRecording.durationSeconds, playbackTime + 5))}
                      title="Forward 5s (→)"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "var(--radius-sm)",
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer"
                      }}
                      className="hover-subtle"
                    >
                      <RotateCw size={14} />
                    </button>

                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {formatSeconds(playbackTime)} / {formatSeconds(selectedRecording.durationSeconds)}
                    </span>
                  </div>

                  {/* Right: Speed & Volume */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* Speed Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeed(spd)}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "var(--radius-xs)",
                            fontSize: "11px",
                            fontWeight: playbackSpeed === spd ? 600 : 400,
                            backgroundColor: playbackSpeed === spd ? "var(--bg-control)" : "transparent",
                            color: playbackSpeed === spd ? "var(--text-primary)" : "var(--text-tertiary)",
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Mute/Volume Toggle */}
                    <button
                      onClick={() => setIsMuted((prev) => !prev)}
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                    >
                      {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript & Notes Section */}
            <div style={{ flex: 1, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MessageSquare size={14} style={{ color: "var(--accent-blue)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
                    Timestamped Transcript
                  </span>
                </div>

                <button
                  onClick={handleCopyTranscript}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer"
                  }}
                  className="hover-subtle"
                >
                  <Copy size={12} />
                  <span>Copy transcript</span>
                </button>
              </div>

              {/* Transcript Bubbles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {selectedRecording.transcript.map((item) => {
                  const isActive =
                    playbackTime >= item.timestampSeconds &&
                    playbackTime < item.timestampSeconds + 8;
                  const isYou = item.speaker === "You";

                  return (
                    <div
                      key={item.id}
                      ref={isActive ? activeTranscriptRef : null}
                      onClick={() => handleSeek(item.timestampSeconds)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: isActive ? "rgba(10, 132, 255, 0.12)" : "var(--bg-elevated)",
                        border: isActive ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                        cursor: "pointer",
                        transition: "all 0.12s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 650, color: isYou ? "var(--accent-blue)" : "var(--text-secondary)" }}>
                          {item.speaker === "You" ? "You (Elena Vance)" : selectedRecording.guestName}
                        </span>

                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                          {formatSeconds(item.timestampSeconds)}
                        </span>
                      </div>

                      <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.45 }}>
                        {item.text}
                      </div>

                      {item.isWeakPhrase && item.weakPhraseHint && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11.5px",
                            color: "var(--accent-orange)",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                        >
                          <AlertTriangle size={12} />
                          <span>Coaching tip: {item.weakPhraseHint}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* User Notes Attached at Timestamp */}
              {selectedRecording.userNotes?.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Your Personal Practice Notes
                  </div>
                  {selectedRecording.userNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => handleSeek(note.timestampSeconds)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        cursor: "pointer"
                      }}
                    >
                      <span style={{ color: "var(--accent-blue)", fontFamily: "var(--font-mono)", marginRight: "8px" }}>
                        [{formatSeconds(note.timestampSeconds)}]
                      </span>
                      <span>{note.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note Input Field at current playhead */}
              <form onSubmit={handleAddNote} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder={`Add a practice note at ${formatSeconds(playbackTime)}…`}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "12.5px"
                  }}
                />
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  style={{
                    padding: "0 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: noteInput.trim() ? "pointer" : "default",
                    opacity: noteInput.trim() ? 1 : 0.5
                  }}
                >
                  Add Note
                </button>
              </form>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT INSPECTOR (Coaching | Analytics, ~380px) */}
          {/* ============================================================ */}
          {isInspectorOpen && (
            <div
              style={{
                width: "380px",
                minWidth: "340px",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--bg-elevated)",
                overflowY: "auto",
                borderLeft: "1px solid var(--separator)"
              }}
            >
              {/* Inspector Header Tabs: Coaching | Analytics */}
              <div
                style={{
                  height: "44px",
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid var(--separator)",
                  backgroundColor: "rgba(30, 30, 32, 0.4)"
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                    backgroundColor: "var(--bg-control)",
                    padding: "2px",
                    borderRadius: "var(--radius-sm)",
                    width: "100%"
                  }}
                >
                  <button
                    onClick={() => setInspectorTab("coaching")}
                    style={{
                      flex: 1,
                      padding: "4px 0",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "12px",
                      fontWeight: inspectorTab === "coaching" ? 600 : 450,
                      color: inspectorTab === "coaching" ? "var(--text-primary)" : "var(--text-secondary)",
                      backgroundColor: inspectorTab === "coaching" ? "var(--bg-elevated)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    Coaching
                  </button>

                  <button
                    onClick={() => setInspectorTab("analytics")}
                    style={{
                      flex: 1,
                      padding: "4px 0",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "12px",
                      fontWeight: inspectorTab === "analytics" ? 600 : 450,
                      color: inspectorTab === "analytics" ? "var(--text-primary)" : "var(--text-secondary)",
                      backgroundColor: inspectorTab === "analytics" ? "var(--bg-elevated)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    Analytics
                  </button>
                </div>
              </div>

              {/* Inspector Body Content */}
              <div style={{ flex: 1, padding: "18px 20px" }}>
                {isTooShort ? (
                  <div
                    style={{
                      backgroundColor: "rgba(255, 159, 10, 0.1)",
                      border: "1px solid rgba(255, 159, 10, 0.25)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      textAlign: "center"
                    }}
                  >
                    <AlertTriangle size={24} style={{ color: "var(--accent-orange)", margin: "0 auto 8px auto" }} />
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                      This session was too short to score
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px 0", lineHeight: 1.4 }}>
                      Practice for at least 30 seconds to allow the AI evaluator to analyze speech cadence, empathy, and luxury etiquette.
                    </p>
                    <button
                      onClick={() => {
                        const sc = scenarios.find((s) => s.id === selectedRecording.scenarioId) || scenarios[0];
                        openBriefing(sc);
                      }}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer"
                      }}
                    >
                      Practice Again
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* ======================================================== */}
                    {/* COACHING TAB */}
                    {/* ======================================================== */}
                    {inspectorTab === "coaching" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        {/* Overall Score Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingBottom: "14px", borderBottom: "1px solid var(--separator)" }}>
                          <ScoreRing score={selectedRecording.score || 90} size={64} strokeWidth={6} />
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                              Overall Rating: {selectedRecording.score}%
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--accent-green)", fontWeight: 500 }}>
                              Outstanding Luxury Distinction
                            </div>
                          </div>
                        </div>

                        {/* What Went Well */}
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                            <CheckCircle2 size={13} />
                            <span>What Went Well</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {selectedRecording.coachingNotes.whatWentWell.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  padding: "10px 12px",
                                  backgroundColor: "var(--bg-control)",
                                  borderRadius: "var(--radius-md)",
                                  border: "1px solid var(--separator)"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                                    {note.title}
                                  </span>
                                  <button
                                    onClick={() => handleSeek(note.timestampSeconds)}
                                    style={{
                                      fontSize: "10.5px",
                                      fontFamily: "var(--font-mono)",
                                      color: "var(--accent-blue)",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      padding: "1px 4px",
                                      borderRadius: "3px"
                                    }}
                                  >
                                    {formatSeconds(note.timestampSeconds)}
                                  </button>
                                </div>
                                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                  {note.explanation}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* What Could Be Better */}
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-orange)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                            <AlertTriangle size={13} />
                            <span>What Could Be Better</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {selectedRecording.coachingNotes.whatCouldBeBetter.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  padding: "10px 12px",
                                  backgroundColor: "var(--bg-control)",
                                  borderRadius: "var(--radius-md)",
                                  border: "1px solid var(--separator)"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                                    {note.title}
                                  </span>
                                  <button
                                    onClick={() => handleSeek(note.timestampSeconds)}
                                    style={{
                                      fontSize: "10.5px",
                                      fontFamily: "var(--font-mono)",
                                      color: "var(--accent-orange)",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      padding: "1px 4px",
                                      borderRadius: "3px"
                                    }}
                                  >
                                    {formatSeconds(note.timestampSeconds)}
                                  </button>
                                </div>
                                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                  {note.explanation}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 5 Core Competencies */}
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                            Competency Breakdown
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {Object.values(selectedRecording.competencies).map((comp, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 10px",
                                  backgroundColor: "var(--bg-control)",
                                  borderRadius: "var(--radius-sm)",
                                  border: "1px solid var(--separator)"
                                }}
                              >
                                <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{comp.name}</span>
                                <span style={{ fontSize: "12px", fontWeight: 650, color: comp.score >= 90 ? "var(--accent-green)" : "var(--accent-blue)" }}>
                                  {comp.score}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* ANALYTICS TAB */}
                    {/* ======================================================== */}
                    {inspectorTab === "analytics" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Sub-tabs: Language | Listening | Delivery */}
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            padding: "2px",
                            backgroundColor: "var(--bg-control)",
                            borderRadius: "var(--radius-sm)"
                          }}
                        >
                          {[
                            { id: "language", label: "Language", icon: <Mic size={11} /> },
                            { id: "listening", label: "Listening", icon: <Headphones size={11} /> },
                            { id: "delivery", label: "Delivery", icon: <Gauge size={11} /> }
                          ].map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setAnalyticsSubTab(sub.id as typeof analyticsSubTab)}
                              style={{
                                flex: 1,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                padding: "4px 0",
                                fontSize: "11.5px",
                                fontWeight: analyticsSubTab === sub.id ? 600 : 450,
                                color: analyticsSubTab === sub.id ? "var(--text-primary)" : "var(--text-secondary)",
                                backgroundColor: analyticsSubTab === sub.id ? "var(--bg-elevated)" : "transparent",
                                border: "none",
                                borderRadius: "var(--radius-xs)",
                                cursor: "pointer"
                              }}
                            >
                              {sub.icon}
                              <span>{sub.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* LANGUAGE ANALYTICS */}
                        {analyticsSubTab === "language" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Filler Word Rate</span>
                                <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--accent-green)" }}>
                                  {selectedRecording.analytics.language.fillerWordRate}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                {selectedRecording.analytics.language.fillerThresholdMessage}
                              </div>
                            </div>

                            {/* Weak Words */}
                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                                Hedging / Weak Phrasing
                              </div>
                              {selectedRecording.analytics.language.weakWords.length > 0 ? (
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                  {selectedRecording.analytics.language.weakWords.map((w, i) => (
                                    <span key={i} style={{ fontSize: "11px", padding: "2px 7px", backgroundColor: "rgba(255, 159, 10, 0.15)", color: "var(--accent-orange)", borderRadius: "var(--radius-xs)" }}>
                                      "{w}"
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ fontSize: "11.5px", color: "var(--accent-green)" }}>No hedging words detected</span>
                              )}
                            </div>

                            {/* Service Vocabulary */}
                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                                Five-Star Service Vocabulary Used
                              </div>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {selectedRecording.analytics.language.serviceVocabulary.map((v, i) => (
                                  <span key={i} style={{ fontSize: "11px", padding: "2px 7px", backgroundColor: "rgba(48, 209, 88, 0.12)", color: "var(--accent-green)", borderRadius: "var(--radius-xs)" }}>
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* LISTENING ANALYTICS */}
                        {analyticsSubTab === "listening" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {/* Talk time ratio bar */}
                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                                <span style={{ color: "var(--accent-blue)" }}>You: {selectedRecording.analytics.listening.youPercentage}%</span>
                                <span style={{ color: "var(--text-secondary)" }}>Guest: {selectedRecording.analytics.listening.guestPercentage}%</span>
                              </div>
                              <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-elevated)", borderRadius: "4px", display: "flex", overflow: "hidden" }}>
                                <div style={{ width: `${selectedRecording.analytics.listening.youPercentage}%`, height: "100%", backgroundColor: "var(--accent-blue)" }} />
                                <div style={{ width: `${selectedRecording.analytics.listening.guestPercentage}%`, height: "100%", backgroundColor: "var(--text-tertiary)" }} />
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                                Ideal active inquiry distribution for luxury concierge resolution.
                              </div>
                            </div>

                            {/* Questions asked */}
                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                                Inquiries & Discovery Questions Asked
                              </div>
                              {selectedRecording.analytics.listening.questionsAsked.map((q, i) => (
                                <div key={i} style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                  • "{q}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* DELIVERY ANALYTICS */}
                        {analyticsSubTab === "delivery" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Speaking Pace</span>
                                <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-primary)" }}>
                                  {selectedRecording.analytics.delivery.wordsPerMinute} WPM
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--accent-green)" }}>
                                {selectedRecording.analytics.delivery.paceRating} (Target: {selectedRecording.analytics.delivery.idealWpmRange})
                              </div>
                            </div>

                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Intentional Pauses</span>
                                <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-primary)" }}>
                                  {selectedRecording.analytics.delivery.pauseCount} pauses
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                Longest reflective pause: {selectedRecording.analytics.delivery.longestPauseSeconds}s
                              </div>
                            </div>

                            <div style={{ padding: "12px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-md)", border: "1px solid var(--separator)" }}>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                Vocal Tone & Presence
                              </div>
                              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                                {selectedRecording.analytics.delivery.toneEnergy}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========================================================================
  // 2. LIST VIEW (Default recordings library)
  // ========================================================================
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "var(--bg-content)",
        padding: "32px 40px 60px 40px"
      }}
      onClick={() => {
        if (contextMenuRec) setContextMenuRec(null);
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        {/* Header & Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap"
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
                letterSpacing: "-0.015em"
              }}
            >
              Recordings & Debriefs
            </h1>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0 }}>
              Review timestamped transcripts, AI coaching notes, and speech delivery analytics.
            </p>
          </div>

          {/* Search, Filter & View Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                backgroundColor: "var(--bg-control)",
                border: "1px solid var(--separator)",
                borderRadius: "var(--radius-md)",
                minWidth: "220px"
              }}
            >
              <Search size={13} style={{ color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder="Search recordings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "12.5px",
                  width: "100%"
                }}
              />
            </div>

            {/* Score Filter */}
            <select
              value={selectedScoreFilter}
              onChange={(e) => setSelectedScoreFilter(e.target.value as typeof selectedScoreFilter)}
              style={{
                height: "32px",
                padding: "0 10px",
                backgroundColor: "var(--bg-control)",
                color: "var(--text-secondary)",
                border: "1px solid var(--separator)",
                borderRadius: "var(--radius-md)",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              <option value="all">All Scores</option>
              <option value="high">High Distinction (90%+)</option>
              <option value="mid">Mid Scores (75-89%)</option>
            </select>
          </div>
        </div>

        {/* Grouped Recording Sections: Today / Yesterday / This Week / Earlier */}
        {Object.entries(dateGroups).map(([groupName, groupItems]) => {
          if (groupItems.length === 0) return null;

          return (
            <div key={groupName} style={{ marginBottom: "28px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 650,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Calendar size={12} />
                <span>{groupName}</span>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>({groupItems.length})</span>
              </div>

              {/* Items Card List */}
              <div
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--separator)",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
                }}
              >
                {groupItems.map((rec, index) => {
                  const isTooShort = rec.status === "Too short";
                  const scoreColor =
                    (rec.score || 0) >= 90
                      ? "var(--accent-green)"
                      : (rec.score || 0) >= 75
                      ? "var(--accent-blue)"
                      : "var(--accent-orange)";

                  return (
                    <div
                      key={rec.id}
                      onClick={() => selectRecording(rec)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenuRec({ id: rec.id, x: e.clientX, y: e.clientY });
                      }}
                      style={{
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: index < groupItems.length - 1 ? "1px solid var(--separator)" : "none",
                        cursor: "pointer",
                        transition: "background-color 0.12s ease"
                      }}
                      className="hover-subtle"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                        {/* Avatar / Thumbnail */}
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={rec.guestAvatarUrl}
                            alt={rec.guestName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {rec.scenarioTitle}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            Guest: {rec.guestName} · {rec.date}
                          </div>
                        </div>
                      </div>

                      {/* Right Details: Duration + Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                        <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                          {formatSeconds(rec.durationSeconds)}
                        </span>

                        {isTooShort ? (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "rgba(255, 159, 10, 0.12)",
                              color: "var(--accent-orange)",
                              fontWeight: 500
                            }}
                          >
                            Too short
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              color: scoreColor,
                              backgroundColor: "var(--bg-control)",
                              padding: "3px 8px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--separator)"
                            }}
                          >
                            {rec.score}%
                          </span>
                        )}

                        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredRecordings.length === 0 && (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--separator)"
            }}
          >
            <Clock size={32} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
              No matching recordings found
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
              Try adjusting your search query or practice a new scenario from the Today tab.
            </p>
          </div>
        )}

        {/* Context Menu for right-click on recording row */}
        {contextMenuRec && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              position: "fixed",
              top: contextMenuRec.y,
              left: contextMenuRec.x,
              width: "180px",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-modal)",
              border: "1px solid var(--separator)",
              padding: "4px",
              zIndex: 200
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const target = recordings.find((r) => r.id === contextMenuRec.id);
                if (target) selectRecording(target);
                setContextMenuRec(null);
              }}
              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
              className="hover-subtle"
            >
              Open Debrief
            </button>
            <button
              onClick={() => {
                handleShareRecording();
                setContextMenuRec(null);
              }}
              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
              className="hover-subtle"
            >
              Share with Manager
            </button>
            <button
              onClick={() => {
                deleteRecording(contextMenuRec.id);
                setContextMenuRec(null);
              }}
              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px", color: "var(--accent-red)" }}
              className="hover-subtle"
            >
              Delete Recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
