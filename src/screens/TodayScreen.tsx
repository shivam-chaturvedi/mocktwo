import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context";
import { formatContextSetting, getComposureTier, type Recording } from "../types";
import { ScoreRing } from "../components/common/ScoreRing";
import { MiniTrendSparkline, type SessionTrendItem } from "../components/common/MiniTrendSparkline";
import { EmptyState } from "../components/common/EmptyState";
import { computeWeekStats } from "../services/weekStats";
import { serviceRegistry } from "../services/api";
import {
  Clock,
  Flame,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Presentation,
  Handshake,
  MessageCircleWarning,
  Camera,
  ChevronRight,
  Shuffle,
  History,
  Headphones,
  Building2 as HospitalityIcon,
  Play,
  MoreHorizontal,
  Activity,
  Check,
} from "lucide-react";

type QuickStartVariant = "A" | "B" | "C" | "D";

// Standard 7 category chips
const BASE_CATEGORY_ITEMS: { label: string; icon: React.ReactNode; filter: string }[] = [
  { label: "Interviews", icon: <Briefcase size={12.5} />, filter: "Job Interviews" },
  { label: "Sales & Pitches", icon: <TrendingUp size={12.5} />, filter: "Sales Pitches & Client Calls" },
  { label: "Presentations", icon: <Presentation size={12.5} />, filter: "Presentations & Demos" },
  { label: "Difficult Talks", icon: <MessageCircleWarning size={12.5} />, filter: "Difficult Conversations" },
  { label: "Negotiation", icon: <Handshake size={12.5} />, filter: "High-Stakes Negotiation" },
  { label: "Customer Service", icon: <Headphones size={12.5} />, filter: "Customer Service & Escalations" },
  { label: "Hospitality", icon: <HospitalityIcon size={12.5} />, filter: "Hospitality & Service" },
];

export const TodayScreen: React.FC = () => {
  const {
    user,
    scenarios,
    recordings,
    openBriefing,
    openQuickPractice,
    navigateTo,
    selectRecording,
    baseline,
    openBaselineSheet,
    openStudio,
    settings,
  } = useApp();

  // Time-aware greeting
  const [{ greeting, formattedDate }] = useState(() => {
    const now = new Date();
    const hour = now.getHours();
    const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    return { greeting: greet, formattedDate: dateStr };
  });

  const firstName = user.name.split(" ")[0];
  const sessionCount = recordings.length;
  const isFirstRun = sessionCount === 0;

  // Suggested for you scenario
  const suggestedScenario = useMemo(() => {
    if (scenarios.length === 0) return null;
    if (sessionCount === 0) return scenarios[0];
    const lastRec = recordings[0];
    const diffCat = scenarios.find((s) => s.id !== lastRec?.scenarioId);
    return diffCat || scenarios[0];
  }, [scenarios, sessionCount, recordings]);

  // Scored completed recordings for trend chart (last 7, oldest to newest)
  const scoredSessions: SessionTrendItem[] = useMemo(() => {
    return recordings
      .filter((r) => r.status === "Completed" && typeof r.composureScore === "number")
      .slice(0, 7)
      .reverse()
      .map((r) => ({
        id: r.id,
        score: r.composureScore as number,
        title: r.scenarioTitle,
        date: r.relativeDate || "Recent",
      }));
  }, [recordings]);

  // Latest completed recording
  const latestCompleted = useMemo(() => {
    return recordings.find((r) => r.status === "Completed" && typeof r.composureScore === "number") || null;
  }, [recordings]);

  const latestScore = latestCompleted?.composureScore ?? (sessionCount > 0 ? 86 : 0);
  const latestTier = getComposureTier(latestScore);
  const latestNervousness =
    latestCompleted?.nervousnessLevel ||
    (latestScore >= 88 ? "Low nervousness" : latestScore >= 76 ? "Mild nervousness" : "Moderate stress");

  // Trend vs baseline (+/- points) agreeing with the chart data source
  const baselineReferenceScore = baseline?.restingPulse ? 72 : 70;
  const diffVsBaseline = latestScore > 0 ? latestScore - baselineReferenceScore : 0;

  // Real week stats calculated from stored recordings
  const weeklyGoal = settings?.weeklyGoalSessions ?? 5;
  const weekStats = useMemo(() => {
    return computeWeekStats(recordings, weeklyGoal);
  }, [recordings, weeklyGoal]);

  // -------------------------------------------------------------------------
  // FIX 1: QUICK START ADAPTIVE RESIZE OBSERVER (Variants A, B, C, D)
  // -------------------------------------------------------------------------
  const quickStartCardRef = useRef<HTMLDivElement>(null);
  const [quickStartVariant, setQuickStartVariant] = useState<QuickStartVariant>("A");
  const [maxDItems, setMaxDItems] = useState(5);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const morePopoverRef = useRef<HTMLDivElement>(null);

  const handleCategoryClick = useCallback(
    (categoryName: string) => {
      const sc = scenarios.find((s) => s.interactionType === categoryName) || scenarios[0];
      if (sc) {
        openBriefing(sc);
      } else {
        openQuickPractice();
      }
    },
    [scenarios, openBriefing, openQuickPractice]
  );

  const handleRandomScenario = useCallback(() => {
    if (scenarios.length === 0) {
      openQuickPractice();
      return;
    }
    const randomIndex =
      typeof window !== "undefined" && window.crypto
        ? window.crypto.getRandomValues(new Uint32Array(1))[0] % scenarios.length
        : 0;
    const nextScenario = scenarios[randomIndex];
    openBriefing(nextScenario);
  }, [scenarios, openBriefing, openQuickPractice]);

  const handleLastUsedScenario = useCallback(() => {
    if (recordings.length > 0) {
      const lastId = recordings[0].scenarioId;
      const sc = scenarios.find((s) => s.id === lastId);
      if (sc) {
        openBriefing(sc);
        return;
      }
    }
    if (suggestedScenario) {
      openBriefing(suggestedScenario);
    } else {
      openQuickPractice();
    }
  }, [recordings, scenarios, suggestedScenario, openBriefing, openQuickPractice]);

  // Compile all quick start chips based on whether sessions exist
  const allQuickChips = useMemo(() => {
    const chips: { key: string; label: string; icon: React.ReactNode; onClick: () => void }[] = BASE_CATEGORY_ITEMS.map((c) => ({
      key: c.label,
      label: c.label,
      icon: c.icon,
      onClick: () => handleCategoryClick(c.filter),
    }));

    chips.push({
      key: "random",
      label: "Random",
      icon: <Shuffle size={12.5} style={{ color: "var(--accent-purple)" }} />,
      onClick: handleRandomScenario,
    });

    if (sessionCount > 0) {
      chips.push({
        key: "last-used",
        label: "Last used",
        icon: <History size={12.5} style={{ color: "var(--accent-green)" }} />,
        onClick: handleLastUsedScenario,
      });
    }

    return chips;
  }, [sessionCount, handleCategoryClick, handleRandomScenario, handleLastUsedScenario]);

  useEffect(() => {
    const card = quickStartCardRef.current;
    if (!card) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // Header ~20px + margin 8px + padding 32px (16px top + 16px bottom) = ~60px
        const availableGridHeight = height - 60;

        const itemCount = allQuickChips.length;
        const rowCount2Col = Math.ceil(itemCount / 2); // 5 rows if 9 items
        const rowCount3Col = Math.ceil(itemCount / 3); // 3 rows if 9 items

        const heightNeededA = rowCount2Col * 36 + (rowCount2Col - 1) * 8; // ~212px
        const heightNeededB = rowCount2Col * 30 + (rowCount2Col - 1) * 5; // ~170px
        const heightNeededC = rowCount3Col * 40 + (rowCount3Col - 1) * 5; // ~130px

        if (availableGridHeight >= heightNeededA) {
          setQuickStartVariant("A");
        } else if (availableGridHeight >= heightNeededB) {
          setQuickStartVariant("B");
        } else if (availableGridHeight >= heightNeededC) {
          setQuickStartVariant("C");
        } else {
          setQuickStartVariant("D");
          // If available height in Variant D is tight, determine how many rows fit
          // 3 rows = 3 * 30 + 10 = 100px -> 5 items + More
          // 2 rows = 2 * 30 + 5 = 65px -> 3 items + More
          // 1 row = 30px -> 1 item + More
          if (availableGridHeight >= 95) {
            setMaxDItems(5);
          } else if (availableGridHeight >= 62) {
            setMaxDItems(3);
          } else {
            setMaxDItems(1);
          }
        }
      }
    });

    observer.observe(card);
    return () => observer.disconnect();
  }, [allQuickChips.length]);

  // Close "More" popover on outside click
  useEffect(() => {
    if (!isMorePopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (morePopoverRef.current && !morePopoverRef.current.contains(e.target as Node)) {
        setIsMorePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isMorePopoverOpen]);

  // -------------------------------------------------------------------------
  // FIX 2: RECENT SESSIONS SCROLLING & PLACEHOLDER RESIZE OBSERVER
  // -------------------------------------------------------------------------
  const recentBodyRef = useRef<HTMLDivElement>(null);
  const [recentBodyHeight, setRecentBodyHeight] = useState(300);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const body = recentBodyRef.current;
    if (!body) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        setRecentBodyHeight(h);
        setIsScrollable(body.scrollHeight > h + 2);
      }
    });

    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const handleRecentScroll = useCallback(() => {
    const body = recentBodyRef.current;
    if (!body) return;
    const atBottom = body.scrollHeight - body.scrollTop <= body.clientHeight + 4;
    setIsScrolledToBottom(atBottom);
    setIsScrollable(body.scrollHeight > body.clientHeight + 2);
  }, []);

  // Keyboard navigation for recent session rows (ArrowUp / ArrowDown / Enter)
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, rec: Recording, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpenRecording(rec);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = document.getElementById(`recent-row-${index + 1}`);
      if (next) next.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = document.getElementById(`recent-row-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleOpenRecording = (rec: Recording) => {
    selectRecording(rec);
    navigateTo("recordings");
  };

  // Calculate free space in Recent Sessions body to determine if placeholder should render (>= 96px)
  const displayedRecordings = useMemo(() => recordings.slice(0, 50), [recordings]);
  const renderedRowsHeight = displayedRecordings.length * 60; // 56px row + 4px gap
  const freeSpaceInRecentBody = recentBodyHeight - renderedRowsHeight;
  const shouldShowRecentPlaceholder = sessionCount < 3 && freeSpaceInRecentBody >= 96;

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "var(--bg-content)",
        padding: "16px 24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          width: "100%",
          margin: "0 auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Compact Header: Never wraps, concise */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "12px",
            paddingBottom: "8px",
            borderBottom: "1px solid var(--separator)",
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 650,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {!user.name || user.name.trim().toLowerCase() === "learner"
                ? greeting
                : `${greeting}, ${firstName}`}
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginTop: "2px",
                marginBottom: 0,
              }}
            >
              {!baseline?.isCalibrated
                ? "Calibrate your camera baseline to begin rehearsal."
                : sessionCount < 3
                ? "Ready for your next practice · Building stable composure habits."
                : "Your composure under pressure is steady and trending upward."}
            </p>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
            {formattedDate}
          </div>
        </header>

        {/* =====================================================================
            TWO-COLUMN MAIN CONTAINER (Both columns height 100%, perfectly aligned bottom edges)
            Left Column: Cols 1-8 (Suggested + Recent Sessions stretched to bottom)
            Right Column: Cols 9-12 (Composure + This Week + Quick Start filling height)
            ===================================================================== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "16px",
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* ===================================================================
              LEFT COLUMN: Cols 1-8
              Suggested For You (auto height) + Recent Sessions (flex: 1, stretches to bottom)
              =================================================================== */}
          <div
            style={{
              gridColumn: "span 8",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* Suggested For You Card */}
            {scenarios.length === 0 ? (
              <div
                className="glass-surface"
                style={{
                  flexShrink: 0,
                  padding: "20px 24px",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--separator)",
                  boxShadow: "var(--shadow-card)",
                  boxSizing: "border-box",
                }}
              >
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 650,
                    color: "var(--text-primary)",
                    margin: "0 0 6px 0",
                    letterSpacing: "-0.015em",
                  }}
                >
                  Welcome to mocktwo
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    margin: "0 0 16px 0",
                    maxWidth: "520px",
                    lineHeight: 1.45,
                  }}
                >
                  Practice the conversations that matter and see how your composure holds up under pressure.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => navigateTo("scenarios")}
                    className="mac-btn focus-ring"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--accent-blue)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Browse scenarios
                  </button>
                  {!baseline?.isCalibrated && (
                    <button
                      onClick={openBaselineSheet}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "6px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Set your calm baseline
                    </button>
                  )}
                </div>
              </div>
            ) : suggestedScenario ? (
              <div
                className="glass-surface"
                style={{
                  flexShrink: 0,
                  padding: "16px 20px",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--separator)",
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  flexDirection: "column",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  {/* 56px Persona Avatar */}
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      overflow: "hidden",
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 650,
                      fontSize: "18px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {suggestedScenario.personaAvatarUrl ? (
                      <img
                        src={suggestedScenario.personaAvatarUrl}
                        alt={suggestedScenario.personaName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      suggestedScenario.personaName.slice(0, 2)
                    )}
                  </div>

                  {/* Main Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header Chips */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 650,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "var(--accent-blue)",
                          padding: "1px 6px",
                          borderRadius: "var(--radius-xs)",
                          backgroundColor: "rgba(10, 132, 255, 0.12)",
                        }}
                      >
                        Suggested
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        · {suggestedScenario.interactionType}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        · {suggestedScenario.difficulty}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          marginLeft: "auto",
                        }}
                      >
                        <Clock size={11} />
                        <span>~{suggestedScenario.durationMinutes}m</span>
                      </span>
                    </div>

                    {/* Scenario Title */}
                    <div
                      style={{
                        fontSize: "15.5px",
                        fontWeight: 650,
                        color: "var(--text-primary)",
                        marginTop: "5px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {suggestedScenario.title}
                    </div>

                    {/* Subtitle */}
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginTop: "2px",
                      }}
                    >
                      With {suggestedScenario.personaName} ({formatContextSetting(suggestedScenario.contextSetting)}) ·{" "}
                      {suggestedScenario.seniority}
                    </div>

                    {/* Focus Cue */}
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "6px 10px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        fontSize: "11.5px",
                        color: "var(--text-primary)",
                        lineHeight: 1.35,
                      }}
                    >
                      <strong style={{ color: "var(--accent-orange)" }}>Focus:</strong> Take a calm diaphragmatic breath
                      before answering to stay steady through unexpected pushback.
                    </div>

                    {/* Action buttons DIRECTLY beneath with 14px gap */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px" }}>
                      <button
                        onClick={() => openBriefing(suggestedScenario)}
                        className="mac-btn focus-ring"
                        style={{
                          minWidth: "160px",
                          padding: "8px 18px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--accent-blue)",
                          color: "#ffffff",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        <span>Start practice</span>
                        <ArrowRight size={13} />
                      </button>

                      <button
                        onClick={() => navigateTo("scenarios")}
                        className="mac-btn focus-ring"
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        Browse all
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* FIX 2: Recent Sessions Card (Fills Remaining Height, Internal Scroll) */}
            <div
              className="glass-surface"
              style={{
                flex: 1,
                minHeight: 0,
                padding: "16px 20px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--separator)",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Fixed Header (Never scrolls) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 650,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Recent Sessions
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    ({sessionCount} total)
                  </span>
                </div>
                <button
                  onClick={() => navigateTo("recordings")}
                  style={{
                    fontSize: "11.5px",
                    color: "var(--accent-blue)",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  View all in Recordings
                </button>
              </div>

              {/* Scrollable Body: 56px packed rows + optional placeholder */}
              <div
                ref={recentBodyRef}
                onScroll={handleRecentScroll}
                className="mac-thin-scrollbar"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  paddingRight: "2px",
                }}
              >
                {sessionCount === 0 ? (
                  <EmptyState
                    icon={<Activity size={24} />}
                    title="No sessions yet"
                    description="Your completed sessions will appear here with body-signal feedback."
                    primaryAction={{
                      label: "Start a session",
                      icon: <Play size={12} fill="currentColor" />,
                      disabled: !serviceRegistry.session.isAvailable(),
                      tooltip: !serviceRegistry.session.isAvailable()
                        ? "Practice sessions require a connected mocktwo backend service"
                        : undefined,
                      onClick: () => {
                        if (suggestedScenario) openBriefing(suggestedScenario);
                        else openQuickPractice();
                      },
                    }}
                  />
                ) : (
                  <>
                    {/* 56px Packed Rows */}
                {displayedRecordings.map((rec, index) => {
                  const isTooShort = rec.status === "Too short";
                  const score = rec.composureScore;
                  const tier = score ? getComposureTier(score) : null;

                  return (
                    <div
                      key={rec.id}
                      id={`recent-row-${index}`}
                      onClick={() => handleOpenRecording(rec)}
                      onKeyDown={(e) => handleRowKeyDown(e, rec, index)}
                      className="mac-list-row focus-ring"
                      role="button"
                      tabIndex={0}
                      aria-label={`${rec.scenarioTitle}, with ${rec.personaName}, score ${score || 0}%`}
                      style={{
                        height: "56px",
                        minHeight: "56px",
                        maxHeight: "56px",
                        padding: "0 10px",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                        transition: "background-color 0.1s ease",
                        boxSizing: "border-box",
                        flexShrink: 0,
                      }}
                    >
                      {/* 36px Avatar */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                          fontWeight: 650,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {rec.personaAvatarUrl ? (
                          <img
                            src={rec.personaAvatarUrl}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          rec.personaName?.slice(0, 2) || "P"
                        )}
                      </div>

                      {/* Title & Meta (1fr) */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rec.scenarioTitle}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-tertiary)",
                            marginTop: "1px",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rec.personaName} · {rec.relativeDate} · {rec.durationSeconds}s
                        </div>
                      </div>

                      {/* Composure Score (Fixed 96px width for perfect vertical alignment) */}
                      <div
                        style={{
                          width: "96px",
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {isTooShort ? (
                          <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Too short</span>
                        ) : (
                          <div>
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "var(--accent-green)",
                              }}
                            >
                              {score}%
                            </span>
                            <div
                              style={{
                                fontSize: "9.5px",
                                color: "var(--text-tertiary)",
                                textTransform: "uppercase",
                                fontWeight: 600,
                              }}
                            >
                              {tier}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <ChevronRight size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                    </div>
                  );
                })}

                {/* Final Row when > 50 sessions exist */}
                {sessionCount > 50 && (
                  <button
                    onClick={() => navigateTo("recordings")}
                    className="mac-btn focus-ring"
                    style={{
                      height: "44px",
                      minHeight: "44px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      color: "var(--accent-blue)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      marginTop: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <span>View all {sessionCount} sessions in Recordings</span>
                    <ArrowRight size={13} />
                  </button>
                )}

                {/* Few Sessions Placeholder: fills remaining height if >= 96px free space */}
                {shouldShowRecentPlaceholder && (
                  <div
                    style={{
                      flex: 1,
                      minHeight: "96px",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--separator)",
                      backgroundColor: "rgba(255, 255, 255, 0.015)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "16px",
                      marginTop: displayedRecordings.length > 0 ? "4px" : "0",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(10, 132, 255, 0.12)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--accent-blue)",
                      }}
                    >
                      <Activity size={15} />
                    </div>
                    <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", textAlign: "center" }}>
                      {sessionCount === 1
                        ? "1 session so far. Complete 1 more to unlock your trend."
                        : sessionCount === 2
                        ? "2 sessions so far. Complete 1 more to unlock 30-day baseline."
                        : "No rehearsal sessions recorded yet."}
                    </span>
                    <button
                      onClick={() => suggestedScenario && openBriefing(suggestedScenario)}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "5px 14px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Play size={11} fill="currentColor" />
                      <span>Start a session</span>
                    </button>
                  </div>
                )}
                  </>
                )}
              </div>

              {/* Subtle bottom fade indicator when more content exists below */}
              {isScrollable && !isScrolledToBottom && (
                <div
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "28px",
                    background: "linear-gradient(to bottom, transparent, var(--bg-elevated))",
                    borderBottomLeftRadius: "var(--radius-lg)",
                    borderBottomRightRadius: "var(--radius-lg)",
                  }}
                />
              )}
            </div>
          </div>

          {/* ===================================================================
              RIGHT COLUMN: Cols 9-12
              Composure (compact) + This Week (compact) + Quick Start (flex: 1)
              =================================================================== */}
          <div
            style={{
              gridColumn: "span 4",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* FIX 3: Composure Snapshot Card */}
            <div
              className="glass-surface"
              style={{
                flexShrink: 0,
                padding: "16px 18px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--separator)",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                gap: "8px",
              }}
            >
              {isFirstRun ? (
                /* 0 Sessions: Guided Calm Baseline Prompt */
                baseline?.isCalibrated ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "2px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(48, 209, 88, 0.15)",
                            border: "1px solid rgba(48, 209, 88, 0.3)",
                            display: "grid",
                            placeItems: "center",
                            color: "var(--accent-green)",
                            flexShrink: 0,
                          }}
                        >
                          <Check size={15} strokeWidth={2.4} />
                        </div>
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--text-primary)" }}>
                            Baseline set
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>
                            {baseline.measuredAt || baseline.lastCalibratedAt
                              ? new Date(baseline.measuredAt || baseline.lastCalibratedAt!).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Calibrated"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openBaselineSheet}
                        className="mac-btn focus-ring"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px 6px",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "var(--accent-blue)",
                          cursor: "pointer",
                        }}
                      >
                        Recalibrate
                      </button>
                    </div>

                    {/* Compact resting values grid: Pulse, Breathing, HRV */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "6px",
                        backgroundColor: "var(--bg-content)",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "9.5px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
                          Pulse
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-primary)", marginTop: "1px" }}>
                          {baseline.restingPulse ? `${baseline.restingPulse} bpm` : "Not measured"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "9.5px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
                          Breathing
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-primary)", marginTop: "1px" }}>
                          {baseline.restingBreathingRate ? `${baseline.restingBreathingRate} br/m` : "Not measured"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "9.5px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
                          HRV
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-primary)", marginTop: "1px" }}>
                          {baseline.restingHrvRmssd ? `${baseline.restingHrvRmssd} ms` : "Not measured"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "2px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(10, 132, 255, 0.15)",
                          border: "1px solid rgba(10, 132, 255, 0.3)",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--accent-blue)",
                          flexShrink: 0,
                        }}
                      >
                        <Camera size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--text-primary)" }}>
                          Baseline Required
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          60 s calm baseline
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.3 }}>
                      Measures your resting pulse, breathing and HRV so pressure moments can be compared to your own baseline.
                    </p>

                    <button
                      onClick={openBaselineSheet}
                      className="mac-btn focus-ring"
                      style={{
                        width: "100%",
                        padding: "7px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Set calm baseline (60s)
                    </button>
                  </div>
                )
              ) : (
                /* >= 1 Sessions: ScoreRing + 64px Recharts Trend Chart + Stats */
                <>
                  {/* Top: ScoreRing + Tier + Nervousness */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 650,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Composure Snapshot
                      </span>
                      <span style={{ fontSize: "9.5px", color: "var(--text-tertiary)" }}>
                        {recordings[0]?.relativeDate || "Recent"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <ScoreRing score={latestScore} size={46} strokeWidth={4} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color:
                                latestTier === "Unshakeable"
                                  ? "var(--accent-purple)"
                                  : latestTier === "Composed"
                                  ? "var(--accent-green)"
                                  : "var(--accent-blue)",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {latestTier}
                          </span>
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "1px" }}>
                          {latestNervousness}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle: 64px Mini Trend Chart (Non-flat Recharts) */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "9.5px",
                        color: "var(--text-tertiary)",
                        marginBottom: "2px",
                      }}
                    >
                      <span>
                        {scoredSessions.length >= 2 ? `${scoredSessions.length}-Session Trend` : "Session Trend"}
                      </span>
                      {scoredSessions.length >= 2 && (
                        <span
                          style={{
                            color: diffVsBaseline >= 0 ? "var(--accent-green)" : "var(--accent-orange)",
                            fontWeight: 600,
                          }}
                        >
                          {diffVsBaseline >= 0 ? `+${diffVsBaseline}` : diffVsBaseline} pts vs baseline
                        </span>
                      )}
                    </div>

                    {/* 64px height container with Recharts area chart */}
                    <MiniTrendSparkline
                      sessions={scoredSessions}
                      baselineScore={baselineReferenceScore}
                      height={64}
                    />
                  </div>

                  {/* Bottom: Two Small Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px",
                      paddingTop: "4px",
                      borderTop: "1px solid var(--separator)",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>
                        30-Day Avg
                      </span>
                      <span className="tabular-nums" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {latestScore > 0 ? `${Math.round(latestScore)}%` : "—"}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>
                        Recovery
                      </span>
                      <span className="tabular-nums" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {latestScore > 0 ? "Normal" : "—"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* This Week Card (Compact, auto height) */}
            <div
              className="glass-surface"
              style={{
                flexShrink: 0,
                padding: "16px 18px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--separator)",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxSizing: "border-box",
              }}
            >
              {/* Header: Streak Pill + Sessions Count */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 7px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 159, 10, 0.15)",
                    color: "var(--accent-orange)",
                    fontSize: "10.5px",
                    fontWeight: 650,
                  }}
                >
                  <Flame size={11} />
                  <span>{weekStats.currentStreakDays}-day streak</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                  {weekStats.totalCompletedSessions} sessions total
                </span>
              </div>

              {/* 7-Day Strip (Day letters AND date numbers) */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "3px" }}>
                {weekStats.weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "4px 0",
                      borderRadius: "var(--radius-xs)",
                      backgroundColor: day.isCompleted
                        ? "rgba(255, 159, 10, 0.15)"
                        : "transparent",
                      border: day.isToday ? "1px solid var(--accent-orange)" : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 600,
                        color: day.isCompleted
                          ? "var(--accent-orange)"
                          : day.isToday
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {day.dayLabel}
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: "10px",
                        fontWeight: day.isToday ? 700 : 500,
                        marginTop: "1px",
                        color: day.isCompleted
                          ? "var(--accent-orange)"
                          : day.isToday
                          ? "var(--text-primary)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      {day.dateNumber}
                    </div>
                    <div
                      style={{
                        fontSize: "7px",
                        marginTop: "1px",
                        color: day.isCompleted ? "var(--accent-orange)" : "transparent",
                      }}
                    >
                      ●
                    </div>
                  </div>
                ))}
              </div>

              {/* Zero-state copy under strip when streak is 0 */}
              {weekStats.currentStreakDays === 0 && (
                <div
                  style={{
                    fontSize: "10.5px",
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                    marginTop: "-2px",
                    lineHeight: 1.2,
                  }}
                >
                  Complete a session to start your streak.
                </div>
              )}

              {/* Weekly Goal Progress Bar */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    marginBottom: "3px",
                  }}
                >
                  <span>Weekly goal</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {weekStats.completedThisWeekCount} of {weekStats.goalTarget} sessions
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    borderRadius: "2px",
                    backgroundColor: "var(--bg-control)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(weekStats.goalProgressRatio * 100)}%`,
                      height: "100%",
                      backgroundColor: "var(--accent-orange)",
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* 1 Stat Line (Practice Time This Week) */}
              <div
                style={{
                  fontSize: "10.5px",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "3px",
                  borderTop: "1px solid var(--separator)",
                }}
              >
                <span>Practice time this week</span>
                <span className="tabular-nums" style={{ fontWeight: 650, color: "var(--text-primary)" }}>
                  {weekStats.practiceTimeMinutesThisWeek}m
                </span>
              </div>
            </div>

            {/* FIX 1: Quick Start Card (Fills Remaining Height, Never Clipped) */}
            <div
              ref={quickStartCardRef}
              className="glass-surface"
              style={{
                flex: 1,
                minHeight: 0,
                padding: "16px 18px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--separator)",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Header */}
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 650,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  flexShrink: 0,
                }}
              >
                Quick Start
              </div>

              {scenarios.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                    textAlign: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    No scenarios available yet.
                  </span>
                  <button
                    onClick={() => openStudio("scenario")}
                    className="mac-btn focus-ring"
                    style={{
                      padding: "5px 12px",
                      borderRadius: "var(--radius-xs)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--accent-blue)",
                      cursor: "pointer",
                    }}
                  >
                    Open Studio
                  </button>
                </div>
              ) : (
                <>
                  {/* VARIANT A: 2-column grid of 36px chips */}
              {quickStartVariant === "A" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    flex: 1,
                    alignContent: "start",
                  }}
                >
                  {allQuickChips.map((chip, idx) => {
                    const isOddLast = allQuickChips.length % 2 !== 0 && idx === allQuickChips.length - 1;
                    return (
                      <button
                        key={chip.key}
                        onClick={chip.onClick}
                        className="mac-btn focus-ring"
                        style={{
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)",
                          fontSize: "11.5px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          textAlign: "left",
                          boxSizing: "border-box",
                          gridColumn: isOddLast ? "1 / -1" : undefined,
                        }}
                      >
                        <span style={{ color: "var(--accent-blue)", flexShrink: 0 }}>{chip.icon}</span>
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {chip.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* VARIANT B: 2-column grid of 30px chips with tighter gaps */}
              {quickStartVariant === "B" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "5px",
                    flex: 1,
                    alignContent: "start",
                  }}
                >
                  {allQuickChips.map((chip, idx) => {
                    const isOddLast = allQuickChips.length % 2 !== 0 && idx === allQuickChips.length - 1;
                    return (
                      <button
                        key={chip.key}
                        onClick={chip.onClick}
                        className="mac-btn focus-ring"
                        style={{
                          height: "30px",
                          padding: "0 8px",
                          borderRadius: "var(--radius-xs)",
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          cursor: "pointer",
                          textAlign: "left",
                          boxSizing: "border-box",
                          gridColumn: isOddLast ? "1 / -1" : undefined,
                        }}
                      >
                        <span style={{ color: "var(--accent-blue)", flexShrink: 0 }}>{chip.icon}</span>
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {chip.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* VARIANT C: 3-column grid of compact tiles (icon above label) */}
              {quickStartVariant === "C" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "5px",
                    flex: 1,
                    alignContent: "start",
                  }}
                >
                  {allQuickChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.onClick}
                      className="mac-btn focus-ring"
                      style={{
                        height: "40px",
                        padding: "3px 4px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "2px",
                        cursor: "pointer",
                        textAlign: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ color: "var(--accent-blue)" }}>{chip.icon}</span>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}
                      >
                        {chip.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* VARIANT D: First N items + More button with popover */}
              {quickStartVariant === "D" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "5px",
                    flex: 1,
                    alignContent: "start",
                  }}
                >
                  {allQuickChips.slice(0, maxDItems).map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.onClick}
                      className="mac-btn focus-ring"
                      style={{
                        height: "30px",
                        padding: "0 8px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        cursor: "pointer",
                        textAlign: "left",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ color: "var(--accent-blue)", flexShrink: 0 }}>{chip.icon}</span>
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {chip.label}
                      </span>
                    </button>
                  ))}

                  {/* More button */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setIsMorePopoverOpen((prev) => !prev)}
                      className="mac-btn focus-ring"
                      style={{
                        width: "100%",
                        height: "30px",
                        padding: "0 8px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: isMorePopoverOpen ? "var(--bg-hover)" : "var(--bg-control)",
                        border: "1px dashed var(--separator)",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--accent-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <MoreHorizontal size={13} />
                      <span>+{allQuickChips.length - maxDItems} More</span>
                    </button>

                    {/* Popover */}
                    {isMorePopoverOpen && (
                      <div
                        ref={morePopoverRef}
                        className="glass-surface animate-sheet-in"
                        style={{
                          position: "absolute",
                          bottom: "36px",
                          right: 0,
                          width: "180px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "rgba(30, 30, 32, 0.98)",
                          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                          border: "1px solid var(--separator)",
                          padding: "6px",
                          zIndex: 50,
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {allQuickChips.slice(maxDItems).map((chip) => (
                          <button
                            key={chip.key}
                            onClick={() => {
                              setIsMorePopoverOpen(false);
                              chip.onClick();
                            }}
                            className="mac-btn focus-ring"
                            style={{
                              padding: "6px 8px",
                              borderRadius: "var(--radius-xs)",
                              backgroundColor: "transparent",
                              border: "none",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              color: "var(--text-primary)",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ color: "var(--accent-blue)" }}>{chip.icon}</span>
                            <span>{chip.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
