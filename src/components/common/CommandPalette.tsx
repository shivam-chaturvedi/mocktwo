import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context";
import { CategoryIcon } from "./CategoryIcon";
import {
  Search,
  ArrowRight,
  LayoutDashboard,
  Target,
  ChartNoAxesColumn,
  Settings,
  Film,
  Plus,
  Zap,
  UserPlus
} from "lucide-react";
import { formatRoomNumber } from "../../types";

const CommandPaletteModal: React.FC = () => {
  const {
    closeSearch,
    scenarios,
    openBriefing,
    navigateTo,
    openSettings,
    openStudio,
    openQuickPractice
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredScenarios = scenarios.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.guestName.toLowerCase().includes(query.toLowerCase()) ||
      s.interactionType.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    { label: "Go to Today (⌘1)", icon: <LayoutDashboard size={14} />, action: () => navigateTo("today") },
    { label: "Browse Scenarios (⌘2)", icon: <Target size={14} />, action: () => navigateTo("scenarios") },
    { label: "View Recordings & Debriefs (⌘3)", icon: <Film size={14} />, action: () => navigateTo("recordings") },
    { label: "View Performance & Mastery (⌘4)", icon: <ChartNoAxesColumn size={14} />, action: () => navigateTo("progress") },
    { label: "New Scenario (⌘N)", icon: <Plus size={14} />, action: () => openStudio("scenario") },
    { label: "New Guest (⌘⇧N)", icon: <UserPlus size={14} />, action: () => openStudio("guest") },
    { label: "Quick Practice (⌘⇧P)", icon: <Zap size={14} />, action: () => openQuickPractice() },
    { label: "Open Preferences… (⌘,)", icon: <Settings size={14} />, action: () => openSettings() }
  ];

  const totalItems = filteredScenarios.length + (query.trim() === "" ? quickActions.length : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < filteredScenarios.length) {
        closeSearch();
        openBriefing(filteredScenarios[selectedIndex]);
      } else {
        const actionIdx = selectedIndex - filteredScenarios.length;
        if (quickActions[actionIdx]) {
          closeSearch();
          quickActions[actionIdx].action();
        }
      }
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh"
      }}
      onClick={closeSearch}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "560px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden",
          border: "1px solid var(--separator)"
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search input header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderBottom: "1px solid var(--separator)"
          }}
        >
          <Search size={18} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search scenarios, guests, or jump to tab…"
            style={{
              width: "100%",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-sans)"
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--bg-control)",
              padding: "2px 6px",
              borderRadius: "4px",
              color: "var(--text-tertiary)",
              border: "1px solid var(--separator)",
              flexShrink: 0
            }}
          >
            ESC
          </span>
        </div>

        {/* Results list */}
        <div
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            padding: "8px"
          }}
        >
          {filteredScenarios.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  padding: "4px 10px 6px 10px"
                }}
              >
                Scenarios ({filteredScenarios.length})
              </div>
              {filteredScenarios.map((scenario, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <div
                    key={scenario.id}
                    onClick={() => {
                      closeSearch();
                      openBriefing(scenario);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: isSelected ? "var(--bg-hover)" : "transparent",
                      cursor: "pointer",
                      transition: "background-color 0.08s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <CategoryIcon category={scenario.interactionType} size={15} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {scenario.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {scenario.guestName} ({formatRoomNumber(scenario.roomNumber)}) • ~{scenario.durationMinutes}m
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} style={{ color: isSelected ? "var(--text-primary)" : "var(--text-tertiary)" }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions (shown when query is empty) */}
          {query.trim() === "" && (
            <div>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  padding: "6px 10px 4px 10px",
                  borderTop: filteredScenarios.length > 0 ? "1px solid var(--separator)" : "none",
                  marginTop: filteredScenarios.length > 0 ? "6px" : 0
                }}
              >
                Quick Actions
              </div>
              {quickActions.map((action, index) => {
                const actualIndex = filteredScenarios.length + index;
                const isSelected = selectedIndex === actualIndex;
                return (
                  <div
                    key={action.label}
                    onClick={() => {
                      closeSearch();
                      action.action();
                    }}
                    onMouseEnter={() => setSelectedIndex(actualIndex)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: isSelected ? "var(--bg-hover)" : "transparent",
                      cursor: "pointer",
                      transition: "background-color 0.08s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {action.icon}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                        {action.label}
                      </span>
                    </div>
                    <ArrowRight size={13} style={{ color: isSelected ? "var(--text-primary)" : "var(--text-tertiary)" }} />
                  </div>
                );
              })}
            </div>
          )}

          {filteredScenarios.length === 0 && query.trim() !== "" && (
            <div style={{ padding: "28px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
              No matching scenarios found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommandPalette: React.FC = () => {
  const { isSearchOpen } = useApp();
  if (!isSearchOpen) return null;
  return <CommandPaletteModal />;
};
