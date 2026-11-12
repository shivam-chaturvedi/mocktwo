import React, { useState } from "react";
import { useApp } from "../context";
import { ScoreRing } from "../components/common/ScoreRing";
import { CategoryIcon } from "../components/common/CategoryIcon";
import {
  ChevronRight,
  TrendingUp,
  Award,
  ArrowRight,
  Target
} from "lucide-react";

export const ProgressScreen: React.FC = () => {
  const {
    employee,
    recordings,
    selectRecording,
    navigateTo,
    openBriefing,
    scenarios
  } = useApp();

  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "All">("30D");

  const competencies = [
    {
      name: "Empathy & Guest Validation",
      score: 93,
      trend: "+5%",
      note: "Exceptional warmth and reassuring active cadence with high-tier guests."
    },
    {
      name: "Professional Poise & Etiquette",
      score: 95,
      trend: "+2%",
      note: "Impeccable diplomatic tone and adherence to five-star service standards."
    },
    {
      name: "Active Listening & Inquiry",
      score: 89,
      trend: "+3%",
      note: "Strong synthesis of guest expectations before outlining resolution steps."
    },
    {
      name: "Decisive Problem Solving",
      score: 92,
      trend: "+4%",
      note: "Swift presentation of balanced, value-additive alternate accommodations."
    },
    {
      name: "Response Quality & Cadence",
      score: 91,
      trend: "+2%",
      note: "Polished articulation and articulate follow-through commitments."
    }
  ];

  const categoryPerformance = [
    { category: "Concierge", score: 95, sessions: 6 },
    { category: "Executive Lounge", score: 92, sessions: 4 },
    { category: "Escalation Management", score: 91, sessions: 5 },
    { category: "Guest Services", score: 89, sessions: 3 }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "var(--accent-green)";
    if (score >= 75) return "var(--accent-blue)";
    if (score >= 60) return "var(--accent-orange)";
    return "var(--accent-red)";
  };

  const bestRecording = recordings.find((r) => (r.score || 0) >= 95) || recordings[0];
  const recommendedScenario = scenarios.find((s) => s.id === "sc-escalated") || scenarios[0];

  return (
    <div style={{ padding: "32px 40px 60px", maxWidth: "1080px", margin: "0 auto" }}>
      {/* Header + Time Range Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "28px",
          gap: "20px",
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
            Performance & Mastery
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0 }}>
            Track communication competency ratings, speech analytics trends, and five-star benchmarks.
          </p>
        </div>

        {/* Range Selector: 7D / 30D / 90D / All */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            backgroundColor: "var(--bg-control)",
            padding: "2px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--separator)"
          }}
        >
          {(["7D", "30D", "90D", "All"] as const).map((rng) => {
            const isSelected = timeRange === rng;
            return (
              <button
                key={rng}
                onClick={() => setTimeRange(rng)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "11.5px",
                  fontWeight: isSelected ? 600 : 450,
                  color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: isSelected ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.12s ease"
                }}
              >
                {rng}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Top Score Banner & Sparkline */}
        <div
          className="glass-surface"
          style={{
            borderRadius: "var(--radius-xl)",
            padding: "26px 30px",
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: "36px",
            alignItems: "center",
            border: "1px solid var(--separator)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
          }}
        >
          {/* Overall Score */}
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <ScoreRing score={employee.averageRating} size={100} strokeWidth={8} />
            <div>
              <span style={{ fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", fontWeight: 600 }}>
                Mastery Level
              </span>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 650,
                  color: "var(--text-primary)",
                  margin: "2px 0 4px 0"
                }}
              >
                Diamond Distinction
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                Consistently exceeding luxury five-star hospitality benchmarks across all departments.
              </p>
            </div>
          </div>

          {/* Sparkline & Stats */}
          <div style={{ borderLeft: "1px solid var(--separator)", paddingLeft: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                30-Day Score Trend
              </span>
              <span style={{ fontSize: "11.5px", color: "var(--accent-green)", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: 500 }}>
                <TrendingUp size={13} /> +3.4% this period
              </span>
            </div>

            {/* Sparkline Visual Simulation */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "46px", marginBottom: "16px" }}>
              {[86, 88, 87, 91, 90, 94, 92, 95].map((val, idx) => (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${(val - 75) * 2.2}px`,
                      backgroundColor: idx === 7 ? "var(--accent-blue)" : "rgba(10, 132, 255, 0.35)",
                      borderRadius: "3px"
                    }}
                  />
                  <span style={{ fontSize: "9px", color: "var(--text-tertiary)" }}>
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* 4 Compact Stat Tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Sessions</span>
                <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", display: "block" }}>
                  {employee.completedSessionsCount}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Practice Time</span>
                <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", display: "block" }}>
                  54 mins
                </span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Daily Streak</span>
                <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", display: "block" }}>
                  {employee.streakDays} days
                </span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Average</span>
                <span className="tabular-nums" style={{ fontSize: "14px", fontWeight: 650, color: "var(--accent-green)", display: "block" }}>
                  {employee.averageRating}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Highlights Row: Best Session + Most Improved Skill */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Best Session Card */}
          {bestRecording && (
            <div
              onClick={() => {
                selectRecording(bestRecording);
                navigateTo("recordings");
              }}
              className="glass-surface mac-card-hoverable"
              style={{
                borderRadius: "var(--radius-lg)",
                padding: "18px 20px",
                border: "1px solid var(--separator)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(48, 209, 88, 0.12)",
                    color: "var(--accent-green)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0
                  }}
                >
                  <Award size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                    Best Performance
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                    {bestRecording.scenarioTitle}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Guest: {bestRecording.guestName} · {bestRecording.date}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-green)" }}>
                  {bestRecording.score}%
                </span>
                <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </div>
          )}

          {/* Recommended Next Practice Card */}
          <div
            onClick={() => openBriefing(recommendedScenario)}
            className="glass-surface mac-card-hoverable"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "18px 20px",
              border: "1px solid rgba(10, 132, 255, 0.3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(10, 132, 255, 0.12)",
                  color: "var(--accent-blue)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0
                }}
              >
                <Target size={20} />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                  Recommended Focus
                </span>
                <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                  {recommendedScenario.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Target: Active Listening & Cadence (~{recommendedScenario.durationMinutes}m)
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-blue)", fontSize: "12px", fontWeight: 600 }}>
              <span>Start</span>
              <ArrowRight size={13} />
            </div>
          </div>
        </div>

        {/* Competencies Breakdown */}
        <div
          className="glass-surface"
          style={{
            borderRadius: "var(--radius-xl)",
            padding: "24px 28px",
            border: "1px solid var(--separator)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
          }}
        >
          <h3
            style={{
              fontSize: "15.5px",
              fontWeight: 650,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
              letterSpacing: "-0.01em"
            }}
          >
            Evaluated Skills & Competencies
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {competencies.map((comp) => {
              const color = getScoreColor(comp.score);
              return (
                <div
                  key={comp.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)"
                  }}
                >
                  <ScoreRing score={comp.score} size={42} strokeWidth={4} color={color} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {comp.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--accent-green)", fontWeight: 500 }}>
                          {comp.trend}
                        </span>
                        <span className="tabular-nums" style={{ fontSize: "13px", fontWeight: 650, color }}>
                          {comp.score}%
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      {comp.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Performance Breakdown */}
        <div
          className="glass-surface"
          style={{
            borderRadius: "var(--radius-xl)",
            padding: "24px 28px",
            border: "1px solid var(--separator)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
          }}
        >
          <h3
            style={{
              fontSize: "15.5px",
              fontWeight: 650,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
              letterSpacing: "-0.01em"
            }}
          >
            Scenario Performance by Department
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
            {categoryPerformance.map((cat) => (
              <div
                key={cat.category}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <CategoryIcon category={cat.category as any} size={15} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {cat.category}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    {cat.sessions} sessions
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: getScoreColor(cat.score) }}>
                    {cat.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
