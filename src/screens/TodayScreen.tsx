import React, { useState } from "react";
import { useApp } from "../context";
import { formatRoomNumber, type Recording } from "../types";
import { ScoreRing } from "../components/common/ScoreRing";
import { CategoryIcon } from "../components/common/CategoryIcon";
import {
  Clock,
  Flame,
  ArrowRight,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Shuffle
} from "lucide-react";

export const TodayScreen: React.FC = () => {
  const {
    employee,
    scenarios,
    recordings,
    openBriefing,
    navigateTo,
    selectRecording,
    triggerRandomPractice,
    triggerLastUsedPractice
  } = useApp();

  const [whyThisOpen, setWhyThisOpen] = useState(false);
  const [contextMenuRec, setContextMenuRec] = useState<{ id: string; x: number; y: number } | null>(null);

  // Time-aware greeting calculated cleanly in initializer
  const [{ greeting, formattedDate }] = useState(() => {
    const now = new Date();
    const hour = now.getHours();
    const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
    return { greeting: greet, formattedDate: dateStr };
  });
  const firstName = employee.name.split(" ")[0];

  // Recommended focus scenario
  const assignedScenario = scenarios.find((s) => s.source === "Assigned");
  const focusScenario = assignedScenario || scenarios[0];

  // Room string sanitization (prevents "Suite Suite 1408")
  const sanitizedRoom = formatRoomNumber(focusScenario.roomNumber);

  // Lowest skill for Skill Focus card
  const lowestSkill = {
    name: "Active Listening & Inquiry",
    score: 84,
    coachingTip: "Allow guests to complete grievances fully without premature interjection.",
    recommendedScenarioId: "sc-demanding"
  };

  // Recent 4 sessions
  const recentRecordings = recordings.slice(0, 4);

  // Week days for This Week card (M T W T F S S)
  const weekDays = [
    { label: "M", status: "practiced" },
    { label: "T", status: "practiced" },
    { label: "W", status: "practiced" },
    { label: "T", status: "today" },
    { label: "F", status: "future" },
    { label: "S", status: "future" },
    { label: "S", status: "future" }
  ];

  const handleOpenRecording = (rec: Recording) => {
    selectRecording(rec);
    navigateTo("recordings");
  };

  const handlePracticeSkill = () => {
    const target = scenarios.find((s) => s.id === lowestSkill.recommendedScenarioId) || focusScenario;
    openBriefing(target);
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "var(--bg-content)",
        padding: "24px 32px 48px 32px"
      }}
      onClick={() => {
        if (contextMenuRec) setContextMenuRec(null);
        if (whyThisOpen) setWhyThisOpen(false);
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        {/* Header: Time-aware greeting + Date */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "20px",
            borderBottom: "1px solid var(--separator)",
            paddingBottom: "16px"
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                margin: 0
              }}
            >
              {greeting}, {firstName}
            </h1>
            <p
              style={{
                fontSize: "14.5px",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0"
              }}
            >
              Your daily practice desk is primed for luxury guest relations.
            </p>
          </div>
          <span
            style={{
              fontSize: "13px",
              color: "var(--text-tertiary)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums"
            }}
          >
            {formattedDate}
          </span>
        </header>

        {/* 12-Column Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "20px",
            alignItems: "start"
          }}
        >
          {/* ============================================================ */}
          {/* FOCUS CARD (8 Columns) */}
          {/* ============================================================ */}
          <div
            style={{
              gridColumn: "span 8",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "14px",
              border: "1px solid var(--separator)",
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "220px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              transition: "border-color 0.15s ease",
              position: "relative"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--separator)")}
          >
            {/* Top Row: Category pill + Up next + Why this? */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 9px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(10, 132, 255, 0.12)",
                    border: "1px solid rgba(10, 132, 255, 0.3)",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "var(--accent-blue)"
                  }}
                >
                  <CategoryIcon category={focusScenario.interactionType} size={12} />
                  <span>{focusScenario.interactionType}</span>
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}
                >
                  Up next
                </span>
              </div>

              {/* Why this? Popover */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setWhyThisOpen((prev) => !prev);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "var(--accent-blue)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  <HelpCircle size={12} />
                  <span>Why this?</span>
                </button>

                {whyThisOpen && (
                  <div
                    className="glass-surface animate-sheet-in"
                    style={{
                      position: "absolute",
                      top: "24px",
                      right: 0,
                      width: "260px",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-dropdown)",
                      border: "1px solid var(--separator)",
                      zIndex: 30,
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "var(--text-secondary)"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Curated Practice Target
                    </div>
                    Selected based on your recent practice frequency and lowest recent competency rating (
                    <strong style={{ color: "var(--accent-orange)" }}>Active Listening</strong> at 84%).
                  </div>
                )}
              </div>
            </div>

            {/* Middle Row: 56px Avatar + Title + Guest Dossier + 2-line Description */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  border: "1px solid var(--separator)",
                  overflow: "hidden",
                  flexShrink: 0,
                  backgroundColor: "var(--bg-control)"
                }}
              >
                <img
                  src={focusScenario.guestAvatarUrl}
                  alt={focusScenario.guestName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <h3
                    style={{
                      fontSize: "19px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      margin: 0,
                      letterSpacing: "-0.01em"
                    }}
                  >
                    {focusScenario.title}
                  </h3>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 450 }}>
                    {focusScenario.guestName} · {sanitizedRoom} · {focusScenario.loyaltyTier}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    margin: "6px 0 0 0",
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {focusScenario.summary}
                </p>

                {/* Chips: duration, difficulty, mood */}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      fontSize: "11px",
                      color: "var(--text-secondary)"
                    }}
                  >
                    <Clock size={11} />
                    <span>~{focusScenario.durationMinutes} min</span>
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      fontSize: "11px",
                      color: "var(--text-secondary)"
                    }}
                  >
                    <span>●</span>
                    <span>{focusScenario.difficulty}</span>
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(255, 159, 10, 0.12)",
                      border: "1px solid rgba(255, 159, 10, 0.25)",
                      fontSize: "11px",
                      color: "var(--accent-orange)",
                      fontWeight: 500
                    }}
                  >
                    Mood: {focusScenario.guestMood}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer: Primary Begin Session (36px, blue) + Secondary Choose Another */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid var(--separator)", paddingTop: "14px" }}>
              <button
                onClick={() => openBriefing(focusScenario)}
                title="Start session (Return)"
                style={{
                  height: "36px",
                  padding: "0 18px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent-blue)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(10, 132, 255, 0.4)",
                  transition: "all 0.12s ease"
                }}
              >
                <span>Begin Session</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => navigateTo("scenarios")}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-control)",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "1px solid var(--separator)",
                  cursor: "pointer",
                  transition: "all 0.12s ease"
                }}
                className="hover-subtle"
              >
                Choose Another
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PROGRESS CARD (4 Columns) */}
          {/* ============================================================ */}
          <div
            style={{
              gridColumn: "span 4",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "14px",
              border: "1px solid var(--separator)",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "220px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 600 }}>
                Overall Rating
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--accent-green)",
                  backgroundColor: "rgba(48, 209, 88, 0.12)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)"
                }}
              >
                <TrendingUp size={11} />
                <span>+4% this month</span>
              </span>
            </div>

            {/* Score Ring & Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "10px 0" }}>
              <ScoreRing score={employee.averageRating} size={88} strokeWidth={8} />

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Sessions</span>
                  <strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {employee.completedSessionsCount}
                  </strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Practice time</span>
                  <strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    54 mins
                  </strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Top skill</span>
                  <strong style={{ color: "var(--accent-green)" }}>Poise (95%)</strong>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "10px" }}>
              <button
                onClick={() => navigateTo("progress")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: "var(--accent-blue)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                <span>View Progress</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RECENT SESSIONS (8 Columns) */}
          {/* ============================================================ */}
          <div
            style={{
              gridColumn: "span 8",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "14px",
              border: "1px solid var(--separator)",
              padding: "18px 20px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 600, margin: 0 }}>
                Recent Sessions
              </h4>
              <button
                onClick={() => navigateTo("recordings")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "12px",
                  color: "var(--accent-blue)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                <span>View all</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {/* List of 4 Rows */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentRecordings.map((rec, index) => {
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
                    onClick={() => handleOpenRecording(rec)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuRec({ id: rec.id, x: e.clientX, y: e.clientY });
                    }}
                    style={{
                      height: "48px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 10px",
                      borderRadius: "var(--radius-md)",
                      borderBottom: index < recentRecordings.length - 1 ? "1px solid var(--separator)" : "none",
                      cursor: "pointer",
                      transition: "background-color 0.12s ease"
                    }}
                    className="hover-subtle"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)"
                        }}
                      >
                        {rec.guestAvatarUrl ? (
                          <img src={rec.guestAvatarUrl} alt={rec.guestName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: "11px", fontWeight: 600 }}>
                            {rec.guestName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 550, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {rec.scenarioTitle}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {rec.guestName} · {rec.relativeDate}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                        {Math.floor(rec.durationSeconds / 60)}m {rec.durationSeconds % 60}s
                      </span>

                      {isTooShort ? (
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 7px",
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
                            fontSize: "12px",
                            fontWeight: 650,
                            fontVariantNumeric: "tabular-nums",
                            color: scoreColor,
                            backgroundColor: "var(--bg-control)",
                            padding: "2px 7px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--separator)"
                          }}
                        >
                          {rec.score}%
                        </span>
                      )}

                      <ChevronRight size={13} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Context Menu for recording row */}
            {contextMenuRec && (
              <div
                className="glass-surface animate-sheet-in"
                style={{
                  position: "fixed",
                  top: contextMenuRec.y,
                  left: contextMenuRec.x,
                  width: "160px",
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
                    if (target) handleOpenRecording(target);
                    setContextMenuRec(null);
                  }}
                  style={{ width: "100%", padding: "6px 10px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
                  className="hover-subtle"
                >
                  Open Recording
                </button>
                <button
                  onClick={() => {
                    const targetRec = recordings.find((r) => r.id === contextMenuRec.id);
                    const sc = scenarios.find((s) => s.id === targetRec?.scenarioId) || focusScenario;
                    openBriefing(sc);
                    setContextMenuRec(null);
                  }}
                  style={{ width: "100%", padding: "6px 10px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
                  className="hover-subtle"
                >
                  Practice Again
                </button>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN (4 Columns): THIS WEEK CARD + SKILL FOCUS */}
          {/* ============================================================ */}
          <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* THIS WEEK CARD */}
            <div
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderRadius: "14px",
                border: "1px solid var(--separator)",
                padding: "18px 20px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 600 }}>
                  This Week
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "var(--accent-orange)",
                    fontWeight: 600
                  }}
                >
                  <Flame size={13} fill="var(--accent-orange)" />
                  <span>{employee.streakDays}-day streak</span>
                </span>
              </div>

              {/* 7 Day Dots: M T W T F S S */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                {weekDays.map((d, i) => {
                  const isPracticed = d.status === "practiced";
                  const isToday = d.status === "today";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: isPracticed ? "var(--accent-green)" : isToday ? "rgba(48, 209, 88, 0.15)" : "var(--bg-control)",
                          border: isToday ? "1.5px solid var(--accent-green)" : "1px solid var(--separator)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "10.5px",
                          fontWeight: 650,
                          color: isPracticed ? "#000000" : isToday ? "var(--accent-green)" : "var(--text-tertiary)"
                        }}
                      >
                        {d.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Goal line: Goal: 3 sessions · 2 done */}
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Goal: 3 sessions · <strong style={{ color: "var(--text-primary)" }}>2 done</strong>
              </div>
              <div style={{ width: "100%", height: "4px", backgroundColor: "var(--bg-control)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: "66%", height: "100%", backgroundColor: "var(--accent-green)", borderRadius: "2px" }} />
              </div>
            </div>

            {/* SKILL FOCUS (OR ASSIGNED) CARD */}
            {assignedScenario ? (
              <div
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderRadius: "14px",
                  border: "1px solid rgba(10, 132, 255, 0.3)",
                  padding: "18px 20px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 650, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Manager Assigned
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--accent-orange)",
                      fontWeight: 600,
                      backgroundColor: "rgba(255, 159, 10, 0.12)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-sm)"
                    }}
                  >
                    Due {assignedScenario.dueDate || "Tomorrow"}
                  </span>
                </div>

                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  {assignedScenario.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
                  Assigned by {assignedScenario.assignedBy || "Front Desk Lead"}: {assignedScenario.summary}
                </div>

                <button
                  onClick={() => openBriefing(assignedScenario)}
                  style={{
                    width: "100%",
                    height: "32px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Start Assignment
                </button>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderRadius: "14px",
                  border: "1px solid var(--separator)",
                  padding: "18px 20px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 600 }}>
                    Skill Focus
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-orange)" }}>
                    {lowestSkill.score}%
                  </span>
                </div>

                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  {lowestSkill.name}
                </div>

                <div style={{ width: "100%", height: "4px", backgroundColor: "var(--bg-control)", borderRadius: "2px", marginBottom: "8px" }}>
                  <div style={{ width: `${lowestSkill.score}%`, height: "100%", backgroundColor: "var(--accent-orange)", borderRadius: "2px" }} />
                </div>

                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                  {lowestSkill.coachingTip}
                </p>

                <button
                  onClick={handlePracticeSkill}
                  style={{
                    width: "100%",
                    height: "32px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                  className="hover-subtle"
                >
                  Practice this skill →
                </button>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* QUICK START STRIP (Full Width, 12 Columns) */}
          {/* ============================================================ */}
          <div
            style={{
              gridColumn: "span 12",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "14px",
              border: "1px solid var(--separator)",
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              overflowX: "auto"
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
              Quick Start:
            </span>

            {/* Category Chips */}
            {[
              { label: "Escalation Management", icon: <CategoryIcon category="Escalation Management" size={13} />, color: "var(--accent-red)" },
              { label: "Concierge", icon: <CategoryIcon category="Concierge" size={13} />, color: "var(--accent-purple)" },
              { label: "Executive Lounge", icon: <CategoryIcon category="Executive Lounge" size={13} />, color: "var(--accent-teal)" },
              { label: "Front Desk", icon: <CategoryIcon category="Front Desk" size={13} />, color: "var(--accent-blue)" },
              { label: "Guest Services", icon: <CategoryIcon category="Guest Services" size={13} />, color: "var(--accent-green)" }
            ].map((cat, idx) => {
              const matched = scenarios.find((s) => s.interactionType === cat.label) || focusScenario;
              return (
                <button
                  key={idx}
                  onClick={() => openBriefing(matched)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "all 0.12s ease"
                  }}
                  className="hover-subtle"
                >
                  <span style={{ color: cat.color }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}

            <div style={{ width: "1px", height: "18px", backgroundColor: "var(--separator)", flexShrink: 0 }} />

            {/* Random Button */}
            <button
              onClick={triggerRandomPractice}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(10, 132, 255, 0.12)",
                border: "1px solid rgba(10, 132, 255, 0.3)",
                fontSize: "12px",
                color: "var(--accent-blue)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                cursor: "pointer"
              }}
            >
              <Shuffle size={12} />
              <span>Random</span>
            </button>

            {/* Last Used Button */}
            <button
              onClick={triggerLastUsedPractice}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--bg-control)",
                border: "1px solid var(--separator)",
                fontSize: "12px",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                cursor: "pointer"
              }}
              className="hover-subtle"
            >
              <RotateCcw size={12} />
              <span>Last used</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
