import React, { useState, useMemo, useRef, useEffect } from "react";
import { useApp } from "../context";
import { Badge } from "../components/common/Badge";
import { CategoryIcon } from "../components/common/CategoryIcon";
import { EmptyState } from "../components/common/EmptyState";
import {
  Search,
  ArrowRight,
  Plus,
  Briefcase,
  TrendingUp,
  Presentation,
  Handshake,
  MessageCircleWarning,
  Headset,
  ConciergeBell,
  Target,
  Clock,
  Copy,
  Trash2,
  Compass,
  FolderPlus,
  User,
  ChevronDown,
  Check,
  Layers,
  FilePlus,
} from "lucide-react";
import { formatContextSetting, type InteractionType, type PracticeScenario, type Persona } from "../types";

export const ScenariosScreen: React.FC = () => {
  const {
    scenarios,
    personas,
    openBriefing,
    openStudio,
    duplicateScenario,
    deleteScenario,
    updatePersona,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"library" | "mine" | "personas">("library");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy] = useState<"recommended" | "duration" | "difficulty">("recommended");

  // Selected items for split view
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [scenarioToDelete, setScenarioToDelete] = useState<PracticeScenario | null>(null);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // Close category popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryPopoverOpen(false);
      }
    };
    if (isCategoryPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryPopoverOpen]);

  const categoryOptions: { label: string; type?: InteractionType; icon: React.ReactNode }[] = [
    { label: "All", icon: <Layers size={12} /> },
    { label: "Interviews", type: "Interviews", icon: <Briefcase size={12} /> },
    { label: "Sales & Pitches", type: "Sales & Pitches", icon: <TrendingUp size={12} /> },
    { label: "Presentations", type: "Presentations", icon: <Presentation size={12} /> },
    { label: "Negotiation", type: "Negotiation", icon: <Handshake size={12} /> },
    { label: "Difficult Conversations", type: "Difficult Conversations", icon: <MessageCircleWarning size={12} /> },
    { label: "Customer Service", type: "Customer Service", icon: <Headset size={12} /> },
    { label: "Hospitality", type: "Hospitality", icon: <ConciergeBell size={12} /> },
  ];

  const selectedCategoryObj = categoryOptions.find((c) => c.label === selectedCategory) || categoryOptions[0];

  // Scenarios lists
  const libraryScenarios = useMemo(() => scenarios.filter((s) => s.source !== "Mine"), [scenarios]);
  const mineScenarios = useMemo(() => scenarios.filter((s) => s.source === "Mine"), [scenarios]);
  const currentScenariosList = activeSubTab === "mine" ? mineScenarios : libraryScenarios;

  // Check if current tab is completely empty at source level
  const isCurrentTabEmpty =
    activeSubTab === "personas"
      ? personas.length === 0
      : activeSubTab === "mine"
      ? mineScenarios.length === 0
      : libraryScenarios.length === 0;

  const filteredScenarios = useMemo(() => {
    return currentScenariosList.filter((s) => {
      const matchesCat = selectedCategory === "All" || s.interactionType === selectedCategory;
      const personaName = s.personaName || s.guestName || "";
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        personaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [currentScenariosList, selectedCategory, searchQuery]);

  const sortedScenarios = useMemo(() => {
    const list = [...filteredScenarios];
    if (sortBy === "duration") return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
    if (sortBy === "difficulty") {
      const diffOrder = { Foundational: 1, Intermediate: 2, Advanced: 3 };
      return list.sort((a, b) => diffOrder[b.difficulty] - diffOrder[a.difficulty]);
    }
    return list;
  }, [filteredScenarios, sortBy]);

  // Filtered Personas
  const filteredPersonas = useMemo(() => {
    return personas.filter((p) => {
      const q = searchQuery.toLowerCase();
      const seniority = p.seniority || p.loyaltyTier || "";
      return (
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        seniority.toLowerCase().includes(q) ||
        (p.temperamentTraits || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [personas, searchQuery]);

  // Selected Scenario & Persona objects (auto-select first item when available, never null if items exist)
  const activeScenario: PracticeScenario | undefined = useMemo(() => {
    if (sortedScenarios.length === 0) return undefined;
    return sortedScenarios.find((s) => s.id === selectedScenarioId) || sortedScenarios[0];
  }, [sortedScenarios, selectedScenarioId]);

  const activePersona: Persona | undefined = useMemo(() => {
    if (filteredPersonas.length === 0) return undefined;
    return filteredPersonas.find((p) => p.id === selectedPersonaId) || filteredPersonas[0];
  }, [filteredPersonas, selectedPersonaId]);

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
      {/* 44px Sub-Toolbar with Sub-Tabs */}
      <div
        style={{
          height: "44px",
          minHeight: "44px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--separator)",
          backgroundColor: "var(--bg-window)",
        }}
      >
        {/* Left Sub-Tabs: No "(0)" in tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => {
              setActiveSubTab("library");
              setSearchQuery("");
            }}
            className="focus-ring"
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: activeSubTab === "library" ? 600 : 450,
              color: activeSubTab === "library" ? "var(--text-primary)" : "var(--text-secondary)",
              backgroundColor: activeSubTab === "library" ? "var(--bg-control)" : "transparent",
              cursor: "pointer",
            }}
          >
            {libraryScenarios.length > 0 ? `Library (${libraryScenarios.length})` : "Library"}
          </button>
          <button
            onClick={() => {
              setActiveSubTab("mine");
              setSearchQuery("");
            }}
            className="focus-ring"
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: activeSubTab === "mine" ? 600 : 450,
              color: activeSubTab === "mine" ? "var(--text-primary)" : "var(--text-secondary)",
              backgroundColor: activeSubTab === "mine" ? "var(--bg-control)" : "transparent",
              cursor: "pointer",
            }}
          >
            {mineScenarios.length > 0 ? `Mine (${mineScenarios.length})` : "Mine"}
          </button>
          <button
            onClick={() => {
              setActiveSubTab("personas");
              setSearchQuery("");
            }}
            className="focus-ring"
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: activeSubTab === "personas" ? 600 : 450,
              color: activeSubTab === "personas" ? "var(--text-primary)" : "var(--text-secondary)",
              backgroundColor: activeSubTab === "personas" ? "var(--bg-control)" : "transparent",
              cursor: "pointer",
            }}
          >
            {personas.length > 0 ? `Personas (${personas.length})` : "Personas"}
          </button>
        </div>

        {/* Right Toolbar Action: Hidden when current tab list is 0 to prevent duplicate primary CTAs */}
        <div>
          {!isCurrentTabEmpty && (
            activeSubTab === "personas" ? (
              <button
                onClick={() => openStudio("persona")}
                className="mac-btn focus-ring"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-blue)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={13} />
                <span>New Persona</span>
              </button>
            ) : (
              <button
                onClick={() => openStudio("scenario")}
                className="mac-btn focus-ring"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-blue)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={13} />
                <span>New Scenario</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Body */}
      {isCurrentTabEmpty ? (
        /* =================================================================== */
        /* ONE CENTERED, FULL-WIDTH EMPTY STATE (No split view, no duplicate CTA) */
        /* =================================================================== */
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            backgroundColor: "var(--bg-window)",
          }}
        >
          {activeSubTab === "personas" ? (
            <EmptyState
              icon={<User size={28} />}
              title="No personas yet"
              description="A persona defines who you practice with. Create your first persona to begin."
              primaryAction={{
                label: "New persona",
                icon: <Plus size={13} />,
                onClick: () => openStudio("persona"),
              }}
            />
          ) : activeSubTab === "mine" ? (
            <EmptyState
              icon={<FolderPlus size={28} />}
              title="No scenarios of your own yet"
              description="Create a scenario for a conversation you are preparing for."
              primaryAction={{
                label: "New scenario",
                icon: <Plus size={13} />,
                onClick: () => openStudio("scenario"),
              }}
            />
          ) : (
            <EmptyState
              icon={<Compass size={28} />}
              title="No scenarios available"
              description="The shared library is empty right now. Create your own scenario to get started."
              primaryAction={{
                label: "New scenario",
                icon: <Plus size={13} />,
                onClick: () => openStudio("scenario"),
              }}
            />
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* SPLIT VIEW (When items exist)                                       */
        /* =================================================================== */
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* LEFT PANE: Search, Category Dropdown & Scrollable Row List */}
          <div
            style={{
              width: "380px",
              minWidth: "340px",
              borderRight: "1px solid var(--separator)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "var(--bg-content)",
            }}
          >
            {/* Top Search & Filter Bar */}
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--separator)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "var(--bg-control)",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--separator)",
                }}
              >
                <Search size={14} style={{ color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  placeholder={activeSubTab === "personas" ? "Filter personas…" : "Filter scenarios…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: "12.5px",
                  }}
                />
              </div>

              {/* Single "Category: All" Dropdown Button + Popover (Never clipped) */}
              {activeSubTab !== "personas" && (
                <div style={{ position: "relative" }} ref={categoryDropdownRef}>
                  <button
                    onClick={() => setIsCategoryPopoverOpen((prev) => !prev)}
                    className="focus-ring hover-subtle"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11.5px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      width: "fit-content",
                    }}
                  >
                    {selectedCategoryObj.icon && (
                      <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-secondary)" }}>
                        {selectedCategoryObj.icon}
                      </span>
                    )}
                    <span>Category: {selectedCategory}</span>
                    <ChevronDown size={11} style={{ opacity: 0.6, marginLeft: "2px" }} />
                  </button>

                  {isCategoryPopoverOpen && (
                    <div
                      className="glass-surface animate-sheet-in"
                      style={{
                        position: "absolute",
                        top: "30px",
                        left: 0,
                        width: "220px",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-dropdown)",
                        border: "1px solid var(--separator)",
                        backgroundColor: "var(--bg-elevated)",
                        padding: "4px",
                        zIndex: 60,
                      }}
                    >
                      {categoryOptions.map((cat) => {
                        const isSelected = selectedCategory === cat.label;
                        return (
                          <button
                            key={cat.label}
                            onClick={() => {
                              setSelectedCategory(cat.label);
                              setIsCategoryPopoverOpen(false);
                            }}
                            className="hover-subtle focus-ring"
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: "var(--radius-xs)",
                              fontSize: "12px",
                              color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                              backgroundColor: isSelected ? "var(--bg-hover)" : "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {cat.icon || <Layers size={12} style={{ opacity: 0.4 }} />}
                              <span style={{ fontWeight: isSelected ? 600 : 450 }}>{cat.label}</span>
                            </div>
                            {isSelected && <Check size={12} style={{ color: "var(--accent-blue)" }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable Rows Pane */}
            <div
              className="custom-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              {activeSubTab === "personas" ? (
                filteredPersonas.length === 0 ? (
                  <EmptyState
                    icon={<Search size={18} />}
                    title="No matching results"
                    description="Try a different search term or clear your filters."
                    primaryAction={{
                      label: "Clear filters",
                      onClick: () => setSearchQuery(""),
                    }}
                  />
                ) : (
                  filteredPersonas.map((p) => {
                    const isSelected = p.id === activePersona?.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPersonaId(p.id)}
                        className="mac-list-row"
                        style={{
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: isSelected ? "var(--bg-hover)" : "transparent",
                          borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                          marginBottom: "3px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "var(--bg-control)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "12px",
                            fontWeight: 650,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            border: "1px solid var(--separator)",
                            flexShrink: 0,
                          }}
                        >
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            p.monogram || p.name.slice(0, 2)
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {p.name}
                            </div>
                            {p.syncStatus === "synced" && (
                              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", backgroundColor: "rgba(48, 209, 88, 0.15)", color: "var(--accent-green)", fontWeight: 600, flexShrink: 0 }}>
                                Synced
                              </span>
                            )}
                            {p.syncStatus === "syncing" && (
                              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", backgroundColor: "rgba(10, 132, 255, 0.15)", color: "var(--accent-blue)", fontWeight: 600, flexShrink: 0 }}>
                                Syncing…
                              </span>
                            )}
                            {p.syncStatus === "failed" && (
                              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", backgroundColor: "rgba(255, 69, 58, 0.15)", color: "var(--accent-red)", fontWeight: 600, flexShrink: 0 }}>
                                Failed
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "1px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {p.title} · {formatContextSetting(p.contextSetting)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : scenarios.length === 0 ? (
                <EmptyState
                  icon={<FilePlus size={18} />}
                  title="No scenarios yet"
                  description="Create a practice scenario in Studio to begin rehearsing."
                  primaryAction={{
                    label: "Create scenario",
                    onClick: () => openStudio("scenario"),
                  }}
                />
              ) : sortedScenarios.length === 0 ? (
                <EmptyState
                  icon={<Search size={18} />}
                  title="No matching results"
                  description="Try a different search term or clear your filters."
                  primaryAction={{
                    label: "Clear filters",
                    onClick: () => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    },
                  }}
                />
              ) : (
                sortedScenarios.map((sc) => {
                  const isSelected = sc.id === activeScenario?.id;
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className="mac-list-row"
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: isSelected ? "var(--bg-hover)" : "transparent",
                        borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                        marginBottom: "3px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <div style={{ marginTop: "2px", flexShrink: 0 }}>
                        <CategoryIcon category={sc.interactionType} size={15} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {sc.title}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          With {sc.personaName || sc.guestName || "Counterpart"} ({formatContextSetting(sc.contextSetting)})
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", backgroundColor: "var(--bg-control)", color: "var(--text-tertiary)" }}>
                            {sc.difficulty}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                            ~{sc.durationMinutes}m
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Detail View or Quiet Placeholder when search yields 0 matches */}
          <div
            className="custom-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              backgroundColor: "var(--bg-window)",
              padding: "24px 32px",
            }}
          >
            {activeSubTab === "personas" ? (
              activePersona ? (
                /* Persona Detail View */
                <div style={{ maxWidth: "680px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "var(--bg-control)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        border: "1.5px solid var(--separator)",
                        flexShrink: 0,
                      }}
                    >
                      {activePersona.avatarUrl ? (
                        <img src={activePersona.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        activePersona.monogram || activePersona.name.slice(0, 2)
                      )}
                    </div>
                    <div>
                      <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        {activePersona.name}
                      </h2>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {activePersona.title} · {formatContextSetting(activePersona.contextSetting)} · {activePersona.seniority}
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <Badge variant="neutral">{activePersona.seniority}</Badge>
                        {activePersona.pressureLevel && (
                          <Badge variant={activePersona.pressureLevel === "Intense" ? "red" : activePersona.pressureLevel === "High" ? "orange" : "blue"}>
                            {activePersona.pressureLevel} Pressure
                          </Badge>
                        )}
                        {activePersona.syncStatus === "synced" && (
                          <Badge variant="green">
                            Tavus PAL: {activePersona.tavusPalId || "Ready"}
                          </Badge>
                        )}
                        {activePersona.syncStatus === "syncing" && (
                          <Badge variant="blue">Syncing to Tavus…</Badge>
                        )}
                        {activePersona.syncStatus === "failed" && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Badge variant="red">PAL Sync Failed</Badge>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!activePersona.id) return;
                                setIsRetryingSync(true);
                                try {
                                  const res = await window.electronAPI?.personaRetrySync?.(activePersona.id);
                                  if (res) updatePersona(res);
                                } finally {
                                  setIsRetryingSync(false);
                                }
                              }}
                              disabled={isRetryingSync}
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-xs)",
                                backgroundColor: "var(--bg-control)",
                                border: "1px solid var(--separator)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                              }}
                            >
                              {isRetryingSync ? "Retrying…" : "Retry Sync"}
                            </button>
                          </div>
                        )}
                        {activePersona.syncStatus === "draft" && (
                          <Badge variant="neutral">Draft (Local)</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Greeting (if configured) */}
                  {activePersona.greeting && (
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                        Opening Line (Greeting)
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--text-primary)", fontStyle: "italic", margin: 0 }}>
                        &ldquo;{activePersona.greeting}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Persona Traits */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                      Temperament & Behavioral Traits
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {(activePersona.temperamentTraits || []).map((t, idx) => (
                        <span
                          key={`${t}-${idx}`}
                          style={{
                            fontSize: "11.5px",
                            padding: "3px 8px",
                            borderRadius: "var(--radius-xs)",
                            backgroundColor: "var(--bg-control)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--separator)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Backstory */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                      Professional Background
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                      {activePersona.backstory}
                    </p>
                  </div>

                  {/* Behavior Notes */}
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                      Dialogue & Rehearsal Dynamics
                    </div>
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--separator)",
                        fontSize: "12.5px",
                        color: "var(--text-primary)",
                        lineHeight: 1.45,
                      }}
                    >
                      {activePersona.communicationNotes}
                    </div>
                  </div>

                  {/* Compatible Scenarios to Practice */}
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "10px" }}>
                      Scenarios Featuring {activePersona.name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {scenarios
                        .filter((s) => s.personaId === activePersona.id || s.personaName === activePersona.name)
                        .map((sc) => (
                          <div
                            key={sc.id}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: "var(--bg-elevated)",
                              border: "1px solid var(--separator)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                {sc.title}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                                {sc.interactionType} · ~{sc.durationMinutes}m
                              </div>
                            </div>
                            <button
                              onClick={() => openBriefing(sc)}
                              className="mac-btn focus-ring"
                              style={{
                                padding: "6px 12px",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--accent-blue)",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Practice
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Quiet non-interactive placeholder (icon + line, no button) */
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: "var(--text-tertiary)",
                    userSelect: "none",
                  }}
                >
                  <Search size={22} style={{ opacity: 0.35 }} />
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                    No persona selected
                  </span>
                </div>
              )
            ) : activeScenario ? (
              /* Scenario Detail View */
              <div style={{ maxWidth: "700px" }}>
                {/* Header Action Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CategoryIcon category={activeScenario.interactionType} size={18} />
                    <Badge variant="neutral">{activeScenario.interactionType}</Badge>
                    <Badge variant={activeScenario.difficulty === "Advanced" ? "red" : activeScenario.difficulty === "Intermediate" ? "orange" : "blue"}>
                      {activeScenario.difficulty}
                    </Badge>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} />
                      ~{activeScenario.durationMinutes} min
                    </span>
                  </div>

                  <button
                    onClick={() => openBriefing(activeScenario)}
                    className="mac-btn focus-ring"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--accent-blue)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      boxShadow: "0 1px 3px rgba(10, 132, 255, 0.4)",
                      cursor: "pointer",
                    }}
                  >
                    <span>Start Practice</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
                  {activeScenario.title}
                </h1>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 24px 0" }}>
                  {activeScenario.summary}
                </p>

                {/* Counterpart Card */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--separator)",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-control)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "13px",
                      fontWeight: 650,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      border: "1px solid var(--separator)",
                      flexShrink: 0,
                    }}
                  >
                    {activeScenario.personaAvatarUrl ? (
                      <img src={activeScenario.personaAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      (activeScenario.personaName || activeScenario.guestName || "C").slice(0, 2)
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 650, color: "var(--text-primary)" }}>
                      {activeScenario.personaName || activeScenario.guestName || "Counterpart"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "1px" }}>
                      {activeScenario.seniority || "Participant"} · {formatContextSetting(activeScenario.contextSetting)} · {activeScenario.personaMood}
                    </div>
                  </div>
                </div>

                {/* Learning Objectives */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                    Learning Objectives
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(activeScenario.learningObjectives || []).map((obj, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <Target size={13} style={{ color: "var(--accent-blue)", marginTop: "2px", flexShrink: 0 }} />
                        <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                          {obj}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Challenges */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                    Key Challenges
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(activeScenario.keyChallenges || []).map((ch, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <span style={{ color: "var(--accent-orange)", fontSize: "13px", lineHeight: 1, marginTop: "2px" }}>•</span>
                        <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                          {ch}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Phrases */}
                {(activeScenario.recommendedPhrases || []).length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 650, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                      Recommended Phrases & Framing
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {(activeScenario.recommendedPhrases || []).map((phrase, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            fontSize: "12px",
                            fontStyle: "italic",
                            color: "var(--text-primary)",
                          }}
                        >
                          &ldquo;{phrase}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions for Mine Scenarios */}
                {activeSubTab === "mine" && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--separator)" }}>
                    <button
                      onClick={() => duplicateScenario(activeScenario.id)}
                      className="focus-ring hover-subtle"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <Copy size={13} />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => setScenarioToDelete(activeScenario)}
                      className="focus-ring hover-subtle"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        fontSize: "12px",
                        color: "var(--accent-red)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Quiet non-interactive placeholder (icon + line, no button) */
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "var(--text-tertiary)",
                  userSelect: "none",
                }}
              >
                <Search size={22} style={{ opacity: 0.35 }} />
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                  No scenario selected
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {scenarioToDelete && (
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
          onClick={() => setScenarioToDelete(null)}
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
                Delete Practice Scenario?
              </div>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 18px 0" }}>
              Are you sure you want to delete &ldquo;{scenarioToDelete.title}&rdquo;? This scenario will be permanently removed from your personal library.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setScenarioToDelete(null)}
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
                  deleteScenario(scenarioToDelete.id);
                  setScenarioToDelete(null);
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
                Delete Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
