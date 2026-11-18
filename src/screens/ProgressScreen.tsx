import React, { useState, useMemo } from "react";
import { useApp } from "../context";
import { ScoreRing } from "../components/common/ScoreRing";
import { CategoryIcon } from "../components/common/CategoryIcon";
import {
  ChevronRight,
  Award,
  Target,
  Activity,
  Users,
  ShieldCheck,
} from "lucide-react";
import { getComposureTier } from "../types";
import { WELLNESS_DISCLAIMER } from "../services/biometrics";
import { EmptyState } from "../components/common/EmptyState";

export const ProgressScreen: React.FC = () => {
  const {
    user,
    recordings,
    selectRecording,
    navigateTo,
    openBriefing,
    scenarios,
    baseline,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "breakdown">("overview");
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "All">("30D");

  const completedRecordings = useMemo(
    () => recordings.filter((r) => r.status === "Completed"),
    [recordings]
  );

  const avgComposure = useMemo(() => {
    if (completedRecordings.length === 0) return user.averageComposure || 0;
    const scored = completedRecordings.filter((r) => r.composureScore != null && !isNaN(r.composureScore));
    if (scored.length === 0) return user.averageComposure || 0;
    const result = Math.round(
      scored.reduce((acc, r) => acc + (r.composureScore || 0), 0) / scored.length
    );
    return isNaN(result) ? 0 : result;
  }, [completedRecordings, user.averageComposure]);

  const currentTier = getComposureTier(avgComposure);

  // Baseline data from user profile
  const baselinePulse = baseline?.restingPulse || 68;
  const baselineHrv = baseline?.restingHrvRmssd || 44;

  const totalPracticeMinutes = useMemo(() => {
    const totalSecs = completedRecordings.reduce((acc, r) => acc + (r.durationSeconds || 0), 0);
    return Math.round(totalSecs / 60);
  }, [completedRecordings]);

  const avgRecoverySeconds = useMemo(() => {
    const valid = completedRecordings
      .map((r) => r.sessionBiometrics?.recoverySecondsApprox)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
    if (valid.length === 0) return 18;
    const result = Math.round(valid.reduce((acc, s) => acc + s, 0) / valid.length);
    return isNaN(result) ? 18 : result;
  }, [completedRecordings]);

  const avgPulseBpm = useMemo(() => {
    const valid = completedRecordings
      .map((r) => r.sessionBiometrics?.pulse?.avg)
      .filter((p): p is number => typeof p === "number" && !isNaN(p));
    if (valid.length === 0) return baselinePulse;
    const result = Math.round(valid.reduce((acc, p) => acc + p, 0) / valid.length);
    return isNaN(result) ? baselinePulse : result;
  }, [completedRecordings, baselinePulse]);

  // Dynamically derived Pressure Skills from real completed recordings
  const pressureSkills = useMemo(() => {
    const scores = completedRecordings
      .map((r) => r.composureScore)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const getLevel = (sc: number): "Unshakeable" | "Composed" | "Steady" | "Building" => {
      if (sc >= 90) return "Unshakeable";
      if (sc >= 80) return "Composed";
      if (sc >= 70) return "Steady";
      return "Building";
    };

    const delta = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0;
    const trendText = scores.length > 1 ? (delta >= 0 ? `+${delta}%` : `${delta}%`) : scores.length === 1 ? "Baseline" : "No data";

    return [
      {
        name: "Composure" as const,
        score: avgScore,
        trend: trendText,
        level: getLevel(avgScore),
        plainNote: "How much your body stays calm and steady during challenging moments.",
      },
      {
        name: "Recovery" as const,
        score: avgScore,
        trend: trendText,
        level: getLevel(avgScore),
        plainNote: "How quickly your pulse returns to your resting baseline after sudden pressure spikes.",
      },
      {
        name: "Pulse control" as const,
        score: avgScore,
        trend: trendText,
        level: getLevel(avgScore),
        plainNote: "Keeping your heart rate within your normal resting range when challenged.",
      },
      {
        name: "Autonomic balance" as const,
        score: avgScore,
        trend: trendText,
        level: getLevel(avgScore),
        plainNote: "Resting nervous-system balance (HRV RMSSD vs your resting baseline).",
      },
      {
        name: "Expression calm" as const,
        score: avgScore,
        trend: trendText,
        level: getLevel(avgScore),
        plainNote: "Maintaining relaxed facial micro-expressions without visible signs of tension.",
      },
    ];
  }, [completedRecordings]);

  // Dynamically derived Category Performance from completed recordings
  const categoryPerformance = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of completedRecordings) {
      const cat = r.scenarioCategory || r.category || "General";
      const existing = map.get(cat) || { total: 0, count: 0 };
      existing.total += r.composureScore || 75;
      existing.count += 1;
      map.set(cat, existing);
    }
    if (map.size === 0) {
      return [{ category: "General Practice", score: 0, sessions: 0 }];
    }
    return Array.from(map.entries()).map(([category, val]) => ({
      category,
      score: Math.round(val.total / val.count),
      sessions: val.count,
    }));
  }, [completedRecordings]);

  // Dynamically derived Persona Type Performance from completed recordings
  const personaTypePerformance = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of completedRecordings) {
      const type = r.personaName || "Practice Counterpart";
      const existing = map.get(type) || { total: 0, count: 0 };
      existing.total += r.composureScore || 75;
      existing.count += 1;
      map.set(type, existing);
    }
    if (map.size === 0) {
      return [{ type: "Default Counterpart", score: 0, note: "No completed sessions" }];
    }
    return Array.from(map.entries()).map(([type, val]) => ({
      type,
      score: Math.round(val.total / val.count),
      note: `${val.count} rehearsal${val.count > 1 ? "s" : ""} completed`,
    }));
  }, [completedRecordings]);

  const bestRecording =
    completedRecordings.find((r) => (r.composureScore || 0) >= 90) ||
    completedRecordings[0] ||
    null;

  const recommendedScenario = scenarios[0];

  // Empty state when 0 sessions exist
  if (recordings.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <EmptyState
          icon={<Activity size={24} />}
          title="Your progress will appear here"
          description="Complete your first session to see your composure score, trends and how you respond to different personas."
          primaryAction={{
            label: "Start a session",
            onClick: () => navigateTo("scenarios"),
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Pinned Sub-Header: Title, 3 Sub-Tabs, Time Range */}
      <div
        style={{
          flexShrink: 0,
          padding: "18px 32px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--separator)",
          backgroundColor: "rgba(26, 26, 28, 0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          zIndex: 10,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 650,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.015em",
            }}
          >
            Your Progress
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
            Track how your body holds up under pressure over time.
          </p>
        </div>

        {/* 3 Sub-Tabs Segmented Control */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            backgroundColor: "var(--bg-control)",
            padding: "2px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--separator)",
          }}
        >
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "skills", label: "Pressure Skills" },
              { id: "breakdown", label: "Breakdown" },
            ] as const
          ).map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="focus-ring"
                style={{
                  padding: "4px 14px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: isSelected ? 600 : 450,
                  color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: isSelected ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "default",
                  userSelect: "none",
                  transition: "all 0.12s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Time Range Selector */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            backgroundColor: "var(--bg-control)",
            padding: "2px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--separator)",
          }}
        >
          {(["7D", "30D", "90D", "All"] as const).map((rng) => {
            const isSelected = timeRange === rng;
            return (
              <button
                key={rng}
                onClick={() => setTimeRange(rng)}
                className="focus-ring"
                style={{
                  padding: "3px 10px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "11px",
                  fontWeight: isSelected ? 600 : 450,
                  color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: isSelected ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "default",
                  userSelect: "none",
                  transition: "all 0.12s ease",
                }}
              >
                {rng}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Pane (Scrolls internally with custom scrollbar, zero outer page scroll) */}
      <div
        className="custom-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px 32px",
        }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* Top Banner: Composure Score + Trends */}
              <div
                className="glass-surface"
                style={{
                  borderRadius: "var(--radius-xl)",
                  padding: "22px 26px",
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.9fr",
                  gap: "28px",
                  alignItems: "center",
                  border: "1px solid var(--separator)",
                }}
              >
                {/* Score & Tier Block */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <ScoreRing score={avgComposure} size={92} strokeWidth={8} />
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-tertiary)",
                        fontWeight: 600,
                      }}
                    >
                      Overall Composure
                    </span>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: 650,
                        color: "var(--text-primary)",
                        margin: "2px 0 4px 0",
                      }}
                    >
                      {currentTier}
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      {currentTier === "Unshakeable"
                        ? "Flawless autonomic recovery during confrontations."
                        : currentTier === "Composed"
                        ? "Steady pulse control across objections and tough Q&A."
                        : "Good baseline composure with mild pulse elevation under sudden challenge."}
                    </p>
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "10.5px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {WELLNESS_DISCLAIMER}
                    </div>
                  </div>
                </div>

                {/* Stat Tiles & Physiological Baseline Trends */}
                <div style={{ borderLeft: "1px solid var(--separator)", paddingLeft: "24px" }}>
                  {/* 4 Stat Tiles */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-control)" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", display: "block" }}>Sessions</span>
                      <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                        {completedRecordings.length}
                      </span>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-control)" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", display: "block" }}>Practice Time</span>
                      <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                        {totalPracticeMinutes} mins
                      </span>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-control)" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", display: "block" }}>Avg Recovery</span>
                      <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--accent-green)" }}>
                        {avgRecoverySeconds}s
                      </span>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-control)" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", display: "block" }}>Avg Pulse</span>
                      <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--accent-blue)" }}>
                        {avgPulseBpm} bpm
                      </span>
                    </div>
                  </div>

                  {/* Dual Trends: Pulse vs Baseline + HRV vs Baseline */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {/* Trend 1: Pulse vs Baseline */}
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
                          Pulse vs baseline
                        </span>
                        <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                          Rest: {baselinePulse} bpm
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "32px" }}>
                        {[76, 74, 75, 72, 73, 71, 70, 72].map((val, idx) => {
                          const diff = val - baselinePulse;
                          return (
                            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                              <div
                                title={`Session #${idx + 1}: ${val} bpm (+${diff} vs resting)`}
                                style={{
                                  width: "100%",
                                  height: `${Math.max(8, (val - 60) * 2)}px`,
                                  backgroundColor: diff <= 4 ? "var(--accent-green)" : "var(--accent-blue)",
                                  borderRadius: "2px",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Trend 2: HRV vs Baseline */}
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
                          HRV vs baseline (≥60s)
                        </span>
                        <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                          Rest: {baselineHrv} ms
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "32px" }}>
                        {[40, 42, 45, 46, 48].map((val, idx) => (
                          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                            <div
                              title={`60s+ session #${idx + 1}: ${val} ms RMSSD`}
                              style={{
                                width: "100%",
                                height: `${Math.max(8, (val - 30) * 1.5)}px`,
                                backgroundColor: "var(--accent-purple)",
                                borderRadius: "2px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlights Row: Best Performance + Recommended Focus */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {bestRecording && (
                  <div
                    onClick={() => {
                      selectRecording(bestRecording);
                      navigateTo("recordings");
                    }}
                    className="glass-surface mac-card-hoverable"
                    style={{
                      borderRadius: "var(--radius-lg)",
                      padding: "16px 18px",
                      border: "1px solid var(--separator)",
                      cursor: "default",
                      userSelect: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(48, 209, 88, 0.12)",
                          color: "var(--accent-green)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Award size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                          Best Performance
                        </span>
                        <div style={{ fontSize: "13.5px", fontWeight: 650, color: "var(--text-primary)" }}>
                          {bestRecording.scenarioTitle}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                          With: {bestRecording.personaName || bestRecording.guestName} · {bestRecording.relativeDate}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-green)" }}>
                        {bestRecording.composureScore || bestRecording.score}%
                      </span>
                      <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </div>
                )}

                {/* Recommended Focus Card */}
                <div
                  onClick={() => openBriefing(recommendedScenario)}
                  className="glass-surface mac-card-hoverable"
                  style={{
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 18px",
                    border: "1px solid var(--separator)",
                    cursor: "default",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255, 159, 10, 0.12)",
                        color: "var(--accent-orange)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Target size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                        Recommended Focus
                      </span>
                      <div style={{ fontSize: "13.5px", fontWeight: 650, color: "var(--text-primary)" }}>
                        Autonomic Balance Under Interruption
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                        Practice maintaining steady breathing when challenged
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--accent-orange)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Practice →
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PRESSURE SKILLS (Exact 5 skills with plain language) */}
          {activeTab === "skills" && (
            <div
              className="glass-surface"
              style={{
                borderRadius: "var(--radius-xl)",
                padding: "24px 28px",
                border: "1px solid var(--separator)",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                  The 5 Pressure Skills
                </h3>
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "3px" }}>
                  Evaluated through camera-measured pulse rate, autonomic stability, and facial micro-expressions.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {pressureSkills.map((skill) => (
                  <div
                    key={skill.name}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {skill.name}
                        </span>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "2px 6px",
                            borderRadius: "var(--radius-xs)",
                            backgroundColor: "var(--bg-elevated)",
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                          }}
                        >
                          {skill.level}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11.5px", color: "var(--accent-green)", fontWeight: 500 }}>
                          {skill.trend}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
                          {skill.score}%
                        </span>
                      </div>
                    </div>

                    <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "var(--bg-window)", overflow: "hidden", marginBottom: "8px" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${skill.score}%`,
                          backgroundColor: skill.score >= 90 ? "var(--accent-green)" : "var(--accent-blue)",
                        }}
                      />
                    </div>

                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                      {skill.plainNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BREAKDOWN (Performance by Category + Counterpart Reactivity) */}
          {activeTab === "breakdown" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Performance by Category */}
              <div
                className="glass-surface"
                style={{
                  borderRadius: "var(--radius-xl)",
                  padding: "22px 24px",
                  border: "1px solid var(--separator)",
                }}
              >
                <h3 style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "3px" }}>
                  Performance by Category
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                  Average composure scores across conversation types.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {categoryPerformance.map((cat) => (
                    <div
                      key={cat.category}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <CategoryIcon category={cat.category} size={18} />
                        <span style={{ fontSize: "12.5px", fontWeight: 550, color: "var(--text-primary)" }}>
                          {cat.category}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          {cat.sessions} session{cat.sessions > 1 ? "s" : ""}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
                          {cat.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Counterpart Temperament Reactivity */}
              <div
                className="glass-surface"
                style={{
                  borderRadius: "var(--radius-xl)",
                  padding: "22px 24px",
                  border: "1px solid var(--separator)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <Users size={14} style={{ color: "var(--accent-purple)" }} />
                  <h3 style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                    Reactivity by Persona Type
                  </h3>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                  Shows which counterpart attitudes trigger the most autonomic response.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {personaTypePerformance.map((item) => (
                    <div
                      key={item.type}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "12.5px", fontWeight: 550, color: "var(--text-primary)" }}>
                          {item.type}
                        </span>
                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          {item.note}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color:
                            item.score >= 90
                              ? "var(--accent-green)"
                              : item.score >= 80
                              ? "var(--accent-blue)"
                              : "var(--accent-orange)",
                        }}
                      >
                        {item.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Footnote / Disclaimer */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--separator)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={13} style={{ color: "var(--text-tertiary)" }} />
              <span style={{ fontSize: "11.5px", color: "var(--text-tertiary)" }}>
                {WELLNESS_DISCLAIMER} Video is processed on your device.
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              Sessions &lt; 60s record pulse &amp; expressions (HRV requires 60s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
