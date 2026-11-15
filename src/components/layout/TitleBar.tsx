import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context";
import { MocktwoLogo } from "../common/MocktwoLogo";
import {
  Search,
  Settings,
  LogOut,
  Code2,
  Check,
  Plus,
  Zap,
  UserPlus,
  User,
  FilePlus,
  ChevronDown,
  Database,
} from "lucide-react";

export const TitleBar: React.FC = () => {
  const {
    currentScreen,
    navigateTo,
    user,
    openSettings,
    openSearch,
    openSignOutConfirm,
    openStudio,
    openQuickPractice,
    isDevMode,
    toggleDevMode,
    demoDataEnabled,
    toggleDemoData,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
      if (
        newMenuRef.current &&
        !newMenuRef.current.contains(target) &&
        newButtonRef.current &&
        !newButtonRef.current.contains(target)
      ) {
        setIsNewMenuOpen(false);
      }
    };
    if (isMenuOpen || isNewMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, isNewMenuOpen]);

  const tabs: { id: "home" | "scenarios" | "recordings" | "progress"; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "scenarios", label: "Scenarios" },
    { id: "recordings", label: "Recordings" },
    { id: "progress", label: "Progress" },
  ];

  return (
    <header
      className="titlebar-drag"
      style={{
        height: "52px",
        minHeight: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        borderBottom: "1px solid var(--separator)",
        backgroundColor: "var(--bg-window)",
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {/* Left: Traffic light clearance & mocktwo branding */}
      <div
        className="no-drag"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          paddingLeft: "72px",
        }}
      >
        <MocktwoLogo size={20} />
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontWeight: 650,
              fontSize: "13.5px",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
            }}
          >
            mocktwo
          </span>
        </div>
      </div>

      {/* Center: Apple-style Segmented Control (Home | Scenarios | Recordings | Progress) */}
      <nav
        className="no-drag"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          backgroundColor: "var(--bg-control)",
          padding: "3px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--separator)",
        }}
      >
        {tabs.map((tab) => {
          const isActive =
            currentScreen === tab.id || (tab.id === "home" && currentScreen === "today");
          return (
            <button
              key={tab.id}
              onClick={() => navigateTo(tab.id)}
              className="focus-ring"
              style={{
                padding: "4px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12.5px",
                fontWeight: isActive ? 600 : 450,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "none",
                transition: "all 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
                outline: "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right: + New, Quick Practice, Search ⌘K, Avatar */}
      <div
        className="no-drag"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          position: "relative",
        }}
      >
        {/* ＋ New Menu */}
        <div style={{ position: "relative" }}>
          <button
            ref={newButtonRef}
            onClick={() => setIsNewMenuOpen((prev) => !prev)}
            aria-label="New creation menu"
            title="Create Scenario or Persona (⌘N)"
            className="focus-ring"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              backgroundColor: isNewMenuOpen ? "var(--bg-hover)" : "var(--bg-control)",
              border: "1px solid var(--separator)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-primary)",
              transition: "all 0.12s ease",
            }}
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>New</span>
            <ChevronDown size={11} style={{ opacity: 0.6 }} />
          </button>

          {isNewMenuOpen && (
            <div
              ref={newMenuRef}
              className="glass-surface animate-sheet-in"
              style={{
                position: "absolute",
                top: "36px",
                right: 0,
                width: "190px",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-dropdown)",
                border: "1px solid var(--separator)",
                padding: "5px",
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  openStudio("scenario");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12.5px",
                  color: "var(--text-primary)",
                  textAlign: "left",
                }}
                className="hover-subtle"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FilePlus size={14} style={{ color: "var(--accent-blue)" }} />
                  <span>New Scenario</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  ⌘N
                </span>
              </button>

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  openStudio("persona");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12.5px",
                  color: "var(--text-primary)",
                  textAlign: "left",
                }}
                className="hover-subtle"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserPlus size={14} style={{ color: "var(--accent-green)" }} />
                  <span>New Persona</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  ⌘⇧N
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Practice Button */}
        <button
          onClick={openQuickPractice}
          aria-label="Quick Practice"
          title="Quick Practice Picker (⌘⇧P)"
          className="hover-subtle focus-ring"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            backgroundColor: "var(--bg-control)",
            border: "1px solid var(--separator)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--accent-orange)",
            transition: "all 0.12s ease",
          }}
        >
          <Zap size={13} strokeWidth={2.2} fill="var(--accent-orange)" />
          <span style={{ color: "var(--text-primary)" }}>Quick Practice</span>
        </button>

        {/* Search button with ⌘K badge */}
        <button
          onClick={openSearch}
          aria-label="Search scenarios"
          title="Search scenarios (⌘K)"
          className="hover-subtle focus-ring"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            backgroundColor: "var(--bg-control)",
            border: "1px solid var(--separator)",
            borderRadius: "var(--radius-sm)",
            fontSize: "11.5px",
            color: "var(--text-secondary)",
            transition: "all 0.12s ease",
          }}
        >
          <Search size={13} strokeWidth={1.8} />
          <span
            style={{
              fontSize: "10.5px",
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--bg-elevated)",
              padding: "1px 4px",
              borderRadius: "4px",
              border: "1px solid var(--separator)",
              color: "var(--text-tertiary)",
            }}
          >
            ⌘K
          </span>
        </button>

        {/* Circular Avatar Button */}
        <button
          ref={avatarButtonRef}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label="Account menu"
          className="focus-ring"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "var(--bg-control)",
            border: isMenuOpen ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
            boxShadow: isMenuOpen ? "0 0 0 2px rgba(10, 132, 255, 0.3)" : "none",
            display: "grid",
            placeItems: "center",
            fontSize: "11px",
            fontWeight: 650,
            color: "var(--text-primary)",
            cursor: "pointer",
            transition: "all 0.12s ease",
          }}
        >
          {!user.name || user.name.trim() === "" || user.name === "Learner" ? (
            <User size={13} strokeWidth={2} style={{ color: "var(--text-secondary)" }} />
          ) : (
            user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
          )}
        </button>

        {/* Account Menu Popover */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="glass-surface animate-sheet-in"
            style={{
              position: "absolute",
              top: "36px",
              right: 0,
              width: "240px",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-dropdown)",
              border: "1px solid var(--separator)",
              padding: "6px",
              zIndex: 100,
            }}
          >
            {/* User Identity Header */}
            <div
              style={{
                padding: "8px 10px 10px 10px",
                borderBottom: "1px solid var(--separator)",
                marginBottom: "5px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--text-secondary)",
                  marginTop: "1px",
                }}
              >
                {user.role}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-tertiary)",
                  marginTop: "2px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {user.email}
              </div>
            </div>

            {/* Preferences (⌘,) */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                openSettings();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12.5px",
                color: "var(--text-primary)",
                textAlign: "left",
              }}
              className="hover-subtle"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings size={14} style={{ color: "var(--text-secondary)" }} />
                <span>Preferences…</span>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ⌘,
              </span>
            </button>

            {/* Developer Diagnostics Flag */}
            <button
              onClick={() => {
                toggleDevMode();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12.5px",
                color: "var(--text-primary)",
                textAlign: "left",
              }}
              className="hover-subtle"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Code2 size={14} style={{ color: isDevMode ? "var(--accent-orange)" : "var(--text-secondary)" }} />
                <span>Developer Diagnostics</span>
              </div>
              {isDevMode && <Check size={13} style={{ color: "var(--accent-orange)" }} />}
            </button>

            {/* Demo Data Toggle (under isDevMode) */}
            {isDevMode && (
              <button
                onClick={() => {
                  toggleDemoData();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12.5px",
                  color: "var(--text-primary)",
                  textAlign: "left",
                  backgroundColor: demoDataEnabled ? "transparent" : "rgba(255, 159, 10, 0.1)",
                }}
                className="hover-subtle"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Database
                    size={14}
                    style={{ color: demoDataEnabled ? "var(--accent-green)" : "var(--accent-orange)" }}
                  />
                  <span>Demo data: {demoDataEnabled ? "On" : "Off (0 sessions)"}</span>
                </div>
                {demoDataEnabled && <Check size={13} style={{ color: "var(--accent-green)" }} />}
              </button>
            )}

            <div
              style={{
                height: "1px",
                backgroundColor: "var(--separator)",
                margin: "4px 0",
              }}
            />

            {/* Sign Out */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                openSignOutConfirm();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12.5px",
                color: "var(--accent-red)",
                textAlign: "left",
              }}
              className="hover-subtle"
            >
              <LogOut size={14} />
              <span>Sign Out…</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
