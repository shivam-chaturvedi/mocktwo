import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../../context";
import { formatRoomNumber, getCompatibleGuests, type Guest, type GuestScenario } from "../../types";
import {
  ChevronDown,
  Check,
  Search,
  Shuffle,
  RotateCcw,
  Plus
} from "lucide-react";

export interface GuestPickerProps {
  scenario: GuestScenario;
  selectedGuest: Guest;
  onSelectGuest: (guest: Guest) => void;
  disabled?: boolean;
}

export const GuestPicker: React.FC<GuestPickerProps> = ({
  scenario,
  selectedGuest,
  onSelectGuest,
  disabled = false
}) => {
  const { guests, openStudio } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isShuffling, setIsShuffling] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Compute compatible guests
  const compatibleGuests = useMemo(() => {
    const list = getCompatibleGuests(scenario, guests);
    // Find default guest
    const defaultGuest = guests.find((g) => g.id === scenario.guestId || g.name === scenario.guestName);
    // Sort so default guest is first
    return list.slice().sort((a, b) => {
      if (defaultGuest && a.id === defaultGuest.id) return -1;
      if (defaultGuest && b.id === defaultGuest.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [scenario, guests]);

  const defaultGuest = useMemo(() => {
    return guests.find((g) => g.id === scenario.guestId || g.name === scenario.guestName) || compatibleGuests[0];
  }, [guests, scenario, compatibleGuests]);

  const isDefaultSelected = defaultGuest && selectedGuest.id === defaultGuest.id;
  const isSingleOption = compatibleGuests.length <= 1;

  // Filtered by search query
  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return compatibleGuests;
    const q = searchQuery.toLowerCase().trim();
    return compatibleGuests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.title.toLowerCase().includes(q) ||
        g.loyaltyTier.toLowerCase().includes(q) ||
        g.temperamentTraits.some((t) => t.toLowerCase().includes(q))
    );
  }, [compatibleGuests, searchQuery]);

  // Split into Hotel guests vs My guests
  const hotelGuests = useMemo(
    () => filteredGuests.filter((g) => g.source !== "Mine"),
    [filteredGuests]
  );
  const myGuests = useMemo(
    () => filteredGuests.filter((g) => g.source === "Mine"),
    [filteredGuests]
  );

  const flatVisibleGuests = useMemo(() => {
    return [...hotelGuests, ...myGuests];
  }, [hotelGuests, myGuests]);

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

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Keyboard navigation
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
      e.stopPropagation(); // Prevent closing the parent modal sheet!
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, flatVisibleGuests.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + flatVisibleGuests.length) % Math.max(1, flatVisibleGuests.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatVisibleGuests[highlightedIndex];
      if (target) {
        onSelectGuest(target);
        setIsOpen(false);
      }
    }
  };

  // Surprise Me action
  const handleSurpriseMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShuffling(true);
    const candidates = compatibleGuests.filter((g) => g.id !== selectedGuest.id);
    const pool = candidates.length > 0 ? candidates : compatibleGuests;
    const randomGuest = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      if (randomGuest) onSelectGuest(randomGuest);
      setIsShuffling(false);
      setIsOpen(false);
    }, 220);
  };

  // Reset to default action
  const handleResetToDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (defaultGuest) {
      onSelectGuest(defaultGuest);
    }
    setIsOpen(false);
  };

  // Open Studio to create new guest
  const handleCreateNewGuest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    openStudio("guest");
  };

  const getTraitColor = (trait: string) => {
    const t = trait.toLowerCase();
    if (t.includes("agitated") || t.includes("demanding") || t.includes("impatient") || t.includes("firm")) {
      return { bg: "rgba(255, 69, 58, 0.14)", text: "var(--accent-red)" };
    }
    if (t.includes("reserved") || t.includes("diplomatic") || t.includes("particular")) {
      return { bg: "rgba(10, 132, 255, 0.14)", text: "var(--accent-blue)" };
    }
    if (t.includes("warm") || t.includes("friendly") || t.includes("enthusiastic") || t.includes("receptive")) {
      return { bg: "rgba(48, 209, 88, 0.14)", text: "var(--accent-green)" };
    }
    return { bg: "rgba(255, 255, 255, 0.08)", text: "var(--text-secondary)" };
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
      onKeyDown={handleKeyDown}
    >
      {/* Selector Row (about 56px tall, matching dropdown controls) */}
      <div
        role="button"
        tabIndex={disabled || isSingleOption ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select guest persona, currently ${selectedGuest.name}`}
        onClick={() => {
          if (!disabled && !isSingleOption) setIsOpen((prev) => !prev);
        }}
        style={{
          minHeight: "56px",
          padding: "8px 12px",
          backgroundColor: isOpen ? "var(--bg-hover)" : "var(--bg-control)",
          border: isOpen ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled || isSingleOption ? "default" : "pointer",
          userSelect: "none",
          transition: "background-color 0.12s ease, border-color 0.12s ease",
          outline: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          {/* 40px Circular Avatar */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid var(--separator)",
              flexShrink: 0,
              backgroundColor: "var(--bg-window)",
              display: "grid",
              placeItems: "center",
              transform: isShuffling ? "rotate(18deg) scale(1.1)" : "rotate(0deg) scale(1)",
              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
          >
            {selectedGuest.avatarUrl ? (
              <img
                src={selectedGuest.avatarUrl}
                alt={selectedGuest.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, rgba(10, 132, 255, 0.35), rgba(191, 90, 242, 0.35))",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "13px",
                  fontWeight: 650,
                  color: "var(--text-primary)"
                }}
              >
                {selectedGuest.monogram || selectedGuest.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name & Secondary Description */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "14.5px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                title={selectedGuest.name}
              >
                {selectedGuest.name}
              </span>

              {isDefaultSelected && (
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 550,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "var(--text-secondary)",
                    letterSpacing: "0.02em"
                  }}
                >
                  Default
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
              title={`${formatRoomNumber(selectedGuest.roomNumber)} · ${selectedGuest.loyaltyTier} · ${selectedGuest.temperamentTraits.join(" & ") || selectedGuest.title}`}
            >
              {formatRoomNumber(selectedGuest.roomNumber)} · {selectedGuest.loyaltyTier} · {selectedGuest.temperamentTraits.join(" & ") || selectedGuest.title}
            </div>
          </div>
        </div>

        {/* Right Indicator: Chevron or Fixed label */}
        <div>
          {isSingleOption ? (
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Fixed for this scenario
            </span>
          ) : (
            <ChevronDown
              size={15}
              style={{
                color: "var(--text-tertiary)",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.16s ease"
              }}
            />
          )}
        </div>
      </div>

      {/* Popover Anchored Below Selector Row */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 1250,
            backgroundColor: "var(--bg-elevated)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--separator)",
            borderRadius: "12px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Search Header */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--separator)",
              backgroundColor: "rgba(255, 255, 255, 0.02)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 8px",
                height: "30px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-control)",
                border: "1px solid var(--separator)"
              }}
            >
              <Search size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search guests by name, tier, or trait…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "12px",
                  color: "var(--text-primary)"
                }}
              />
            </div>
          </div>

          {/* List of Compatible Guests */}
          <div
            ref={listRef}
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              padding: "4px"
            }}
          >
            {flatVisibleGuests.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--text-tertiary)"
                }}
              >
                No compatible guests found.
              </div>
            ) : (
              <>
                {/* Hotel Guests Section */}
                {hotelGuests.length > 0 && (
                  <div>
                    {myGuests.length > 0 && (
                      <div
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--text-tertiary)",
                          padding: "6px 8px 3px"
                        }}
                      >
                        Hotel guests
                      </div>
                    )}
                    {hotelGuests.map((guest) => {
                      const isSelected = guest.id === selectedGuest.id;
                      const isDefault = defaultGuest && guest.id === defaultGuest.id;
                      const itemIndex = flatVisibleGuests.findIndex((g) => g.id === guest.id);
                      const isHighlighted = highlightedIndex === itemIndex;

                      return (
                        <div
                          key={guest.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onSelectGuest(guest);
                            setIsOpen(false);
                          }}
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          style={{
                            height: "52px",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: isHighlighted ? "var(--bg-hover)" : "transparent",
                            cursor: "pointer",
                            transition: "background-color 0.1s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            {/* 32px Avatar */}
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: "1px solid var(--separator)",
                                flexShrink: 0,
                                backgroundColor: "var(--bg-window)"
                              }}
                            >
                              {guest.avatarUrl ? (
                                <img
                                  src={guest.avatarUrl}
                                  alt={guest.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "linear-gradient(135deg, rgba(10, 132, 255, 0.35), rgba(191, 90, 242, 0.35))",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: "11px",
                                    fontWeight: 650,
                                    color: "var(--text-primary)"
                                  }}
                                >
                                  {guest.monogram || guest.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Name & Meta */}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}
                                  title={guest.name}
                                >
                                  {guest.name}
                                </span>
                                {isDefault && (
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      padding: "1px 5px",
                                      borderRadius: "3px",
                                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                                      color: "var(--text-secondary)",
                                      fontWeight: 500
                                    }}
                                  >
                                    Default
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-secondary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}
                                  title={`${guest.title} · ${guest.loyaltyTier}`}
                                >
                                  {guest.title} · {guest.loyaltyTier}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Trait Chips & Checkmark */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              {guest.temperamentTraits.slice(0, 2).map((trait) => {
                                const color = getTraitColor(trait);
                                return (
                                  <span
                                    key={trait}
                                    style={{
                                      fontSize: "10px",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: color.bg,
                                      color: color.text,
                                      fontWeight: 500
                                    }}
                                  >
                                    {trait}
                                  </span>
                                );
                              })}
                            </div>

                            <div style={{ width: "16px", display: "grid", placeItems: "center" }}>
                              {isSelected && <Check size={14} style={{ color: "var(--accent-blue)" }} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* My Guests Section */}
                {myGuests.length > 0 && (
                  <div style={{ marginTop: "4px" }}>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-tertiary)",
                        padding: "6px 8px 3px"
                      }}
                    >
                      My guests
                    </div>
                    {myGuests.map((guest) => {
                      const isSelected = guest.id === selectedGuest.id;
                      const isDefault = defaultGuest && guest.id === defaultGuest.id;
                      const itemIndex = flatVisibleGuests.findIndex((g) => g.id === guest.id);
                      const isHighlighted = highlightedIndex === itemIndex;

                      return (
                        <div
                          key={guest.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onSelectGuest(guest);
                            setIsOpen(false);
                          }}
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          style={{
                            height: "52px",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: isHighlighted ? "var(--bg-hover)" : "transparent",
                            cursor: "pointer",
                            transition: "background-color 0.1s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: "1px solid var(--separator)",
                                flexShrink: 0,
                                backgroundColor: "var(--bg-window)"
                              }}
                            >
                              {guest.avatarUrl ? (
                                <img
                                  src={guest.avatarUrl}
                                  alt={guest.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "linear-gradient(135deg, rgba(10, 132, 255, 0.35), rgba(191, 90, 242, 0.35))",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: "11px",
                                    fontWeight: 650,
                                    color: "var(--text-primary)"
                                  }}
                                >
                                  {guest.monogram || guest.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}
                                  title={guest.name}
                                >
                                  {guest.name}
                                </span>
                                {isDefault && (
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      padding: "1px 5px",
                                      borderRadius: "3px",
                                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                                      color: "var(--text-secondary)",
                                      fontWeight: 500
                                    }}
                                  >
                                    Default
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-secondary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}
                                  title={`${guest.title} · ${guest.loyaltyTier}`}
                                >
                                  {guest.title} · {guest.loyaltyTier}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              {guest.temperamentTraits.slice(0, 2).map((trait) => {
                                const color = getTraitColor(trait);
                                return (
                                  <span
                                    key={trait}
                                    style={{
                                      fontSize: "10px",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: color.bg,
                                      color: color.text,
                                      fontWeight: 500
                                    }}
                                  >
                                    {trait}
                                  </span>
                                );
                              })}
                            </div>

                            <div style={{ width: "16px", display: "grid", placeItems: "center" }}>
                              {isSelected && <Check size={14} style={{ color: "var(--accent-blue)" }} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              borderTop: "1px solid var(--separator)",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(255, 255, 255, 0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handleSurpriseMe}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-blue)",
                  fontSize: "12px",
                  fontWeight: 550,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  padding: "4px 0"
                }}
              >
                <Shuffle size={13} />
                <span>Surprise me</span>
              </button>

              {!isDefaultSelected && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    padding: "4px 0"
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset to default</span>
                </button>
              )}
            </div>
          </div>

          {/* + New Guest... row */}
          <div
            onClick={handleCreateNewGuest}
            style={{
              borderTop: "1px solid var(--separator)",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(42, 42, 44, 0.4)",
              cursor: "pointer",
              transition: "background-color 0.12s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(42, 42, 44, 0.4)";
            }}
          >
            <Plus size={14} style={{ color: "var(--accent-blue)" }} />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--accent-blue)" }}>
              New Guest…
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
