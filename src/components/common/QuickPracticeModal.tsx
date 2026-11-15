import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../../context";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";
import { serviceRegistry } from "../../services/api";
import {
  X,
  Search,
  Compass,
  ChevronDown,
  Sliders,
} from "lucide-react";
import type { PracticeScenario } from "../../types";

type QuickPracticeMode = "describe" | "scenarios";
type GoalPreset = "Interview" | "Sales pitch" | "Presentation" | "Negotiation" | "Tough conversation";

const PRESET_SUGGESTIONS: Record<GoalPreset, [string, string, string]> = {
  Interview: [
    "Tell me about a time you handled a crisis",
    "Why are you leaving your current role?",
    "Handling a tough technical question under pressure",
  ],
  "Sales pitch": [
    "Handling a 40% discount demand",
    "Prospect says they're happy with their existing vendor",
    "Executive asking for proof of immediate ROI",
  ],
  Presentation: [
    "Opening an all-hands product launch demo",
    "Senior stakeholder interrupts on slide two",
    "Q&A pushback on project timeline delays",
  ],
  Negotiation: [
    "Renegotiating contract payment terms",
    "Counter-offering an aggressive counter-party",
    "Securing non-monetary trade-offs in renewal",
  ],
  "Tough conversation": [
    "Delivering critical peer performance feedback",
    "Addressing missed milestone commitments",
    "Resolving cross-team priority conflicts",
  ],
};

const CATEGORY_OPTIONS = [
  "Auto",
  "Job Interviews",
  "Sales Pitches & Client Calls",
  "Presentations & Demos",
  "Difficult Conversations",
  "High-Stakes Negotiation",
  "Customer Service & Escalations",
  "Hospitality & Service",
];

const LENGTH_OPTIONS = [
  { label: "1 min", value: 1 },
  { label: "3 min", value: 3 },
  { label: "5 min", value: 5 },
];

// Session-level persistent draft text across modal open/close
let sessionPersistentDraft = "";

export const QuickPracticeModal: React.FC = () => {
  const {
    isQuickPracticeOpen,
    closeQuickPractice,
    scenarios,
    personas,
    openBriefing,
    settings,
  } = useApp();

  const isSessionAvailable = serviceRegistry.session.isAvailable();

  // Mode: "describe" or "scenarios"
  const [mode, setMode] = useState<QuickPracticeMode>("describe");

  // Describe state
  const [activePreset, setActivePreset] = useState<GoalPreset>("Interview");
  const [draftText, setDraftText] = useState(sessionPersistentDraft);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("auto");
  const [selectedCategory, setSelectedCategory] = useState<string>("Auto");
  const [selectedLength, setSelectedLength] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scenarios mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedScenarioIndex, setHighlightedScenarioIndex] = useState(0);

  // Refs for focus management and focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Update session persistent draft when typing
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 500);
    setDraftText(val);
    sessionPersistentDraft = val;
    // Auto-grow textarea up to 8 rows
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 96), 192);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  };

  // Focus trap & restoration
  useEffect(() => {
    if (isQuickPracticeOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      // Focus appropriate input on open
      const timer = setTimeout(() => {
        if (mode === "describe") {
          textareaRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isQuickPracticeOpen, mode]);

  // Filtered scenarios in Scenarios mode
  const filteredScenarios = useMemo(() => {
    if (!searchQuery.trim()) return scenarios;
    const q = searchQuery.toLowerCase();
    return scenarios.filter((s) => {
      const personaName = s.personaName || s.guestName || "";
      return (
        s.title.toLowerCase().includes(q) ||
        personaName.toLowerCase().includes(q) ||
        s.interactionType.toLowerCase().includes(q)
      );
    });
  }, [scenarios, searchQuery]);

  // Start practice from Describe Mode
  const handleStartDescribePractice = useCallback(async () => {
    const trimmed = draftText.trim();
    if (trimmed.length < 10 || !isSessionAvailable || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const createdAdHoc = await serviceRegistry.scenarios.createAdHoc({
        topic: trimmed,
        category: selectedCategory !== "Auto" ? selectedCategory : undefined,
        personaId: selectedPersonaId !== "auto" ? selectedPersonaId : undefined,
        lengthMin: selectedLength,
      });

      closeQuickPractice();
      openBriefing(
        createdAdHoc,
        selectedPersonaId !== "auto" ? selectedPersonaId : undefined
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    draftText,
    isSessionAvailable,
    isSubmitting,
    selectedCategory,
    selectedPersonaId,
    selectedLength,
    closeQuickPractice,
    openBriefing,
  ]);

  // Open scenario from Scenarios Mode
  const handleSelectScenario = useCallback(
    (sc: PracticeScenario) => {
      closeQuickPractice();
      openBriefing(sc);
    },
    [closeQuickPractice, openBriefing]
  );

  // Key navigation: Esc closes, ⌘Enter starts Describe practice, Enter selects scenario in list
  useEffect(() => {
    if (!isQuickPracticeOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeQuickPractice();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (mode === "describe") {
          e.preventDefault();
          handleStartDescribePractice();
        }
        return;
      }

      if (mode === "scenarios") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedScenarioIndex((prev) =>
            prev < filteredScenarios.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedScenarioIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
          const sc = filteredScenarios[highlightedScenarioIndex];
          if (sc) {
            e.preventDefault();
            handleSelectScenario(sc);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isQuickPracticeOpen,
    mode,
    handleStartDescribePractice,
    closeQuickPractice,
    filteredScenarios,
    highlightedScenarioIndex,
    handleSelectScenario,
  ]);

  if (!isQuickPracticeOpen) return null;

  const currentSuggestions = PRESET_SUGGESTIONS[activePreset] || PRESET_SUGGESTIONS.Interview;
  const isDescribeValid = draftText.trim().length >= 10;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1060,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
      onClick={closeQuickPractice}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-practice-title"
        className="glass-surface animate-sheet-in"
        style={{
          width: "680px",
          maxWidth: "calc(100vw - 32px)",
          height: "560px",
          maxHeight: "calc(100vh - 48px)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-modal)",
          border: "1px solid var(--separator)",
          backgroundColor: "var(--bg-elevated)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div
          style={{
            height: "56px",
            minHeight: "56px",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "var(--bg-window)",
          }}
        >
          {/* Left Title & Subtitle */}
          <div>
            <h2
              id="quick-practice-title"
              style={{
                fontSize: "14.5px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Quick practice
            </h2>
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--text-secondary)",
                marginTop: "1px",
              }}
            >
              Describe a conversation or pick an existing scenario.
            </div>
          </div>

          {/* Center Mode Switch (Segmented Control) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "var(--bg-control)",
              padding: "2px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--separator)",
              transition: settings?.reducedMotion ? "none" : "all 150ms ease",
            }}
          >
            <button
              onClick={() => setMode("describe")}
              className="focus-ring"
              style={{
                padding: "4px 14px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: mode === "describe" ? 600 : 450,
                color: mode === "describe" ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: mode === "describe" ? "var(--bg-elevated)" : "transparent",
                boxShadow: mode === "describe" ? "0 1px 2px rgba(0, 0, 0, 0.25)" : "none",
                border: "none",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              Describe
            </button>
            <button
              onClick={() => setMode("scenarios")}
              className="focus-ring"
              style={{
                padding: "4px 14px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: mode === "scenarios" ? 600 : 450,
                color: mode === "scenarios" ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: mode === "scenarios" ? "var(--bg-elevated)" : "transparent",
                boxShadow: mode === "scenarios" ? "0 1px 2px rgba(0, 0, 0, 0.25)" : "none",
                border: "none",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              Scenarios
            </button>
          </div>

          {/* Right Close Button */}
          <button
            onClick={closeQuickPractice}
            aria-label="Close dialog (Escape)"
            title="Close (Esc)"
            className="hover-subtle focus-ring"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--bg-control)",
              color: "var(--text-tertiary)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {mode === "describe" ? (
            /* =============================================================== */
            /* DESCRIBE MODE                                                  */
            /* =============================================================== */
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                padding: "16px 20px",
                gap: "12px",
                overflowY: "auto",
              }}
              className="custom-scroll"
            >
              {/* Goal Presets Segmented Chips */}
              <div>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 650,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: "6px",
                  }}
                >
                  Goal preset
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(["Interview", "Sales pitch", "Presentation", "Negotiation", "Tough conversation"] as GoalPreset[]).map(
                    (preset) => {
                      const isActive = activePreset === preset;
                      return (
                        <button
                          key={preset}
                          onClick={() => setActivePreset(preset)}
                          className="hover-subtle focus-ring"
                          style={{
                            padding: "4px 10px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "11.5px",
                            fontWeight: isActive ? 600 : 450,
                            backgroundColor: isActive ? "var(--bg-hover)" : "var(--bg-control)",
                            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                            border: isActive ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                            cursor: "pointer",
                            transition: "all 0.12s ease",
                          }}
                        >
                          {preset}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Multi-line Textarea with Auto-grow & Character Counter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ position: "relative" }}>
                  <textarea
                    ref={textareaRef}
                    rows={4}
                    value={draftText}
                    onChange={handleDraftChange}
                    placeholder="Describe what you want to practice, or click a suggestion below…"
                    style={{
                      width: "100%",
                      minHeight: "96px",
                      maxHeight: "192px",
                      padding: "10px 12px 24px 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "15px",
                      lineHeight: "1.45",
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                    className="focus-ring"
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: "10px",
                      bottom: "6px",
                      fontSize: "10.5px",
                      fontFamily: "var(--font-mono)",
                      color: draftText.length >= 480 ? "var(--accent-orange)" : "var(--text-tertiary)",
                      userSelect: "none",
                    }}
                  >
                    {draftText.length}/500
                  </div>
                </div>
              </div>

              {/* 3 Clickable Suggestion Chips (Button Style, No Underline) */}
              <div>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 650,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Sliders size={11} style={{ color: "var(--accent-orange)" }} />
                  <span>Topic suggestions</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {currentSuggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => {
                        setDraftText(sug);
                        sessionPersistentDraft = sug;
                        textareaRef.current?.focus();
                      }}
                      className="hover-subtle focus-ring"
                      style={{
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <span style={{ color: "var(--accent-blue)", fontSize: "11px" }}>+</span>
                      <span style={{ color: "var(--text-primary)" }}>{sug}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 56px Selector Options Row: Persona, Category, Length */}
              <div
                style={{
                  height: "56px",
                  minHeight: "56px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 0.8fr",
                  alignItems: "center",
                  padding: "0 12px",
                  gap: "10px",
                  boxSizing: "border-box",
                }}
              >
                {/* Persona selector */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <label
                    htmlFor="adhoc-persona-select"
                    style={{
                      fontSize: "9.5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                    }}
                  >
                    Persona
                  </label>
                  <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <select
                      id="adhoc-persona-select"
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      style={{
                        width: "100%",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        paddingRight: "16px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <option value="auto">Auto (recommended)</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.title})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} style={{ position: "absolute", right: 0, pointerEvents: "none", color: "var(--text-tertiary)" }} />
                  </div>
                </div>

                {/* Category selector */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, borderLeft: "1px solid var(--separator)", paddingLeft: "10px" }}>
                  <label
                    htmlFor="adhoc-category-select"
                    style={{
                      fontSize: "9.5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                    }}
                  >
                    Category
                  </label>
                  <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <select
                      id="adhoc-category-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{
                        width: "100%",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        paddingRight: "16px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} style={{ position: "absolute", right: 0, pointerEvents: "none", color: "var(--text-tertiary)" }} />
                  </div>
                </div>

                {/* Length selector */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, borderLeft: "1px solid var(--separator)", paddingLeft: "10px" }}>
                  <label
                    htmlFor="adhoc-length-select"
                    style={{
                      fontSize: "9.5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                    }}
                  >
                    Length
                  </label>
                  <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <select
                      id="adhoc-length-select"
                      value={selectedLength}
                      onChange={(e) => setSelectedLength(Number(e.target.value))}
                      style={{
                        width: "100%",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        paddingRight: "16px",
                      }}
                    >
                      {LENGTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} style={{ position: "absolute", right: 0, pointerEvents: "none", color: "var(--text-tertiary)" }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* SCENARIOS MODE                                                 */
            /* =============================================================== */
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Single Search Input */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--separator)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "var(--bg-control)",
                    padding: "7px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--separator)",
                  }}
                  className="focus-ring"
                >
                  <Search size={14} style={{ color: "var(--text-tertiary)" }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search scenario library by title or counterpart…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedScenarioIndex(0);
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* 52px Result Rows List or Centered Empty State */}
              <div
                className="custom-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: "6px 12px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {scenarios.length === 0 ? (
                  <EmptyState
                    icon={<Compass size={24} />}
                    title="No scenarios available"
                    description="The scenario library is empty right now. Switch to Describe to create a custom practice session."
                    primaryAction={{
                      label: "Switch to Describe",
                      onClick: () => setMode("describe"),
                    }}
                    style={{ height: "100%" }}
                  />
                ) : filteredScenarios.length === 0 ? (
                  <EmptyState
                    icon={<Search size={20} />}
                    title="No matching scenarios"
                    description="Try a different search term or clear the filter."
                    primaryAction={{
                      label: "Clear search",
                      onClick: () => setSearchQuery(""),
                    }}
                    style={{ height: "100%" }}
                  />
                ) : (
                  filteredScenarios.map((sc, idx) => {
                    const isHighlighted = idx === highlightedScenarioIndex;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => handleSelectScenario(sc)}
                        onMouseEnter={() => setHighlightedScenarioIndex(idx)}
                        className="mac-list-row"
                        style={{
                          height: "52px",
                          minHeight: "52px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0 12px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: isHighlighted ? "var(--bg-hover)" : "transparent",
                          cursor: "pointer",
                          marginBottom: "2px",
                          boxSizing: "border-box",
                          borderLeft: isHighlighted ? "3px solid var(--accent-blue)" : "3px solid transparent",
                        }}
                      >
                        {/* Left: Category Icon + Title + Counterpart */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                          <CategoryIcon category={sc.interactionType} size={16} />
                          <div style={{ minWidth: 0, flex: 1 }}>
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
                              {sc.title}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text-secondary)",
                                marginTop: "1px",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                              }}
                            >
                              With {sc.personaName || sc.guestName || "Counterpart"} · {sc.interactionType}
                            </div>
                          </div>
                        </div>

                        {/* Right: Difficulty badge + Duration */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                          <Badge variant="neutral" size="sm">
                            {sc.difficulty}
                          </Badge>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-tertiary)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            ~{sc.durationMinutes}m
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer (For Describe Mode) */}
        {mode === "describe" && (
          <div
            style={{
              height: "52px",
              minHeight: "52px",
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid var(--separator)",
              backgroundColor: "var(--bg-window)",
            }}
          >
            {/* Left hint / offline note */}
            <div>
              {!isSessionAvailable ? (
                <span style={{ fontSize: "11.5px", color: "var(--text-tertiary)" }}>
                  Practice sessions aren't available yet.
                </span>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--bg-control)",
                      padding: "2px 5px",
                      borderRadius: "4px",
                      border: "1px solid var(--separator)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    ⌘↵
                  </span>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    to start practice
                  </span>
                </div>
              )}
            </div>

            {/* Right primary button */}
            <button
              onClick={handleStartDescribePractice}
              disabled={!isDescribeValid || !isSessionAvailable || isSubmitting}
              title={
                !isSessionAvailable
                  ? "Practice sessions require a connected mocktwo backend"
                  : !isDescribeValid
                  ? "Enter at least 10 characters to start practice"
                  : undefined
              }
              className="mac-btn focus-ring"
              style={{
                padding: "6px 16px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: isDescribeValid && isSessionAvailable ? "var(--accent-blue)" : "var(--bg-control)",
                color: isDescribeValid && isSessionAvailable ? "#ffffff" : "var(--text-tertiary)",
                fontSize: "12.5px",
                fontWeight: 600,
                border: isDescribeValid && isSessionAvailable ? "none" : "1px solid var(--separator)",
                cursor: isDescribeValid && isSessionAvailable ? "pointer" : "not-allowed",
                opacity: isDescribeValid && isSessionAvailable ? 1 : 0.6,
                transition: "all 0.12s ease",
              }}
            >
              {isSubmitting ? "Preparing…" : "Start practice"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
