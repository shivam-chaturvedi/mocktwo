import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../../context";
import { formatContextSetting, getCompatiblePersonas, type Persona, type PracticeScenario } from "../../types";
import { LazyAvatarImage } from "./LazyAvatarImage";
import {
  ChevronDown,
  Check,
  Search,
  Shuffle,
  RotateCcw,
  Plus,
} from "lucide-react";

export interface PersonaPickerProps {
  scenario?: PracticeScenario | null;
  selectedPersona?: Persona;
  selectedGuest?: Persona;
  onSelectPersona?: (persona: Persona) => void;
  onSelectGuest?: (persona: Persona) => void;
  disabled?: boolean;
}

export const PersonaPicker: React.FC<PersonaPickerProps> = ({
  scenario,
  selectedPersona,
  selectedGuest,
  onSelectPersona,
  onSelectGuest,
  disabled = false,
}) => {
  const currentPersona = selectedPersona || selectedGuest;
  const handleSelect = (persona: Persona) => {
    if (onSelectPersona) onSelectPersona(persona);
    if (onSelectGuest) onSelectGuest(persona);
  };
  const { personas, openStudio } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [isShuffling, setIsShuffling] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute compatible personas
  const compatiblePersonas = useMemo(() => {
    const list = getCompatiblePersonas(scenario, personas);
    const defaultPersona = personas.find(
      (p) =>
        p.id === scenario?.personaId ||
        p.id === scenario?.guestId ||
        p.name === scenario?.personaName ||
        p.name === scenario?.guestName
    );
    return list.slice().sort((a, b) => {
      if (defaultPersona && a.id === defaultPersona.id) return -1;
      if (defaultPersona && b.id === defaultPersona.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [scenario, personas]);

  const defaultPersona = useMemo(() => {
    return (
      personas.find(
        (p) =>
          p.id === scenario?.personaId ||
          p.id === scenario?.guestId ||
          p.name === scenario?.personaName ||
          p.name === scenario?.guestName
      ) || compatiblePersonas[0]
    );
  }, [personas, scenario, compatiblePersonas]);

  const isDefaultSelected = defaultPersona && currentPersona && currentPersona.id === defaultPersona.id;
  const isSingleOption = compatiblePersonas.length <= 1;

  // Filtered by search query
  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) return compatiblePersonas;
    const q = searchQuery.toLowerCase().trim();
    return compatiblePersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.seniority || "").toLowerCase().includes(q) ||
        p.temperamentTraits.some((t) => t.toLowerCase().includes(q))
    );
  }, [compatiblePersonas, searchQuery]);

  const libraryPersonas = useMemo(
    () => filteredPersonas.filter((p) => p.source !== "Mine"),
    [filteredPersonas]
  );
  const myPersonas = useMemo(
    () => filteredPersonas.filter((p) => p.source === "Mine"),
    [filteredPersonas]
  );

  const flatVisible = useMemo(() => {
    return [...libraryPersonas, ...myPersonas];
  }, [libraryPersonas, myPersonas]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        if (!isSingleOption && !disabled) setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, flatVisible.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + flatVisible.length) % Math.max(1, flatVisible.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatVisible[highlightedIndex];
      if (target) {
        handleSelect(target);
        setIsOpen(false);
      }
    }
  };

  const handleSurpriseMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShuffling(true);
    const curId = currentPersona?.id;
    const candidates = compatiblePersonas.filter((p) => p.id !== curId);
    const pool = candidates.length > 0 ? candidates : compatiblePersonas;
    const curIdx = pool.findIndex((p) => p.id === curId);
    const nextIdx = (curIdx + 1) % Math.max(1, pool.length);
    const nextPersona = pool[nextIdx] || pool[0];

    setTimeout(() => {
      if (nextPersona) handleSelect(nextPersona);
      setIsShuffling(false);
      setIsOpen(false);
    }, 200);
  };

  const handleResetToDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (defaultPersona) {
      handleSelect(defaultPersona);
    }
    setIsOpen(false);
  };

  const handleCreateNewPersona = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    openStudio("persona");
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
      onKeyDown={handleKeyDown}
    >
      {/* Selector Row */}
      <div
        role="button"
        tabIndex={disabled || isSingleOption ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select counterpart persona, currently ${currentPersona?.name || "Counterpart"}`}
        onClick={() => {
          if (!disabled && !isSingleOption) setIsOpen((prev) => !prev);
        }}
        className="focus-ring"
        style={{
          minHeight: "56px",
          padding: "8px 12px",
          backgroundColor: isOpen ? "var(--bg-hover)" : "var(--bg-control)",
          border: isOpen ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          cursor: disabled || isSingleOption ? "default" : "pointer",
          transition: "all 0.12s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <LazyAvatarImage
            src={currentPersona?.avatarUrl}
            name={currentPersona?.name || "Counterpart"}
            size={36}
          />

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentPersona?.name || "Select Persona"}
              </span>
              {isDefaultSelected && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  Default
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentPersona?.title || "Counterpart"} · {formatContextSetting(currentPersona?.contextSetting || currentPersona?.roomNumber || "")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {!isSingleOption && !disabled && (
            <ChevronDown
              size={14}
              style={{
                color: "var(--text-tertiary)",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
          )}
        </div>
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="glass-surface animate-sheet-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: "360px",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-dropdown)",
            border: "1px solid var(--separator)",
            padding: "8px",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search bar inside popover */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 8px",
              backgroundColor: "var(--bg-control)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--separator)",
              marginBottom: "8px",
            }}
          >
            <Search size={13} style={{ color: "var(--text-tertiary)" }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search personas by name, trait or role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: "12px",
                color: "var(--text-primary)",
                width: "100%",
              }}
            />
          </div>

          {/* Quick Actions (Surprise Me / Reset) */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "8px",
              paddingBottom: "8px",
              borderBottom: "1px solid var(--separator)",
            }}
          >
            <button
              onClick={handleSurpriseMe}
              disabled={isShuffling}
              className="hover-subtle"
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "4px 8px",
                borderRadius: "var(--radius-xs)",
                backgroundColor: "var(--bg-control)",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              <Shuffle size={11} style={{ color: "var(--accent-purple)" }} />
              <span>Surprise Me</span>
            </button>

            {!isDefaultSelected && defaultPersona && (
              <button
                onClick={handleResetToDefault}
                className="hover-subtle"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "var(--bg-control)",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                <RotateCcw size={11} />
                <span>Reset Default</span>
              </button>
            )}
          </div>

          {/* Persona Items List */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {flatVisible.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                No compatible personas found
              </div>
            ) : (
              <>
                {flatVisible.slice(0, visibleCount).map((persona) => {
                  const isSelected = currentPersona ? persona.id === currentPersona.id : false;
                  return (
                    <div
                      key={persona.id}
                      onClick={() => {
                        handleSelect(persona);
                        setIsOpen(false);
                      }}
                      className="hover-subtle"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: isSelected ? "var(--selection)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <LazyAvatarImage
                          src={persona.avatarUrl}
                          name={persona.name}
                          size={28}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "12.5px", fontWeight: 550, color: "var(--text-primary)" }}>
                            {persona.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                            {persona.title}
                          </div>
                        </div>
                      </div>

                      {isSelected && <Check size={14} style={{ color: "var(--accent-blue)" }} />}
                    </div>
                  );
                })}
                {flatVisible.length > visibleCount && (
                  <div style={{ padding: "4px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 20)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--accent-blue)",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-xs)",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      Load more ({flatVisible.length - visibleCount} more)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Create new in Studio footer */}
          <div
            style={{
              marginTop: "8px",
              paddingTop: "6px",
              borderTop: "1px solid var(--separator)",
            }}
          >
            <button
              onClick={handleCreateNewPersona}
              className="hover-subtle"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "6px",
                borderRadius: "var(--radius-xs)",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "var(--accent-blue)",
              }}
            >
              <Plus size={12} />
              <span>Create new persona in Studio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
