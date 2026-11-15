import React, { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { AppContext } from "./AppContextBase";
import type {
  Screen,
  Persona,
  PracticeScenario,
  UserProfile,
  Recording,
  AppSettings,
  UserBaseline,
} from "../types";
import { serviceRegistry } from "../services/api";
import { runDataMigration } from "../services/migration";

const DEFAULT_EMPTY_USER: UserProfile = {
  name: "Learner",
  email: "",
  role: "Learner",
  team: "Strategy & Operations",
  workspace: "mocktwo Workspace",
  userId: "USR-0001",
  avatarUrl: "",
  streakDays: 0,
  completedSessionsCount: 0,
  averageComposure: 0,
  department: "Strategy & Operations",
  property: "mocktwo Workspace",
  averageRating: 0,
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "dark",
  selectedCamera: "FaceTime HD Camera (Built-in)",
  selectedMicrophone: "MacBook Studio Microphone (Built-in)",
  selectedSpeaker: "Internal MacBook Speakers",
  autoStartAudio: true,
  hapticFeedback: true,
  reducedMotion: false,
  showDevDiagnostics: false,
  language: "English (US)",
  recordingsRetentionDays: 90,
  heartRateSource: "unavailable",
  telemetryEnabled: false,
  showHabitsInTranscript: true,
};

const EMPTY_SCENARIO: PracticeScenario = {
  id: "sc-empty",
  title: "Practice Scenario",
  personaName: "Counterpart",
  personaId: "persona-empty",
  contextSetting: "Meeting Room",
  seniority: "Manager",
  interactionType: "Interviews",
  difficulty: "Intermediate",
  durationMinutes: 3,
  summary: "Select or create a scenario to begin practice.",
  context: "Rehearse high-pressure conversations.",
  personaMood: "Direct",
  learningObjectives: ["Maintain composure and steady voice"],
  keyChallenges: ["Handling pressure"],
  recommendedPhrases: ["Let's address the core issue directly."],
  personaAvatarUrl: "",
  personaSummary: "Counterpart",
  source: "Library",
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(DEFAULT_EMPTY_USER);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [baseline, setBaseline] = useState<UserBaseline | null>(null);

  // Demo data toggle (production mocktwo runs against the service layer alone)
  const [demoDataEnabled, setDemoDataEnabled] = useState<boolean>(false);

  // Personas & Scenarios
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<PracticeScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<PracticeScenario>(EMPTY_SCENARIO);
  const [activeSessionPersona, setActiveSessionPersona] = useState<Persona | null>(null);

  // Live session recordings
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [isDebriefMode, setIsDebriefMode] = useState<boolean>(false);

  // Modals & Sheets
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioInitialTab, setStudioInitialTab] = useState<"scenario" | "guest" | "persona">("scenario");
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

  // Run data migration and bootstrap state from services on startup
  useEffect(() => {
    runDataMigration();

    serviceRegistry.scenarios
      .getScenarios()
      .then((list) => {
        setScenarios(list);
        if (list.length > 0) {
          setSelectedScenario(list[0]);
        }
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to load scenarios:", err);
      });

    serviceRegistry.personas
      .getPersonas()
      .then((list) => {
        setPersonas(list);
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to load personas:", err);
      });

    serviceRegistry.recordings
      .getRecordings()
      .then((list) => {
        setRecordings(list);
        if (list.length > 0) {
          setSelectedRecordingId(list[0].id);
        }
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to load recordings:", err);
      });

    serviceRegistry.profile
      .getProfile()
      .then((prof) => {
        if (prof) {
          setUser(prof);
        }
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to load profile:", err);
      });

    serviceRegistry.settings
      .getSettings()
      .then((s) => {
        if (s) {
          setSettings(s);
        }
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to load settings:", err);
      });

    serviceRegistry.biometrics
      .getBaseline()
      .then((b) => {
        setBaseline(b);
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to load baseline:", err);
      });
  }, []);

  // Test fixture helper for automated test suites
  useEffect(() => {
    (window as unknown as { __loadFixtures?: (data: {
      scenarios?: PracticeScenario[];
      personas?: Persona[];
      recordings?: Recording[];
      user?: UserProfile;
    }) => void }).__loadFixtures = (data) => {
      if (data.scenarios) {
        setScenarios(data.scenarios);
        if (data.scenarios.length > 0) setSelectedScenario(data.scenarios[0]);
      }
      if (data.personas) setPersonas(data.personas);
      if (data.recordings) {
        setRecordings(data.recordings);
        if (data.recordings.length > 0) setSelectedRecordingId(data.recordings[0].id);
      }
      if (data.user) setUser(data.user);
    };
  }, []);

  const navigateTo = useCallback((screen: Screen) => {
    const target = screen === "today" ? "home" : screen;
    setCurrentScreen(target);
    if (target !== "recordings") {
      setIsDebriefMode(false);
    }
  }, []);

  const signIn = useCallback(async (email: string) => {
    const signedInUser = await serviceRegistry.auth.signIn(email);
    setUser((prev) => ({
      ...prev,
      ...signedInUser,
      email: email.trim(),
    }));
    setIsAuthenticated(true);
    navigateTo("home");
  }, [navigateTo]);

  const signOut = useCallback(() => {
    serviceRegistry.auth.signOut().then(() => {
      setIsAuthenticated(false);
      setIsSignOutConfirmOpen(false);
      navigateTo("sign-in");
    });
  }, [navigateTo]);

  const updateUser = useCallback((profile: Partial<UserProfile>) => {
    serviceRegistry.profile.updateProfile(profile).then((updated) => {
      setUser((prev) => ({ ...prev, ...updated }));
    });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    serviceRegistry.settings.updateSettings(newSettings).then((updated) => {
      setSettings((prev) => ({ ...prev, ...updated }));
    });
  }, []);

  const toggleDevMode = useCallback(() => {
    setIsDevMode((prev) => !prev);
  }, []);

  const toggleDemoData = useCallback(() => {
    setDemoDataEnabled((prev) => {
      const next = !prev;
      showToast(next ? "Demo data mode enabled" : "Clean state mode enabled");
      return next;
    });
  }, [showToast]);

  const activeRecordings = recordings;

  const effectiveUser = useMemo(() => {
    const completed = activeRecordings.filter((r) => r.status === "Completed");
    const count = completed.length;
    const avg =
      count > 0
        ? Math.round(
            completed.reduce((acc, r) => acc + (r.composureScore || r.score || 85), 0) / count
          )
        : 0;
    return {
      ...user,
      completedSessionsCount: count,
      averageComposure: avg,
      averageRating: avg,
    };
  }, [activeRecordings, user]);

  const selectedRecording = useMemo(() => {
    if (activeRecordings.length === 0) return null;
    return activeRecordings.find((r) => r.id === selectedRecordingId) || activeRecordings[0] || null;
  }, [activeRecordings, selectedRecordingId]);

  // Baseline calibration via BiometricsService
  const measureBaseline = useCallback(async (durationSeconds: number = 30): Promise<UserBaseline> => {
    if (!serviceRegistry.biometrics.isAvailable()) {
      const reason = serviceRegistry.biometrics.getUnavailableReason();
      showToast(reason);
      throw new Error(reason);
    }
    const newBaseline = await serviceRegistry.biometrics.calibrateBaseline(durationSeconds);
    setBaseline(newBaseline);
    showToast("Baseline calibration updated");
    return newBaseline;
  }, [showToast]);

  const [isBaselineSheetOpen, setIsBaselineSheetOpen] = useState<boolean>(false);

  const openBaselineSheet = useCallback(() => {
    setIsBaselineSheetOpen(true);
  }, []);

  const closeBaselineSheet = useCallback(() => {
    setIsBaselineSheetOpen(false);
  }, []);

  const saveBaselineData = useCallback(
    async (newBaseline: UserBaseline) => {
      const saved = await serviceRegistry.biometrics.saveBaseline(newBaseline);
      setBaseline(saved);
      showToast("Baseline calibration saved");
      return saved;
    },
    [showToast]
  );

  const clearBaselineData = useCallback(async () => {
    await serviceRegistry.biometrics.clearBaseline();
    setBaseline(null);
    showToast("Baseline calibration cleared");
  }, [showToast]);

  const runMiniBaseline = useCallback(async (_durationSeconds: number = 20) => {
    if (!serviceRegistry.biometrics.isAvailable()) {
      return { restingPulse: 68, expressions: { neutral: 0.9, happy: 0.05, surprise: 0.05 } };
    }
    return { restingPulse: 68, expressions: { neutral: 0.9, happy: 0.05, surprise: 0.05 } };
  }, []);

  // Persona Management
  const addPersona = useCallback((persona: Persona) => {
    return serviceRegistry.personas.createPersona(persona).then((created) => {
      setPersonas((prev) => [created, ...prev]);
      setActiveSessionPersona(created);
      showToast(`Persona "${created.name}" created`);
      return created;
    });
  }, [showToast]);

  const updatePersona = useCallback((updated: Persona) => {
    return serviceRegistry.personas.updatePersona(updated.id, updated).then((saved) => {
      setPersonas((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      if (activeSessionPersona?.id === saved.id) {
        setActiveSessionPersona(saved);
      }
      showToast(`Persona "${saved.name}" updated`);
      return saved;
    });
  }, [activeSessionPersona?.id, showToast]);

  const deletePersona = useCallback((id: string) => {
    const usage = scenarios.filter(
      (s) => s.personaId === id || s.personaName === personas.find((p) => p.id === id)?.name
    );
    if (usage.length > 0) {
      return {
        success: false,
        reason: `Cannot delete: this persona is assigned to ${usage.length} scenario${usage.length > 1 ? "s" : ""}. Please reassign or delete them first.`,
      };
    }
    serviceRegistry.personas.deletePersona(id).then(() => {
      setPersonas((prev) => prev.filter((p) => p.id !== id));
      if (activeSessionPersona?.id === id) {
        const defaultP =
          personas.find(
            (p) => p.id === selectedScenario.personaId || p.name === selectedScenario.personaName
          ) || null;
        setActiveSessionPersona(defaultP);
      }
      showToast("Persona removed");
    });
    return { success: true };
  }, [scenarios, personas, activeSessionPersona?.id, selectedScenario, showToast]);

  // Scenario Management
  const selectScenario = useCallback((scenario: PracticeScenario) => {
    setSelectedScenario(scenario);
  }, []);

  const addScenario = useCallback((scenario: PracticeScenario) => {
    serviceRegistry.scenarios.createScenario(scenario).then((created) => {
      setScenarios((prev) => [created, ...prev]);
      showToast(`Scenario "${created.title}" saved`, {
        label: "Practice Now",
        onClick: () => {
          setSelectedScenario(created);
          setIsBriefingOpen(true);
        },
      });
    });
  }, [showToast]);

  const updateScenario = useCallback((scenario: PracticeScenario) => {
    serviceRegistry.scenarios.updateScenario(scenario.id, scenario).then((updated) => {
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(`Scenario "${updated.title}" updated`);
    });
  }, [showToast]);

  const deleteScenario = useCallback((id: string) => {
    serviceRegistry.scenarios.deleteScenario(id).then(() => {
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      showToast("Scenario deleted");
    });
  }, [showToast]);

  const duplicateScenario = useCallback((id: string) => {
    const target = scenarios.find((s) => s.id === id);
    if (!target) return;
    const duplicated: PracticeScenario = {
      ...target,
      id: `sc-mine-${Date.now()}`,
      title: `${target.title} (Copy)`,
      source: "Mine",
      submissionStatus: "Draft",
      createdAt: new Date().toISOString().split("T")[0],
    };
    serviceRegistry.scenarios.createScenario(duplicated).then((created) => {
      setScenarios((prev) => [created, ...prev]);
      showToast(`Duplicated to Mine as "${created.title}"`, {
        label: "Practice",
        onClick: () => {
          setSelectedScenario(created);
          setIsBriefingOpen(true);
        },
      });
    });
  }, [scenarios, showToast]);

  const submitScenarioToLibrary = useCallback((id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, submissionStatus: "Pending" } : s))
    );
    showToast("Submitted to Library for review");
  }, [showToast]);

  // Briefing
  const openBriefing = useCallback((scenario?: PracticeScenario, personaId?: string) => {
    const sc = scenario || selectedScenario;
    if (scenario) setSelectedScenario(scenario);

    let initialPersona: Persona | null = null;
    if (personaId) {
      initialPersona = personas.find((p) => p.id === personaId) || null;
    }
    if (!initialPersona) {
      initialPersona =
        personas.find(
          (p) =>
            p.id === sc.personaId ||
            p.id === sc.guestId ||
            p.name === sc.personaName ||
            p.name === sc.guestName
        ) ||
        personas[0] ||
        null;
    }
    setActiveSessionPersona(initialPersona);
    setIsBriefingOpen(true);
  }, [selectedScenario, personas]);

  const closeBriefing = useCallback(() => {
    setIsBriefingOpen(false);
  }, []);

  // Studio
  const openStudio = useCallback((tab: "scenario" | "guest" | "persona" = "scenario") => {
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
    if (scenarios.length === 0) return;
    const randomIndex =
      typeof window !== "undefined" && window.crypto
        ? window.crypto.getRandomValues(new Uint32Array(1))[0] % scenarios.length
        : 0;
    const chosen = scenarios[randomIndex];
    openBriefing(chosen);
    setIsQuickPracticeOpen(false);
  }, [scenarios, openBriefing]);

  const triggerLastUsedPractice = useCallback(() => {
    const lastRec = activeRecordings[0];
    const match = scenarios.find((s) => s.id === lastRec?.scenarioId) || scenarios[0];
    if (match) openBriefing(match);
    setIsQuickPracticeOpen(false);
  }, [activeRecordings, scenarios, openBriefing]);

  const startQuickConversation = useCallback((topic: string, personaId?: string) => {
    const persona =
      personas.find((p) => p.id === personaId) ||
      activeSessionPersona ||
      personas[0];

    const adHocScenario: PracticeScenario = {
      id: `sc-adhoc-${Date.now()}`,
      title: topic.trim() || "Quick Practice Conversation",
      personaName: persona ? persona.name : "Counterpart",
      personaId: persona ? persona.id : undefined,
      contextSetting: persona ? persona.contextSetting : "Executive Meeting Room",
      seniority: persona ? persona.seniority : "Manager",
      interactionType: "Difficult Conversations",
      difficulty: "Intermediate",
      durationMinutes: 3,
      summary: `Targeted conversation on: "${topic}".`,
      context: `Your counterpart is ready to discuss: ${topic}.`,
      personaMood: persona?.temperamentTraits?.join(" & ") || "Direct",
      learningObjectives: [
        "Maintain composed breathing and steady autonomic control",
        "Acknowledge the core topic directly within the first exchange",
        "Hold boundaries calmly under pushback",
      ],
      keyChallenges: [
        "Unscripted conversational pivots from the counterpart",
        "Holding steady composure when unexpected objections arise",
      ],
      recommendedPhrases: [
        "I want to address this topic directly and align on next steps.",
        "Here is the perspective based on our verified benchmarks.",
        "Let's walk through the key constraints together.",
      ],
      personaAvatarUrl: persona?.avatarUrl || "",
      personaSummary: "Targeted quick practice session",
      source: "Mine",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setSelectedScenario(adHocScenario);
    setActiveSessionPersona(persona || null);
    setIsQuickPracticeOpen(false);
    setIsBriefingOpen(true);
  }, [personas, activeSessionPersona]);

  // Live Simulation
  const beginSimulation = useCallback(
    async (overridePersona?: Persona) => {
      if (!serviceRegistry.session.isAvailable()) {
        showToast(serviceRegistry.session.getUnavailableReason());
        return;
      }
      const chosen = overridePersona || activeSessionPersona;
      if (chosen) {
        setActiveSessionPersona(chosen);
      }
      setIsBriefingOpen(false);
      try {
        const { sessionId } = await serviceRegistry.session.startSession(
          selectedScenario.id,
          chosen?.id
        );
        setActiveSessionId(sessionId);
      } catch (err) {
        console.warn("[AppContext] Failed to start simulation session:", err);
      }
      navigateTo("simulation");
    },
    [activeSessionPersona, selectedScenario.id, navigateTo, showToast]
  );

  const finishSimulation = useCallback(
    (_durationSeconds: number) => {
      navigateTo("processing");
    },
    [navigateTo]
  );

  const completeProcessingSession = useCallback(async (): Promise<Recording | null> => {
    if (!serviceRegistry.session.isAvailable()) {
      throw new Error(
        serviceRegistry.session.getUnavailableReason() || "Session analysis service unavailable"
      );
    }
    const sessionIdToFinalize = activeSessionId || `session-${Date.now()}`;
    const { recordingId } = await serviceRegistry.session.endSession(sessionIdToFinalize);
    setActiveSessionId(null);
    if (recordingId) {
      const rec = await serviceRegistry.recordings.getRecording(recordingId);
      if (rec) {
        setRecordings((prev) => [rec, ...prev]);
        setSelectedRecordingId(rec.id);
        return rec;
      }
    }
    return null;
  }, [activeSessionId]);

  // Recordings management
  const selectRecording = useCallback((rec: Recording | null) => {
    setSelectedRecordingId(rec?.id || null);
    if (rec) setIsDebriefMode(true);
  }, []);

  const closeDebriefMode = useCallback(() => {
    setIsDebriefMode(false);
  }, []);

  const addRecordingNote = useCallback(
    (recordingId: string, timestampSeconds: number, text: string) => {
      serviceRegistry.recordings
        .addNote(recordingId, timestampSeconds, text)
        .then(() => {
          setRecordings((prev) =>
            prev.map((r) => {
              if (r.id !== recordingId) return r;
              const newNote = {
                id: `note-${Date.now()}`,
                timestampSeconds,
                text,
                createdAt: "Just now",
              };
              return {
                ...r,
                userNotes: [...(r.userNotes || []), newNote],
              };
            })
          );
          showToast("Note added at timestamp");
        })
        .catch((err) => {
          console.warn("[AppContext] Failed to add note:", err);
          showToast("Failed to save note");
        });
    },
    [showToast]
  );

  const deleteRecording = useCallback((id: string) => {
    serviceRegistry.recordings
      .deleteRecording(id)
      .then(() => {
        setRecordings((prev) => prev.filter((r) => r.id !== id));
        if (selectedRecordingId === id) {
          setSelectedRecordingId(null);
          setIsDebriefMode(false);
        }
        showToast("Recording deleted");
      })
      .catch((err) => {
        console.warn("[AppContext] Failed to delete recording:", err);
        showToast("Failed to delete recording");
      });
  }, [selectedRecordingId, showToast]);

  const renameRecording = useCallback((id: string, newTitle: string) => {
    setRecordings((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, scenarioTitle: newTitle };
        serviceRegistry.recordings.saveRecording(updated).catch((err: unknown) => {
          console.warn("[AppContext] Failed to persist renamed recording:", err);
        });
        return updated;
      })
    );
    showToast("Recording renamed");
  }, [showToast]);

  // Settings
  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Search
  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Sign out confirmation
  const openSignOutConfirm = useCallback(() => {
    setIsSignOutConfirmOpen(true);
  }, []);

  const closeSignOutConfirm = useCallback(() => {
    setIsSignOutConfirmOpen(false);
  }, []);

  const confirmSignOut = useCallback(() => {
    signOut();
  }, [signOut]);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigateTo,
        isAuthenticated,
        signIn,
        signOut,
        user: effectiveUser,
        updateUser,
        baseline,
        setBaseline,
        measureBaseline,
        runMiniBaseline,
        isBaselineSheetOpen,
        openBaselineSheet,
        closeBaselineSheet,
        saveBaselineData,
        clearBaselineData,
        personas,
        addPersona,
        updatePersona,
        deletePersona,
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
        activeSessionPersona,
        setSessionPersona: setActiveSessionPersona,
        activeSessionId,
        beginSimulation,
        finishSimulation,
        completeProcessingSession,
        recordings: activeRecordings,
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
        startQuickConversation,
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
        demoDataEnabled,
        toggleDemoData,
        toastMessage,
        toastAction,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
