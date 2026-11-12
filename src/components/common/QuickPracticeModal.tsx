import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context";
import { CategoryIcon } from "./CategoryIcon";
import {
  Zap,
  X,
  Shuffle,
  RotateCcw,
  ArrowRight,
  Search
} from "lucide-react";
import { formatRoomNumber, type Guest } from "../../types";
import { GuestPicker } from "./GuestPicker";

export const QuickPracticeModal: React.FC = () => {
  const {
    isQuickPracticeOpen,
    closeQuickPractice,
    scenarios,
    guests,
    openBriefing,
    triggerRandomPractice,
    triggerLastUsedPractice
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest>(guests[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isQuickPracticeOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isQuickPracticeOpen]);

  if (!isQuickPracticeOpen) return null;

  const filtered = scenarios.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.guestName.toLowerCase().includes(query.toLowerCase()) ||
      s.interactionType.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1060,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh"
      }}
      onClick={closeQuickPractice}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "520px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          border: "1px solid var(--separator)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            height: "50px",
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={14} style={{ color: "var(--accent-orange)" }} fill="var(--accent-orange)" />
            <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
              Quick Practice
            </span>
          </div>

          <button
            onClick={closeQuickPractice}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick Actions Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            padding: "14px 18px",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(30, 30, 32, 0.3)"
          }}
        >
          <button
            onClick={triggerRandomPractice}
            style={{
              padding: "10px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(10, 132, 255, 0.12)",
              border: "1px solid rgba(10, 132, 255, 0.3)",
              color: "var(--accent-blue)",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Shuffle size={13} />
            <span>Random Scenario</span>
          </button>

          <button
            onClick={triggerLastUsedPractice}
            style={{
              padding: "10px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-control)",
              border: "1px solid var(--separator)",
              color: "var(--text-primary)",
              fontSize: "12px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer"
            }}
            className="hover-subtle"
          >
            <RotateCcw size={13} />
            <span>Last Practiced</span>
          </button>
        </div>

        {/* Guest Selector Row */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--separator)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: "6px" }}>
            Practicing With Guest
          </div>
          <GuestPicker
            scenario={scenarios[0]}
            selectedGuest={selectedGuest}
            onSelectGuest={setSelectedGuest}
          />
        </div>

        {/* Search Input */}
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--separator)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Search size={13} style={{ color: "var(--text-tertiary)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type scenario or guest name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "13px"
            }}
          />
        </div>

        {/* List of Scenarios */}
        <div style={{ maxHeight: "280px", overflowY: "auto", padding: "6px" }}>
          {filtered.map((scenario) => (
            <div
              key={scenario.id}
              onClick={() => {
                closeQuickPractice();
                openBriefing(scenario, selectedGuest.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "background-color 0.12s ease"
              }}
              className="hover-subtle"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CategoryIcon category={scenario.interactionType} size={14} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 550, color: "var(--text-primary)" }}>
                    {scenario.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {scenario.guestName} ({formatRoomNumber(scenario.roomNumber)}) · {scenario.difficulty}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  ~{scenario.durationMinutes}m
                </span>
                <ArrowRight size={12} style={{ color: "var(--accent-blue)" }} />
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
              No scenarios found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
