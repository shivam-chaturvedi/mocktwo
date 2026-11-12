import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import { AppContext } from "./AppContextBase";
import type {
  Screen,
  Guest,
  GuestScenario,
  EmployeeProfile,
  Recording,
  AppSettings
} from "../types";
import {
  INITIAL_EMPLOYEE,
  INITIAL_SETTINGS,
  INITIAL_GUESTS,
  INITIAL_SCENARIOS,
  INITIAL_RECORDINGS
} from "../data/mockData";

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("today");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [employee, setEmployee] = useState<EmployeeProfile>(INITIAL_EMPLOYEE);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [guests, setGuests] = useState<Guest[]>(INITIAL_GUESTS);
  const [scenarios, setScenarios] = useState<GuestScenario[]>(INITIAL_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<GuestScenario>(INITIAL_SCENARIOS[0]);
  const [activeSessionGuest, setActiveSessionGuest] = useState<Guest | null>(null);

  const [recordings, setRecordings] = useState<Recording[]>(INITIAL_RECORDINGS);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(INITIAL_RECORDINGS[0]);
  const [isDebriefMode, setIsDebriefMode] = useState<boolean>(false);

  // Modals & Sheets
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioInitialTab, setStudioInitialTab] = useState<"scenario" | "guest">("scenario");
  const [isQuickPracticeOpen, setIsQuickPracticeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);

  // Developer mode flag (⌥⌘D)
  const [isDevMode, setIsDevMode] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null);

  const showToast = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    setToastMessage(message);
    setToastAction(action || null);
    setTimeout(() => {
      setToastMessage(null);
      setToastAction(null);
    }, 4500);
  }, []);

  const navigateTo = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
    if (screen !== "recordings") {
      setIsDebriefMode(false);
    }
  }, []);

  const signIn = useCallback((email: string) => {
    setEmployee((prev) => ({
      ...prev,
      email: email.trim() || prev.email
    }));
    setIsAuthenticated(true);
    navigateTo("today");
  }, [navigateTo]);

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    setIsSignOutConfirmOpen(false);
    navigateTo("sign-in");
  }, [navigateTo]);

  const updateEmployee = useCallback((profile: Partial<EmployeeProfile>) => {
    setEmployee((prev) => ({ ...prev, ...profile }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const toggleDevMode = useCallback(() => {
    setIsDevMode((prev) => !prev);
  }, []);

  // Guest Management
  const addGuest = useCallback((guest: Guest) => {
    setGuests((prev) => [guest, ...prev]);
    // If briefing was open, select the newly created guest immediately
    setActiveSessionGuest(guest);
    showToast(`Guest "${guest.name}" created`);
  }, [showToast]);

  const updateGuest = useCallback((updated: Guest) => {
    setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    if (activeSessionGuest?.id === updated.id) {
      setActiveSessionGuest(updated);
    }
    showToast(`Guest "${updated.name}" updated`);
  }, [activeSessionGuest?.id, showToast]);

  const deleteGuest = useCallback((id: string) => {
    const usage = scenarios.filter((s) => s.guestId === id || s.guestName === guests.find((g) => g.id === id)?.name);
    if (usage.length > 0) {
      return {
        success: false,
        reason: `Cannot delete: this guest is assigned to ${usage.length} scenario${usage.length > 1 ? "s" : ""}. Please reassign or delete them first.`
      };
    }
    setGuests((prev) => prev.filter((g) => g.id !== id));
    // If active session guest was deleted, fall back to scenario default
    if (activeSessionGuest?.id === id) {
      const defaultG = guests.find((g) => g.id === selectedScenario.guestId || g.name === selectedScenario.guestName) || null;
      setActiveSessionGuest(defaultG);
    }
    showToast("Guest removed");
    return { success: true };
  }, [scenarios, guests, activeSessionGuest?.id, selectedScenario, showToast]);

  // Scenario Management
  const selectScenario = useCallback((scenario: GuestScenario) => {
    setSelectedScenario(scenario);
  }, []);

  const addScenario = useCallback((scenario: GuestScenario) => {
    setScenarios((prev) => [scenario, ...prev]);
    showToast(`Scenario "${scenario.title}" saved to Mine`, {
      label: "Practice Now",
      onClick: () => {
        setSelectedScenario(scenario);
        setIsBriefingOpen(true);
      }
    });
  }, [showToast]);

  const updateScenario = useCallback((scenario: GuestScenario) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenario.id ? scenario : s)));
    showToast(`Scenario "${scenario.title}" updated`);
  }, [showToast]);

  const deleteScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    showToast("Scenario deleted");
  }, [showToast]);

  const duplicateScenario = useCallback((id: string) => {
    const target = scenarios.find((s) => s.id === id);
    if (!target) return;
    const duplicated: GuestScenario = {
      ...target,
      id: `sc-mine-${Date.now()}`,
      title: `${target.title} (Copy)`,
      source: "Mine",
      submissionStatus: "Draft",
      createdAt: new Date().toISOString().split("T")[0]
    };
    setScenarios((prev) => [duplicated, ...prev]);
    showToast(`Duplicated to Mine as "${duplicated.title}"`, {
      label: "Practice",
      onClick: () => {
        setSelectedScenario(duplicated);
        setIsBriefingOpen(true);
      }
    });
  }, [scenarios, showToast]);

  const submitScenarioToLibrary = useCallback((id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, submissionStatus: "Pending" } : s))
    );
    showToast("Submitted to Hotel Library for manager review");
  }, [showToast]);

  // Briefing
  const openBriefing = useCallback((scenario?: GuestScenario, guestId?: string) => {
    const sc = scenario || selectedScenario;
    if (scenario) setSelectedScenario(scenario);

    // Resolve initial session guest: explicit guestId, or soft localStorage default, or scenario default
    let initialGuest: Guest | null = null;
    if (guestId) {
      initialGuest = guests.find((g) => g.id === guestId) || null;
    }
    if (!initialGuest) {
      try {
        const storedGuestId = localStorage.getItem(`hc_last_guest_${sc.id}`);
        if (storedGuestId) {
          initialGuest = guests.find((g) => g.id === storedGuestId) || null;
        }
      } catch {
        // ignore
      }
    }
    if (!initialGuest) {
      initialGuest = guests.find((g) => g.id === sc.guestId || g.name === sc.guestName) || guests[0] || null;
    }
    setActiveSessionGuest(initialGuest);
    setIsBriefingOpen(true);
  }, [selectedScenario, guests]);

  const closeBriefing = useCallback(() => {
    setIsBriefingOpen(false);
  }, []);

  // Studio
  const openStudio = useCallback((tab: "scenario" | "guest" = "scenario") => {
    setStudioInitialTab(tab);
    setIsStudioOpen(true);
  }, []);

  const closeStudio = useCallback(() => {
    setIsStudioOpen(false);
  }, []);

  // Quick Practice
  const openQuickPractice = useCallback(() => {
    setIsQuickPracticeOpen(true);
  }, []);

  const closeQuickPractice = useCallback(() => {
    setIsQuickPracticeOpen(false);
  }, []);

  const triggerRandomPractice = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * scenarios.length);
    const chosen = scenarios[randomIndex] || scenarios[0];
    openBriefing(chosen);
    setIsQuickPracticeOpen(false);
  }, [scenarios, openBriefing]);

  const triggerLastUsedPractice = useCallback(() => {
    const lastRec = recordings[0];
    const match = scenarios.find((s) => s.id === lastRec?.scenarioId) || scenarios[0];
    openBriefing(match);
    setIsQuickPracticeOpen(false);
  }, [recordings, scenarios, openBriefing]);

  // Live Simulation
  const beginSimulation = useCallback((overrideGuest?: Guest) => {
    const chosenGuest = overrideGuest || activeSessionGuest;
    if (chosenGuest) {
      setActiveSessionGuest(chosenGuest);
      try {
        localStorage.setItem(`hc_last_guest_${selectedScenario.id}`, chosenGuest.id);
      } catch {
        // ignore
      }
    }
    setIsBriefingOpen(false);
    navigateTo("simulation");
  }, [activeSessionGuest, selectedScenario.id, navigateTo]);

  const finishSimulation = useCallback((durationSeconds: number) => {
    navigateTo("processing");

    setTimeout(() => {
      const isTooShort = durationSeconds < 30;
      const score = isTooShort ? undefined : Math.min(96, Math.max(78, Math.round(85 + (Math.random() * 10 - 3))));
      
      const guestUsed = activeSessionGuest || guests.find((g) => g.id === selectedScenario.guestId) || {
        name: selectedScenario.guestName,
        avatarUrl: selectedScenario.guestAvatarUrl,
        roomNumber: selectedScenario.roomNumber,
        loyaltyTier: selectedScenario.loyaltyTier,
        temperamentTraits: [selectedScenario.guestMood],
        voice: "Alloy (Warm British)"
      };

      const newRec: Recording = {
        id: `rec-${Date.now()}`,
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        guestId: activeSessionGuest?.id,
        guestName: guestUsed.name,
        guestAvatarUrl: guestUsed.avatarUrl,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        relativeDate: "Just now",
        dateGroup: "Today",
        durationSeconds,
        score,
        status: isTooShort ? "Too short" : "Completed",
        mediaType: "video",
        transcript: [
          {
            id: `tr-${Date.now()}-1`,
            speaker: "Guest",
            text: selectedScenario.context || "Welcome to the Grand Palais.",
            timestampSeconds: 3
          },
          {
            id: `tr-${Date.now()}-2`,
            speaker: "You",
            text: selectedScenario.recommendedPhrases?.[0] || "I completely understand and will resolve this immediately.",
            timestampSeconds: 12
          },
          {
            id: `tr-${Date.now()}-3`,
            speaker: "Guest",
            text: "Thank you, that is exactly what I was hoping to hear.",
            timestampSeconds: 24
          }
        ],
        coachingNotes: isTooShort
          ? { whatWentWell: [], whatCouldBeBetter: [] }
          : {
              whatWentWell: [
                {
                  id: `cw-${Date.now()}-1`,
                  title: "Diplomatic Poise & Attentive Tone",
                  explanation: "Maintained steady luxury posture throughout conversation without showing hesitation.",
                  timestampSeconds: 12
                },
                {
                  id: `cw-${Date.now()}-2`,
                  title: "Clear Proactive Resolution",
                  explanation: "Formulated swift alternative accommodations aligned with five-star SOP.",
                  timestampSeconds: 20
                }
              ],
              whatCouldBeBetter: [
                {
                  id: `cb-${Date.now()}-1`,
                  title: "Elevate Courtesy Closing",
                  explanation: "Inquire about additional private dining or luggage preferences prior to concluding.",
                  timestampSeconds: 24
                }
              ]
            },
        competencies: {
          empathy: { name: "Empathy & Validation", score: isTooShort ? 0 : 92, assessment: "Empathetic listening." },
          professionalism: { name: "Professional Poise & Etiquette", score: isTooShort ? 0 : 94, assessment: "Diplomatic demeanor." },
          activeListening: { name: "Active Listening", score: isTooShort ? 0 : 88, assessment: "Captured core complaint." },
          problemSolving: { name: "Decisive Problem Solving", score: isTooShort ? 0 : 90, assessment: "Swift solution offered." },
          responseQuality: { name: "Response Quality & Articulation", score: isTooShort ? 0 : 91, assessment: "Refined vocabulary." }
        },
        analytics: {
          language: {
            fillerWordCount: isTooShort ? 0 : 1,
            fillerWordRate: isTooShort ? "0.0%" : "0.8%",
            fillerThresholdMessage: isTooShort ? "Insufficient duration." : "Optimal (< 2.0%).",
            weakWords: [],
            serviceVocabulary: ["Pleasure", "Personally", "Sanctuary", "Comfort"]
          },
          listening: {
            youPercentage: 45,
            guestPercentage: 55,
            youSeconds: Math.round(durationSeconds * 0.45),
            guestSeconds: Math.round(durationSeconds * 0.55),
            monologueCount: 0,
            questionsAsked: ["May I escort you to our private lounge?"]
          },
          delivery: {
            wordsPerMinute: 130,
            idealWpmRange: "125 - 145 WPM",
            paceRating: isTooShort ? "Incomplete" : "Ideal Calibrated Pace",
            pauseCount: 3,
            longestPauseSeconds: 1.6,
            toneEnergy: isTooShort ? "Incomplete" : "Calm & Centered"
          }
        },
        userNotes: [],
        guestResolutionSummary: isTooShort
          ? "Session ended early before resolution."
          : "Successful dialogue de-escalation with confirmed guest satisfaction."
      };

      setRecordings((prev) => [newRec, ...prev]);
      setSelectedRecording(newRec);
      setIsDebriefMode(true);
      navigateTo("recordings");

      if (!isTooShort) {
        setEmployee((prev) => ({
          ...prev,
          completedSessionsCount: prev.completedSessionsCount + 1,
          averageRating: Math.round((prev.averageRating * prev.completedSessionsCount + (score || 90)) / (prev.completedSessionsCount + 1))
        }));
      }
    }, 1200);
  }, [navigateTo, selectedScenario, activeSessionGuest, guests]);

  // Recordings
  const selectRecording = useCallback((rec: Recording | null) => {
    setSelectedRecording(rec);
  }, []);

  const closeDebriefMode = useCallback(() => {
    setIsDebriefMode(false);
  }, []);

  const addRecordingNote = useCallback((recordingId: string, timestampSeconds: number, text: string) => {
    setRecordings((prev) =>
      prev.map((r) => {
        if (r.id !== recordingId) return r;
        const newNote = {
          id: `un-${Date.now()}`,
          timestampSeconds,
          text: text.trim(),
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        return { ...r, userNotes: [...r.userNotes, newNote] };
      })
    );
    setSelectedRecording((prev) => {
      if (!prev || prev.id !== recordingId) return prev;
      const newNote = {
        id: `un-${Date.now()}`,
        timestampSeconds,
        text: text.trim(),
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      return { ...prev, userNotes: [...prev.userNotes, newNote] };
    });
    showToast("Timestamped note added to transcript");
  }, [showToast]);

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    setSelectedRecording((prev) => (prev?.id === id ? null : prev));
    showToast("Recording deleted");
  }, [showToast]);

  const renameRecording = useCallback((id: string, newTitle: string) => {
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, scenarioTitle: newTitle.trim() } : r))
    );
    setSelectedRecording((prev) => (prev?.id === id ? { ...prev, scenarioTitle: newTitle.trim() } : prev));
    showToast("Recording title updated");
  }, [showToast]);

  // Settings & Sign Out Modals
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const openSignOutConfirm = useCallback(() => setIsSignOutConfirmOpen(true), []);
  const closeSignOutConfirm = useCallback(() => setIsSignOutConfirmOpen(false), []);
  const confirmSignOut = useCallback(() => {
    setIsSignOutConfirmOpen(false);
    signOut();
  }, [signOut]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      // ⌘K Search
      if (isCmd && !isShift && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // ⌘, Settings
      if (isCmd && !isShift && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // ⌥⌘D Developer Mode
      if (isCmd && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDevMode();
        return;
      }

      // ⌘⇧P or ⌘P Quick Practice
      if (isCmd && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsQuickPracticeOpen(true);
        return;
      }

      // ⌘N New Scenario / ⌘⇧N New Guest
      if (isCmd && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openStudio(isShift ? "guest" : "scenario");
        return;
      }

      // ⌘1 - ⌘4 Tab Switching
      if (isCmd && !isShift && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case "1":
            navigateTo("today");
            break;
          case "2":
            navigateTo("scenarios");
            break;
          case "3":
            navigateTo("recordings");
            break;
          case "4":
            navigateTo("progress");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateTo, openStudio, toggleDevMode]);

  // Listen to IPC menu action from Electron main process
  useEffect(() => {
    const electronAPI = (window as unknown as { electronAPI?: { onMenuAction: (cb: (action: string) => void) => () => void } }).electronAPI;
    if (electronAPI?.onMenuAction) {
      const cleanup = electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case "tab-today":
            navigateTo("today");
            break;
          case "tab-scenarios":
            navigateTo("scenarios");
            break;
          case "tab-recordings":
            navigateTo("recordings");
            break;
          case "tab-progress":
            navigateTo("progress");
            break;
          case "new-scenario":
            openStudio("scenario");
            break;
          case "new-guest":
            openStudio("guest");
            break;
          case "quick-practice":
            openQuickPractice();
            break;
          case "open-search":
            setIsSearchOpen(true);
            break;
          case "open-settings":
            setIsSettingsOpen(true);
            break;
          case "sign-out":
            setIsSignOutConfirmOpen(true);
            break;
          case "start-recommended":
            if (currentScreen === "today") {
              setIsBriefingOpen(true);
            }
            break;
        }
      });
      return cleanup;
    }
  }, [navigateTo, currentScreen, openStudio, openQuickPractice]);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigateTo,
        isAuthenticated,
        signIn,
        signOut,
        employee,
        updateEmployee,
        guests,
        addGuest,
        updateGuest,
        deleteGuest,
        scenarios,
        selectedScenario,
        selectScenario,
        addScenario,
        updateScenario,
        deleteScenario,
        duplicateScenario,
        submitScenarioToLibrary,
        isBriefingOpen,
        openBriefing,
        closeBriefing,
        activeSessionGuest,
        setSessionGuest: setActiveSessionGuest,
        beginSimulation,
        finishSimulation,
        recordings,
        selectedRecording,
        selectRecording,
        isDebriefMode,
        closeDebriefMode,
        addRecordingNote,
        deleteRecording,
        renameRecording,
        isStudioOpen,
        studioInitialTab,
        openStudio,
        closeStudio,
        isQuickPracticeOpen,
        openQuickPractice,
        closeQuickPractice,
        triggerRandomPractice,
        triggerLastUsedPractice,
        settings,
        updateSettings,
        isSettingsOpen,
        openSettings,
        closeSettings,
        isSearchOpen,
        openSearch,
        closeSearch,
        isSignOutConfirmOpen,
        openSignOutConfirm,
        closeSignOutConfirm,
        confirmSignOut,
        isDevMode,
        toggleDevMode,
        toastMessage,
        toastAction,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
