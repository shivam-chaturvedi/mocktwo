import React, { useState } from "react";
import { useApp } from "../context";
import { Badge } from "../components/common/Badge";
import { CategoryIcon } from "../components/common/CategoryIcon";
import {
  Search,
  Play,
  MoreHorizontal,
  Plus
} from "lucide-react";
import { formatRoomNumber, type InteractionType } from "../types";

export const ScenariosScreen: React.FC = () => {
  const {
    scenarios,
    guests,
    openBriefing,
    openStudio,
    duplicateScenario,
    deleteScenario,
    submitScenarioToLibrary,
    deleteGuest
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"library" | "mine" | "guests">("library");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recommended" | "newest" | "difficulty" | "duration">("recommended");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const categoryOptions: { label: string; type?: InteractionType; color: string }[] = [
    { label: "All", color: "var(--accent-blue)" },
    { label: "Escalation Management", type: "Escalation Management", color: "var(--accent-red)" },
    { label: "Concierge", type: "Concierge", color: "var(--accent-purple)" },
    { label: "Executive Lounge", type: "Executive Lounge", color: "var(--accent-teal)" },
    { label: "Front Desk", type: "Front Desk", color: "var(--accent-blue)" },
    { label: "Guest Services", type: "Guest Services", color: "var(--accent-green)" }
  ];

  // Filter Scenarios for Library vs Mine
  const libraryScenarios = scenarios.filter((s) => s.source !== "Mine");
  const mineScenarios = scenarios.filter((s) => s.source === "Mine");

  const currentScenariosList = activeSubTab === "mine" ? mineScenarios : libraryScenarios;

  const filteredScenarios = currentScenariosList.filter((s) => {
    const matchesCategory = selectedCategory === "All" || s.interactionType === selectedCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sorting
  const sortedScenarios = [...filteredScenarios].sort((a, b) => {
    if (sortBy === "duration") return a.durationMinutes - b.durationMinutes;
    if (sortBy === "difficulty") {
      const diffMap = { Foundational: 1, Intermediate: 2, Advanced: 3 };
      return diffMap[b.difficulty] - diffMap[a.difficulty];
    }
    return 0;
  });

  // Filter Guests
  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.loyaltyTier.toLowerCase().includes(q) ||
      g.temperamentTraits.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{ padding: "32px 40px 60px", maxWidth: "1180px", margin: "0 auto" }}
      onClick={() => {
        if (activeMenuId) setActiveMenuId(null);
      }}
    >
      {/* Top Header: Title + Sub-Tabs + Search & Actions */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.015em"
              }}
            >
              Scenarios & Guests
            </h1>

            {/* Sub-Tabs: Library | Mine | Guests */}
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
              {[
                { id: "library", label: "Library" },
                { id: "mine", label: `Mine (${mineScenarios.length})` },
                { id: "guests", label: `Guests (${guests.length})` }
              ].map((tab) => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "12px",
                      fontWeight: isActive ? 600 : 450,
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.12s ease"
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0 }}>
            {activeSubTab === "guests"
              ? "Manage realistic AI hospitality personas, temperaments, and vocal cadences."
              : activeSubTab === "mine"
              ? "Your private role-play practice situations and hotel library submissions."
              : "Master challenging guest dialogues across luxury hotel operations."}
          </p>
        </div>

        {/* Right Search & Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Search Box */}
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
              placeholder={activeSubTab === "guests" ? "Filter guests or traits…" : "Filter scenarios…"}
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

          {/* Sort Dropdown for Scenarios */}
          {activeSubTab !== "guests" && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
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
              <option value="recommended">Sort: Recommended</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="duration">Sort: Duration</option>
            </select>
          )}

          {/* Primary Create Button */}
          {activeSubTab === "guests" ? (
            <button
              onClick={() => openStudio("guest")}
              style={{
                height: "32px",
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-blue)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                border: "none",
                cursor: "pointer"
              }}
            >
              <Plus size={14} />
              <span>New Guest</span>
            </button>
          ) : (
            <button
              onClick={() => openStudio("scenario")}
              style={{
                height: "32px",
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-blue)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                border: "none",
                cursor: "pointer"
              }}
            >
              <Plus size={14} />
              <span>New Scenario</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips (Only for Scenarios) */}
      {activeSubTab !== "guests" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
            overflowX: "auto",
            paddingBottom: "4px"
          }}
        >
          {categoryOptions.map((opt) => {
            const isSelected = selectedCategory === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => setSelectedCategory(opt.label)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "12px",
                  fontWeight: isSelected ? 600 : 450,
                  color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  backgroundColor: isSelected ? "var(--bg-control)" : "transparent",
                  border: isSelected ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid var(--separator)",
                  boxShadow: isSelected ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "none",
                  transition: "all 0.12s ease",
                  whiteSpace: "nowrap",
                  cursor: "pointer"
                }}
              >
                {opt.type && <CategoryIcon category={opt.type} size={14} />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/* GUESTS TAB CONTENT */}
      {/* ================================================================ */}
      {activeSubTab === "guests" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px"
          }}
        >
          {filteredGuests.map((guest) => {
            const isMenuOpen = activeMenuId === guest.id;
            return (
              <div
                key={guest.id}
                className="glass-surface"
                style={{
                  borderRadius: "var(--radius-lg)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "240px",
                  border: "1px solid var(--separator)",
                  position: "relative"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "1px solid var(--separator)",
                          backgroundColor: "var(--bg-control)",
                          display: "grid",
                          placeItems: "center"
                        }}
                      >
                        {guest.avatarUrl ? (
                          <img src={guest.avatarUrl} alt={guest.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)" }}>
                            {guest.monogram}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 style={{ fontSize: "15.5px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                          {guest.name}
                        </h3>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {guest.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 500 }}>
                          {formatRoomNumber(guest.roomNumber)} · {guest.loyaltyTier}
                        </div>
                      </div>
                    </div>

                    {/* Context ⋯ Menu */}
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : guest.id);
                        }}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "var(--radius-sm)",
                          background: "none",
                          border: "none",
                          color: "var(--text-tertiary)",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer"
                        }}
                        className="hover-subtle"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="glass-surface animate-sheet-in"
                          style={{
                            position: "absolute",
                            top: "30px",
                            right: 0,
                            width: "180px",
                            padding: "4px",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "var(--shadow-dropdown)",
                            border: "1px solid var(--separator)",
                            zIndex: 40
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              openStudio("scenario");
                            }}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
                            className="hover-subtle"
                          >
                            Create Scenario with Guest
                          </button>
                          <button
                            onClick={() => {
                              const res = deleteGuest(guest.id);
                              if (!res.success) alert(res.reason);
                              setActiveMenuId(null);
                            }}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px", color: "var(--accent-red)" }}
                            className="hover-subtle"
                          >
                            Delete Guest
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Temperament Traits */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {guest.temperamentTraits.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "10.5px",
                          padding: "2px 7px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(255, 159, 10, 0.12)",
                          color: "var(--accent-orange)",
                          fontWeight: 500,
                          border: "1px solid rgba(255, 159, 10, 0.25)"
                        }}
                      >
                        {t}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: "10.5px",
                        padding: "2px 7px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-control)",
                        color: "var(--text-secondary)"
                      }}
                    >
                      {guest.language}
                    </span>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                    {guest.backstory}
                  </p>
                </div>

                {/* Footer: Used count & voice */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--separator)",
                    marginTop: "14px",
                    fontSize: "11.5px",
                    color: "var(--text-tertiary)"
                  }}
                >
                  <span>Used in {guest.scenariosCount} scenario{guest.scenariosCount !== 1 ? "s" : ""}</span>
                  <span>Voice: {guest.voice.split(" ")[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/* SCENARIOS TAB CONTENT (LIBRARY / MINE) */}
      {/* ================================================================ */}
      {activeSubTab !== "guests" && (
        <>
          {/* Empty state for Mine */}
          {activeSubTab === "mine" && mineScenarios.length === 0 ? (
            <div
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--separator)",
                padding: "60px 24px",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(10, 132, 255, 0.12)",
                  color: "var(--accent-blue)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px auto"
                }}
              >
                <Plus size={24} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
                Create your first scenario
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 20px auto" }}>
                Tailor private practice situations for challenging guest moments, or submit them to the Hotel Library.
              </p>
              <button
                onClick={() => openStudio("scenario")}
                style={{
                  height: "36px",
                  padding: "0 18px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent-blue)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                New Scenario
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "20px"
              }}
            >
              {sortedScenarios.map((scenario) => {
                const isMenuOpen = activeMenuId === scenario.id;
                const isMine = scenario.source === "Mine";

                return (
                  <div
                    key={scenario.id}
                    onClick={() => openBriefing(scenario)}
                    className="glass-surface mac-card-hoverable"
                    style={{
                      borderRadius: "var(--radius-lg)",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "260px",
                      cursor: "pointer",
                      border: "1px solid var(--separator)",
                      position: "relative"
                    }}
                  >
                    {/* Top Row: Category + Duration + Menu Button */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "10px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <CategoryIcon category={scenario.interactionType} size={15} />
                          <Badge variant="neutral" size="sm">
                            {scenario.interactionType}
                          </Badge>

                          {isMine && scenario.submissionStatus && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 650,
                                padding: "2px 6px",
                                borderRadius: "var(--radius-xs)",
                                backgroundColor:
                                  scenario.submissionStatus === "Approved"
                                    ? "rgba(48, 209, 88, 0.15)"
                                    : scenario.submissionStatus === "Pending"
                                    ? "rgba(255, 159, 10, 0.15)"
                                    : "rgba(255, 255, 255, 0.08)",
                                color:
                                  scenario.submissionStatus === "Approved"
                                    ? "var(--accent-green)"
                                    : scenario.submissionStatus === "Pending"
                                    ? "var(--accent-orange)"
                                    : "var(--text-tertiary)"
                              }}
                            >
                              {scenario.submissionStatus}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                            ~{scenario.durationMinutes} min
                          </span>

                          {/* "⋯" Card Menu */}
                          <div style={{ position: "relative" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : scenario.id);
                              }}
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "var(--radius-xs)",
                                background: "none",
                                border: "none",
                                color: "var(--text-tertiary)",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer"
                              }}
                              className="hover-subtle"
                            >
                              <MoreHorizontal size={14} />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="glass-surface animate-sheet-in"
                                style={{
                                  position: "absolute",
                                  top: "26px",
                                  right: 0,
                                  width: "190px",
                                  padding: "4px",
                                  borderRadius: "var(--radius-md)",
                                  boxShadow: "var(--shadow-dropdown)",
                                  border: "1px solid var(--separator)",
                                  zIndex: 40
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    duplicateScenario(scenario.id);
                                    setActiveMenuId(null);
                                  }}
                                  style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
                                  className="hover-subtle"
                                >
                                  Duplicate to Mine
                                </button>

                                {isMine && scenario.submissionStatus !== "Pending" && (
                                  <button
                                    onClick={() => {
                                      submitScenarioToLibrary(scenario.id);
                                      setActiveMenuId(null);
                                    }}
                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px" }}
                                    className="hover-subtle"
                                  >
                                    Submit to Hotel Library
                                  </button>
                                )}

                                {isMine && (
                                  <button
                                    onClick={() => {
                                      deleteScenario(scenario.id);
                                      setActiveMenuId(null);
                                    }}
                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", textAlign: "left", borderRadius: "4px", color: "var(--accent-red)" }}
                                    className="hover-subtle"
                                  >
                                    Delete Scenario
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 650,
                          color: "var(--text-primary)",
                          margin: "0 0 4px 0",
                          letterSpacing: "-0.015em"
                        }}
                      >
                        {scenario.title}
                      </h3>

                      <div
                        style={{
                          fontSize: "12.5px",
                          color: "var(--text-secondary)",
                          marginBottom: "8px",
                          fontWeight: 500
                        }}
                      >
                        {scenario.guestName} ({formatRoomNumber(scenario.roomNumber)}) • {scenario.loyaltyTier}
                      </div>

                      <p
                        style={{
                          fontSize: "12.5px",
                          color: "var(--text-secondary)",
                          lineHeight: 1.45,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {scenario.summary}
                      </p>
                    </div>

                    {/* Pinned Footer */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--separator)",
                        marginTop: "12px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          Mood:
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                          {scenario.guestMood}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--accent-blue)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Practice</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
