import React, { useState, useEffect } from "react";
import { useApp } from "../../context";
import {
  X,
  Check,
  User,
  FilePlus,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  CATEGORIES,
  DIFFICULTIES,
  type InteractionType,
  type DifficultyLevel,
  type SeniorityLevel,
} from "../../types";
import type { StudioScenarioInput } from "../../services/api/types";
import { LazyAvatarImage } from "./LazyAvatarImage";

const FieldInfoCard: React.FC<{
  title: string;
  description: string;
  onClose: () => void;
}> = ({ title, description, onClose }) => (
  <div
    style={{
      marginTop: "5px",
      marginBottom: "8px",
      padding: "8px 12px",
      borderRadius: "var(--radius-sm)",
      backgroundColor: "var(--bg-elevated)",
      border: "1px solid var(--accent-blue)",
      fontSize: "11.5px",
      lineHeight: 1.45,
      color: "var(--text-secondary)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontWeight: 650, color: "var(--accent-blue)", display: "flex", alignItems: "center", gap: "5px" }}>
        <Info size={12} />
        {title}
      </span>
      <button
        type="button"
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          padding: "2px",
          display: "inline-flex",
        }}
      >
        <X size={12} />
      </button>
    </div>
    <div style={{ color: "var(--text-primary)" }}>{description}</div>
  </div>
);

const FieldInfoButton: React.FC<{
  active: boolean;
  onClick: () => void;
}> = ({ active, onClick }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }}
    aria-label="What this does in character configuration"
    title="Click to learn what this property does"
    className="focus-ring"
    style={{
      border: "none",
      background: active ? "rgba(10, 132, 255, 0.2)" : "transparent",
      cursor: "pointer",
      padding: "2px",
      marginLeft: "5px",
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: active ? "var(--accent-blue)" : "var(--text-tertiary)",
      verticalAlign: "middle",
      transition: "all 0.15s ease",
    }}
  >
    <Info size={12} />
  </button>
);

const getSyncBadge = (status?: string) => {
  switch (status) {
    case "ready":
      return { label: "Ready", bg: "rgba(48, 209, 88, 0.15)", text: "var(--accent-green)" };
    case "failed":
      return { label: "Failed", bg: "rgba(255, 69, 58, 0.15)", text: "var(--accent-red)" };
    case "syncing":
      return { label: "Syncing", bg: "rgba(10, 132, 255, 0.15)", text: "var(--accent-blue)" };
    default:
      return { label: "Draft", bg: "var(--bg-control)", text: "var(--text-tertiary)" };
  }
};

const OBJECTIVE_SUGGESTIONS = [
  "Acknowledge the issue without being defensive",
  "Offer a concrete next step with a timeline",
  "Ask a clarifying question before proposing a solution",
  "Keep a steady pace and breathe before answering",
];

const FaceVideoThumbnail: React.FC<{
  videoUrl?: string;
  name: string;
  isSelected: boolean;
}> = ({ videoUrl, name, isSelected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isSelected || isHovered) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isSelected, isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        backgroundColor: "var(--bg-control)",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        fontSize: "13px",
        fontWeight: 700,
        color: "var(--text-primary)",
        border: "1px solid var(--separator)",
        flexShrink: 0,
      }}
    >
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted
          playsInline
          preload="none"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        (name || "AV").slice(0, 2).toUpperCase()
      )}
    </div>
  );
};

export const StudioSheet: React.FC = () => {
  const {
    isStudioOpen,
    studioInitialTab,
    closeStudio,
    saveStudioScenario,
    addPersona,
    personas,
  } = useApp();

  const [studioMode, setStudioMode] = useState<"scenario" | "persona">(
    studioInitialTab === "persona" ? "persona" : "scenario"
  );

  // Scenario Builder State
  const [manualStep, setManualStep] = useState<1 | 2 | 3 | 4>(1);
  const [manualPersonaId, setManualPersonaId] = useState<string>("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState<InteractionType>("Interviews");
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel>("Intermediate");
  const [manualContext, setManualContext] = useState("");
  const [manualChallenges, setManualChallenges] = useState<string[]>([]);
  const [manualObjectives, setManualObjectives] = useState<string[]>([]);
  const [manualOpeningLine, setManualOpeningLine] = useState("");
  const [scenarioSaveError, setScenarioSaveError] = useState<string | null>(null);

  // Persona Editor State
  const [personaName, setPersonaName] = useState("");
  const [personaTitle, setPersonaTitle] = useState("");
  const [personaSetting, setPersonaSetting] = useState("Executive Boardroom");
  const [personaSeniorty, setPersonaSeniorty] = useState<SeniorityLevel>("Senior Executive");
  const [personaTraits, setPersonaTraits] = useState<string[]>(["Skeptical", "Direct"]);
  const [personaVoice, setPersonaVoice] = useState("Echo (Direct American)");
  const [personaBackstory, setPersonaBackstory] = useState("");
  const [personaNotes, setPersonaNotes] = useState("");
  const [personaPressure, setPersonaPressure] = useState<"Moderate" | "High" | "Intense">("High");
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Avatar & Voice States
  const [isTavusConfigured, setIsTavusConfigured] = useState<boolean>(false);
  const [faces, setFaces] = useState<any[]>([]);
  const [visibleFaceCount, setVisibleFaceCount] = useState<number>(0);
  const [facePageSize, setFacePageSize] = useState<number>(0);
  const [isLoadingFaces, setIsLoadingFaces] = useState(false);

  useEffect(() => {
    window.electronAPI?.getClientConfig?.().then((cfg) => {
      if (cfg?.uiListPageSize) {
        setFacePageSize(cfg.uiListPageSize);
        setVisibleFaceCount(cfg.uiListPageSize);
      }
    });
  }, []);
  const facesLoadedRef = React.useRef<boolean>(false);
  const [selectedFaceId, setSelectedFaceId] = useState<string>("");
  const [selectedFaceName, setSelectedFaceName] = useState<string>("");
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [personaGreeting, setPersonaGreeting] = useState("");
  const [personaLanguageCode, setPersonaLanguageCode] = useState("en");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPatience, setCustomPatience] = useState<"high" | "medium" | "low">("medium");
  const [customInterruptibility, setCustomInterruptibility] = useState<"high" | "medium" | "low">("medium");
  const [allowCameraPerception, setAllowCameraPerception] = useState(false);
  const [showPromptPreviewModal, setShowPromptPreviewModal] = useState(false);
  const [livePromptInfo, setLivePromptInfo] = useState<{
    prompt: string;
    wordCount: number;
    warnings: string[];
    error: string | null;
  }>({ prompt: "", wordCount: 0, warnings: [], error: null });
  const [activeInfoField, setActiveInfoField] = useState<string | null>(null);

  // Check Tavus configuration on mount
  useEffect(() => {
    window.electronAPI?.tavusStatus?.()
      .then((res) => setIsTavusConfigured(Boolean(res?.configured)))
      .catch(() => setIsTavusConfigured(false));
  }, []);

  const handlePressureChange = (lvl: "Moderate" | "High" | "Intense") => {
    setPersonaPressure(lvl);
    if (lvl === "Moderate") {
      setCustomPatience("high");
      setCustomInterruptibility("high");
    } else if (lvl === "High") {
      setCustomPatience("medium");
      setCustomInterruptibility("medium");
    } else {
      setCustomPatience("low");
      setCustomInterruptibility("low");
    }
  };

  // Load stock faces & voices when in persona mode (safe, single-pass fetch)
  useEffect(() => {
    if (studioMode !== "persona" || !isTavusConfigured || facesLoadedRef.current) return;
    let isCancelled = false;
    setIsLoadingFaces(true);

    Promise.all([
      window.electronAPI?.tavusListFaces?.().catch(() => null),
      window.electronAPI?.tavusListVoices?.().catch(() => null),
    ])
      .then(([facesRes, voicesRes]) => {
        if (isCancelled) return;
        facesLoadedRef.current = true;
        if (facesRes && Array.isArray(facesRes.data)) {
          setFaces(facesRes.data);
          setVisibleFaceCount(facePageSize);
          if (facesRes.data.length > 0) {
            setSelectedFaceId((prev) => prev || facesRes.data[0].face_id);
            setSelectedFaceName((prev) => prev || facesRes.data[0].face_name || "Stock Avatar");
            if (facesRes.data[0].default_voice_id) {
              setSelectedVoiceId((prev) => prev || facesRes.data[0].default_voice_id);
            }
          }
        }
        if (voicesRes && Array.isArray(voicesRes.data)) {
          setVoices(voicesRes.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoadingFaces(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [studioMode, isTavusConfigured, facePageSize]);

  // Live prompt preview debouncer
  useEffect(() => {
    if (studioMode !== "persona") return;
    const timer = setTimeout(() => {
      const draft = {
        name: personaName,
        title: personaTitle,
        contextSetting: personaSetting,
        seniority: personaSeniorty,
        pressureLevel: personaPressure,
        temperamentTraits: personaTraits,
        backstory: personaBackstory,
        communicationNotes: personaNotes,
      };
      window.electronAPI?.personaPreviewPrompt?.(draft)
        .then((res) => {
          if (res) setLivePromptInfo(res);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [studioMode, personaName, personaTitle, personaSetting, personaSeniorty, personaPressure, personaTraits, personaBackstory, personaNotes]);

  const [prevIsOpen, setPrevIsOpen] = useState(isStudioOpen);
  if (isStudioOpen !== prevIsOpen) {
    setPrevIsOpen(isStudioOpen);
    if (isStudioOpen) {
      setStudioMode(studioInitialTab === "persona" ? "persona" : "scenario");
      setManualStep(1);
      setScenarioSaveError(null);
    }
  }

  const activePersonas = personas.filter((p) => !p.hidden);
  const assignedPersona = activePersonas.find((p) => p.id === manualPersonaId);

  const isStep1Valid = Boolean(assignedPersona);
  const isStep2Valid = manualTitle.trim().length >= 3 && manualTitle.trim().length <= 100;

  const validObjectives = manualObjectives.map((o) => o.trim()).filter(Boolean);
  const validChallenges = manualChallenges.map((c) => c.trim()).filter(Boolean);
  const isSituationValid = manualContext.trim().length >= 10 && manualContext.trim().length <= 2000;
  const isOpeningLineValid = manualOpeningLine.trim().length <= 160;
  const isStep3Valid = isSituationValid && validObjectives.length >= 1 && validObjectives.length <= 5 && isOpeningLineValid;

  const isFormDirty = Boolean(
    manualTitle.trim() ||
    manualContext.trim() ||
    manualChallenges.some((c) => c.trim()) ||
    manualObjectives.some((o) => o.trim()) ||
    manualOpeningLine.trim() ||
    personaName.trim() ||
    personaTitle.trim() ||
    personaBackstory.trim() ||
    personaNotes.trim()
  );

  const requestClose = React.useCallback(() => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      closeStudio();
    }
  }, [isFormDirty, closeStudio]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isStudioOpen) {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          requestClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStudioOpen, requestClose, showDiscardConfirm]);

  const handleSaveScenario = async () => {
    if (isSaving) return;
    if (!assignedPersona) {
      setScenarioSaveError("Please select a counterpart persona before saving.");
      setManualStep(1);
      return;
    }

    if (manualTitle.trim().length < 3 || manualTitle.trim().length > 100) {
      setScenarioSaveError("Scenario title must be between 3 and 100 characters.");
      setManualStep(2);
      return;
    }

    if (manualContext.trim().length < 10 || manualContext.trim().length > 2000) {
      setScenarioSaveError("Situation must be between 10 and 2000 characters.");
      setManualStep(3);
      return;
    }

    if (validObjectives.length < 1 || validObjectives.length > 5) {
      setScenarioSaveError("Please provide between 1 and 5 learning objectives.");
      setManualStep(3);
      return;
    }

    setIsSaving(true);
    setScenarioSaveError(null);

    try {
      const payload: StudioScenarioInput = {
        title: manualTitle.trim(),
        personaId: assignedPersona.id,
        interactionType: manualCategory,
        difficulty: manualDifficulty,
        context: manualContext.trim(),
        keyChallenges: validChallenges,
        learningObjectives: validObjectives,
        openingLine: manualOpeningLine.trim() || undefined,
      };

      await saveStudioScenario(payload);
      setManualTitle("");
      setManualContext("");
      setManualChallenges([]);
      setManualObjectives([]);
      setManualOpeningLine("");
      setManualStep(1);
      closeStudio();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save scenario.";
      setScenarioSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePersona = async () => {
    if (!personaName.trim() || isSaving) return;
    if (livePromptInfo.error) return;
    setIsSaving(true);

    const selectedFace = faces.find((f) => f.face_id === selectedFaceId);
    const newP: any = {
      name: personaName.trim(),
      avatarUrl: selectedFace?.thumbnail_video_url || undefined,
      monogram: personaName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      title: personaTitle.trim() || "Counterpart",
      contextSetting: personaSetting.trim() || "Executive Boardroom",
      seniority: personaSeniorty,
      language: personaLanguageCode || "en",
      temperamentTraits: personaTraits,
      voice: personaVoice,
      backstory: personaBackstory.trim(),
      communicationNotes: personaNotes.trim(),
      pressureLevel: personaPressure,
      source: "Mine",

      // Tavus PAL Integration Fields
      tavusFaceId: selectedFaceId || undefined,
      faceName: selectedFaceName || undefined,
      tavusVoiceId: selectedVoiceId || undefined,
      greeting: personaGreeting.trim() || undefined,
      palSettings: {
        turnTakingPatience: customPatience,
        palInterruptibility: customInterruptibility,
        perceptionModel: allowCameraPerception ? "raven-2" : "off",
      },
      syncStatus: isTavusConfigured && selectedFaceId ? "syncing" : "draft",
    };

    try {
      const saved = await addPersona(newP);
      setManualPersonaId(saved.id);
      setStudioMode("scenario");
      setManualStep(1);
      setPersonaName("");
      setPersonaTitle("");
      setPersonaBackstory("");
      setPersonaNotes("");
      setPersonaGreeting("");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isStudioOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
      onClick={requestClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "920px",
          height: "640px",
          maxHeight: "calc(100vh - 48px)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          border: "1px solid var(--separator)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Studio Sheet Header (Pinned) */}
        <div
          style={{
            height: "54px",
            flexShrink: 0,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)" }}>
              Scenario & Persona Studio
            </span>

            {/* Mode Tabs */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                backgroundColor: "var(--bg-control)",
                padding: "2px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--separator)",
              }}
            >
              <button
                type="button"
                onClick={() => setStudioMode("scenario")}
                className="focus-ring"
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "scenario" ? 600 : 450,
                  color: studioMode === "scenario" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "scenario" ? "var(--bg-elevated)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                <FilePlus size={12} style={{ color: "var(--accent-blue)" }} />
                <span>Scenario Builder</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioMode("persona")}
                className="focus-ring"
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "persona" ? 600 : 450,
                  color: studioMode === "persona" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "persona" ? "var(--bg-elevated)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                <User size={12} style={{ color: "var(--accent-green)" }} />
                <span>Persona Editor</span>
              </button>
            </div>
          </div>

          <button
            onClick={requestClose}
            aria-label="Close"
            className="hover-subtle focus-ring"
            style={{
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Studio Sheet Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {/* ============================================================ */}
          {/* SCENARIO BUILDER MODE */}
          {/* ============================================================ */}
          {studioMode === "scenario" && (
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              {/* Wizard Steps Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--separator)",
                }}
              >
                {[
                  { step: 1, label: "Persona" },
                  { step: 2, label: "Details" },
                  { step: 3, label: "Context & Goals" },
                  { step: 4, label: "Review" },
                ].map((s) => (
                  <div
                    key={s.step}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: manualStep === s.step ? 600 : 450,
                      color:
                        manualStep === s.step
                          ? "var(--accent-blue)"
                          : manualStep > s.step
                          ? "var(--text-primary)"
                          : "var(--text-tertiary)",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor:
                          manualStep === s.step
                            ? "var(--accent-blue)"
                            : manualStep > s.step
                            ? "var(--accent-green)"
                            : "var(--bg-control)",
                        color: "#ffffff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "10px",
                        fontWeight: 650,
                      }}
                    >
                      {manualStep > s.step ? <Check size={10} /> : s.step}
                    </div>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Select Persona */}
              {manualStep === 1 && (
                <div>
                  <div style={{ marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Step 1: Select Persona
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Choose the counterpart persona you will rehearse against.
                    </p>
                  </div>

                  {activePersonas.length === 0 ? (
                    <div
                      style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        backgroundColor: "var(--bg-elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px dashed var(--separator)",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          backgroundColor: "var(--bg-control)",
                          display: "grid",
                          placeItems: "center",
                          margin: "0 auto 14px",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <User size={22} />
                      </div>
                      <h4 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "6px" }}>
                        No personas yet
                      </h4>
                      <p
                        style={{
                          fontSize: "12.5px",
                          color: "var(--text-secondary)",
                          maxWidth: "420px",
                          margin: "0 auto 18px",
                          lineHeight: 1.45,
                        }}
                      >
                        Every scenario needs a counterpart to practice against. Create your first persona to get started.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStudioMode("persona")}
                        className="mac-btn focus-ring"
                        style={{
                          padding: "7px 16px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--accent-blue)",
                          color: "#ffffff",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Create Persona in Editor
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                      {activePersonas.map((p) => {
                        const isSelected = p.id === manualPersonaId;
                        const sync = getSyncBadge(p.syncStatus);
                        return (
                          <div
                            key={p.id}
                            onClick={() => setManualPersonaId(p.id)}
                            style={{
                              padding: "12px 14px",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: isSelected ? "var(--selection)" : "var(--bg-control)",
                              border: isSelected ? "1.5px solid var(--accent-blue)" : "1px solid var(--separator)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                              <LazyAvatarImage
                                src={p.avatarUrl}
                                name={p.name}
                                size={36}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 650,
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {p.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-secondary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    marginTop: "1px",
                                  }}
                                >
                                  {p.title} · {p.seniority}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--text-tertiary)",
                                    }}
                                  >
                                    Pressure: {p.pressureLevel || "Moderate"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      padding: "1px 6px",
                                      borderRadius: "8px",
                                      backgroundColor: sync.bg,
                                      color: sync.text,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {sync.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  backgroundColor: "var(--accent-blue)",
                                  color: "#ffffff",
                                  display: "grid",
                                  placeItems: "center",
                                  flexShrink: 0,
                                  marginLeft: "8px",
                                }}
                              >
                                <Check size={12} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isStep1Valid) setManualStep(2);
                      }}
                      disabled={!isStep1Valid}
                      aria-disabled={!isStep1Valid}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        opacity: isStep1Valid ? 1 : 0.45,
                        cursor: isStep1Valid ? "pointer" : "not-allowed",
                      }}
                    >
                      Next: Details →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {manualStep === 2 && (
                <div>
                  <div style={{ marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Step 2: Scenario Details
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Set the title, conversation category, and difficulty level.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "22px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                          Scenario Title *
                        </label>
                        <span
                          style={{
                            fontSize: "11px",
                            color: manualTitle.length > 100 ? "var(--accent-red)" : "var(--text-tertiary)",
                          }}
                        >
                          {manualTitle.length} / 100
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="E.g., Challenging Engineering Timeline Pushback"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          backgroundColor: "var(--bg-control)",
                          border: manualTitle.trim().length > 0 && manualTitle.trim().length < 3
                            ? "1px solid var(--accent-red)"
                            : "1px solid var(--separator)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                        }}
                      />
                      {manualTitle.trim().length > 0 && manualTitle.trim().length < 3 && (
                        <div style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "4px" }}>
                          Title must be at least 3 characters.
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          Category
                        </label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value as InteractionType)}
                          style={{
                            width: "100%",
                            padding: "8px 11px",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "12.5px",
                          }}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          Difficulty
                        </label>
                        <select
                          value={manualDifficulty}
                          onChange={(e) => setManualDifficulty(e.target.value as DifficultyLevel)}
                          style={{
                            width: "100%",
                            padding: "8px 11px",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "12.5px",
                          }}
                        >
                          {DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={() => setManualStep(1)}
                      className="hover-subtle"
                      style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", border: "none", background: "none", cursor: "pointer" }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isStep2Valid) setManualStep(3);
                      }}
                      disabled={!isStep2Valid}
                      aria-disabled={!isStep2Valid}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        opacity: isStep2Valid ? 1 : 0.45,
                        cursor: isStep2Valid ? "pointer" : "not-allowed",
                      }}
                    >
                      Next: Context & Goals →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Context & Goals */}
              {manualStep === 3 && (
                <div>
                  <div style={{ marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Step 3: Context & Goals
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Define the situation, counterpart challenges, and your learning objectives.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "22px" }}>
                    {/* a) What is the situation? */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                          What is the situation? *
                        </label>
                        <span
                          style={{
                            fontSize: "11px",
                            color: manualContext.length > 2000 ? "var(--accent-red)" : "var(--text-tertiary)",
                          }}
                        >
                          {manualContext.length} / 2000
                        </span>
                      </div>
                      <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Describe what has happened and the mood when the conversation begins.
                      </p>
                      <textarea
                        rows={4}
                        placeholder="E.g., A long-term client received a renewal invoice with a surprise 20% surcharge. They are frustrated and have asked for an urgent call."
                        value={manualContext}
                        onChange={(e) => setManualContext(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          backgroundColor: "var(--bg-control)",
                          border: manualContext.trim().length > 0 && manualContext.trim().length < 10
                            ? "1px solid var(--accent-red)"
                            : "1px solid var(--separator)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)",
                          fontSize: "12.5px",
                          lineHeight: 1.45,
                        }}
                      />
                      {manualContext.trim().length > 0 && manualContext.trim().length < 10 && (
                        <div style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "4px" }}>
                          Situation must be at least 10 characters.
                        </div>
                      )}
                    </div>

                    {/* b) How will the counterpart challenge you? */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                          How will the counterpart challenge you? <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(optional)</span>
                        </label>
                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          {manualChallenges.length} / 5
                        </span>
                      </div>
                      <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Objections, demands or traps they will press on.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "6px" }}>
                        {manualChallenges.map((challenge, i) => (
                          <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              value={challenge}
                              placeholder="E.g., Threatens to cancel the contract unless a credit is issued today."
                              onChange={(e) => {
                                const next = [...manualChallenges];
                                next[i] = e.target.value;
                                setManualChallenges(next);
                              }}
                              style={{
                                flex: 1,
                                padding: "7px 10px",
                                backgroundColor: "var(--bg-control)",
                                border: "1px solid var(--separator)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setManualChallenges(manualChallenges.filter((_, idx) => idx !== i))}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--accent-red)",
                                cursor: "pointer",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                              aria-label="Remove challenge"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      {manualChallenges.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setManualChallenges([...manualChallenges, ""])}
                          style={{
                            fontSize: "12px",
                            color: "var(--accent-blue)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 0",
                            fontWeight: 550,
                          }}
                        >
                          + Add challenge
                        </button>
                      )}
                    </div>

                    {/* c) What are you trying to achieve? */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                          What are you trying to achieve? *
                        </label>
                        <span style={{ fontSize: "11px", color: validObjectives.length === 0 ? "var(--accent-orange)" : "var(--text-tertiary)" }}>
                          {validObjectives.length} / 5
                        </span>
                      </div>
                      <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Concrete behaviors you want to practice in this conversation (1 to 5).
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                        {manualObjectives.map((obj, i) => (
                          <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              value={obj}
                              placeholder="E.g., Acknowledge the error without making excuses."
                              onChange={(e) => {
                                const next = [...manualObjectives];
                                next[i] = e.target.value;
                                setManualObjectives(next);
                              }}
                              style={{
                                flex: 1,
                                padding: "7px 10px",
                                backgroundColor: "var(--bg-control)",
                                border: "1px solid var(--separator)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setManualObjectives(manualObjectives.filter((_, idx) => idx !== i))}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--accent-red)",
                                cursor: "pointer",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                              aria-label="Remove objective"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {manualObjectives.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setManualObjectives([...manualObjectives, ""])}
                          style={{
                            fontSize: "12px",
                            color: "var(--accent-blue)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 0",
                            fontWeight: 550,
                            marginBottom: "10px",
                            display: "block",
                          }}
                        >
                          + Add objective
                        </button>
                      )}

                      {/* Suggestion chips */}
                      <div style={{ marginTop: "4px" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                          Suggestions (click to add):
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {OBJECTIVE_SUGGESTIONS.map((suggestion) => {
                            const isAdded = manualObjectives.includes(suggestion);
                            const isFull = manualObjectives.length >= 5;
                            const disabled = isAdded || isFull;
                            return (
                              <button
                                key={suggestion}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (!disabled) {
                                    setManualObjectives([...manualObjectives, suggestion]);
                                  }
                                }}
                                style={{
                                  fontSize: "11px",
                                  padding: "4px 9px",
                                  borderRadius: "var(--radius-full)",
                                  backgroundColor: isAdded ? "var(--bg-elevated)" : "var(--bg-control)",
                                  border: isAdded ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                                  color: isAdded ? "var(--accent-blue)" : "var(--text-secondary)",
                                  cursor: disabled ? "default" : "pointer",
                                  opacity: disabled && !isAdded ? 0.45 : 1,
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {isAdded ? `✓ ${suggestion}` : `+ ${suggestion}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* d) Counterpart's opening line */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                          Counterpart's opening line <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(optional)</span>
                        </label>
                        <span
                          style={{
                            fontSize: "11px",
                            color: manualOpeningLine.length > 160 ? "var(--accent-red)" : "var(--text-tertiary)",
                          }}
                        >
                          {manualOpeningLine.length} / 160
                        </span>
                      </div>
                      <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Spoken by the counterpart when the session starts. Keep it short.
                      </p>
                      <input
                        type="text"
                        placeholder="E.g., I have emailed you twice. Can you explain this invoice?"
                        value={manualOpeningLine}
                        onChange={(e) => setManualOpeningLine(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          backgroundColor: "var(--bg-control)",
                          border: manualOpeningLine.length > 160 ? "1px solid var(--accent-red)" : "1px solid var(--separator)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)",
                          fontSize: "12.5px",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={() => setManualStep(2)}
                      className="hover-subtle"
                      style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", border: "none", background: "none", cursor: "pointer" }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isStep3Valid) setManualStep(4);
                      }}
                      disabled={!isStep3Valid}
                      aria-disabled={!isStep3Valid}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        opacity: isStep3Valid ? 1 : 0.45,
                        cursor: isStep3Valid ? "pointer" : "not-allowed",
                      }}
                    >
                      Next: Review →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {manualStep === 4 && (
                <div>
                  <div style={{ marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Step 4: Review & Save
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Review your scenario details before finalizing.
                    </p>
                  </div>

                  {scenarioSaveError && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(255, 69, 58, 0.12)",
                        border: "1px solid rgba(255, 69, 58, 0.3)",
                        color: "var(--accent-red)",
                        fontSize: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{scenarioSaveError}</span>
                    </div>
                  )}

                  <div
                    style={{
                      padding: "18px 20px",
                      backgroundColor: "var(--bg-elevated)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--separator)",
                      marginBottom: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {/* Persona summary */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--separator)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <LazyAvatarImage
                          src={assignedPersona?.avatarUrl}
                          name={assignedPersona?.name || "Persona"}
                          size={32}
                        />
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
                            {assignedPersona?.name || "No persona selected"}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                            {assignedPersona ? `${assignedPersona.title} · ${assignedPersona.contextSetting}` : "Click Edit to select a counterpart"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualStep(1)}
                        style={{ fontSize: "11.5px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 550 }}
                      >
                        Edit
                      </button>
                    </div>

                    {/* Scenario Title & Pills */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)" }}>
                          {manualTitle.trim() || "Untitled Scenario"}
                        </div>
                        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor: "var(--bg-control)",
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {manualCategory}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                manualDifficulty === "Advanced"
                                  ? "rgba(255, 69, 58, 0.15)"
                                  : manualDifficulty === "Intermediate"
                                  ? "rgba(255, 159, 10, 0.15)"
                                  : "rgba(10, 132, 255, 0.15)",
                              color:
                                manualDifficulty === "Advanced"
                                  ? "var(--accent-red)"
                                  : manualDifficulty === "Intermediate"
                                  ? "var(--accent-orange)"
                                  : "var(--accent-blue)",
                              fontWeight: 600,
                            }}
                          >
                            {manualDifficulty}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualStep(2)}
                        style={{ fontSize: "11.5px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 550 }}
                      >
                        Edit
                      </button>
                    </div>

                    {/* Situation Narrative */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--separator)" }}>
                      <div style={{ flex: 1, paddingRight: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                          Situation
                        </div>
                        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                          {manualContext.trim() || "No situation provided."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualStep(3)}
                        style={{ fontSize: "11.5px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 550 }}
                      >
                        Edit
                      </button>
                    </div>

                    {/* Challenges */}
                    {validChallenges.length > 0 && (
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--separator)" }}>
                        <div style={{ flex: 1, paddingRight: "16px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                            Counterpart Challenges
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            {validChallenges.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualStep(3)}
                          style={{ fontSize: "11.5px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 550 }}
                        >
                          Edit
                        </button>
                      </div>
                    )}

                    {/* Learning Objectives */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--separator)" }}>
                      <div style={{ flex: 1, paddingRight: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                          Learning Objectives
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {validObjectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualStep(3)}
                        style={{ fontSize: "11.5px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 550 }}
                      >
                        Edit
                      </button>
                    </div>

                    {/* Opening Line */}
                    {manualOpeningLine.trim() && (
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--separator)" }}>
                        <div style={{ flex: 1, paddingRight: "16px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                            Counterpart's Opening Line
                          </div>
                          <div style={{ fontSize: "12px", fontStyle: "italic", color: "var(--text-primary)" }}>
                            "{manualOpeningLine.trim()}"
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualStep(3)}
                          style={{ fontSize: "11.5px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 550 }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={() => setManualStep(3)}
                      className="hover-subtle"
                      style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", border: "none", background: "none", cursor: "pointer" }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveScenario}
                      disabled={isSaving || !assignedPersona || !isStep2Valid || !isStep3Valid}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 22px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        opacity: isSaving || !assignedPersona || !isStep2Valid || !isStep3Valid ? 0.45 : 1,
                        cursor: isSaving || !assignedPersona || !isStep2Valid || !isStep3Valid ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isSaving && <Loader2 size={13} className="spin" />}
                      <span>{isSaving ? "Saving scenario..." : "Save"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* PERSONA EDITOR MODE */}
          {/* ============================================================ */}
          {studioMode === "persona" && (
            <div style={{ maxWidth: "740px", margin: "0 auto", paddingBottom: "24px" }}>
              {/* Top Status & Metrics Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  marginBottom: "16px",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: livePromptInfo.error
                        ? "var(--accent-red)"
                        : livePromptInfo.warnings.length > 0
                        ? "var(--accent-orange)"
                        : "var(--text-secondary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {livePromptInfo.error ? (
                      <AlertTriangle size={13} />
                    ) : livePromptInfo.warnings.length > 0 ? (
                      <AlertCircle size={13} />
                    ) : (
                      <FileText size={13} style={{ color: "var(--accent-blue)" }} />
                    )}
                    {livePromptInfo.wordCount} / 500 words
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPromptPreviewModal(true)}
                  className="hover-subtle focus-ring"
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 500,
                    color: "var(--accent-blue)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid rgba(10, 132, 255, 0.25)",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}
                >
                  <Eye size={12} />
                  <span>Preview Prompt</span>
                </button>
              </div>

              {/* Warning Banner if over 500 words */}
              {livePromptInfo.warnings.length > 0 && !livePromptInfo.error && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 159, 10, 0.12)",
                    border: "1px solid rgba(255, 159, 10, 0.3)",
                    color: "var(--accent-orange)",
                    fontSize: "12px",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{livePromptInfo.warnings[0]}</span>
                </div>
              )}

              {/* Error Banner if over 700 words */}
              {livePromptInfo.error && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 69, 58, 0.12)",
                    border: "1px solid rgba(255, 69, 58, 0.3)",
                    color: "var(--accent-red)",
                    fontSize: "12px",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>{livePromptInfo.error}</span>
                </div>
              )}

              {/* Form Row 1: Name and Title */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Persona Full Name <span style={{ color: "var(--accent-red)", marginLeft: "2px" }}>*</span>
                    <FieldInfoButton active={activeInfoField === "name"} onClick={() => setActiveInfoField(activeInfoField === "name" ? null : "name")} />
                  </label>
                  {activeInfoField === "name" && (
                    <FieldInfoCard
                      title="Persona Name in PAL"
                      description="The counterpart's conversational identity. The PAL introduces itself with this name, recognizes when you address it, and signs off with it. Injected into '# IDENTITY AND ROLE'."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="E.g., Dr. Aris Thorne"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      marginTop: "4px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Title / Profession
                    <FieldInfoButton active={activeInfoField === "title"} onClick={() => setActiveInfoField(activeInfoField === "title" ? null : "title")} />
                  </label>
                  {activeInfoField === "title" && (
                    <FieldInfoCard
                      title="Role & Domain Expertise"
                      description="Defines the counterpart's professional domain knowledge, technical vocabulary, and business priorities. Injected into '# IDENTITY AND ROLE' to anchor its authority and perspective."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="E.g., Chief Risk Officer"
                    value={personaTitle}
                    onChange={(e) => setPersonaTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      marginTop: "4px",
                    }}
                  />
                </div>
              </div>

              {/* Form Row 2: Seniority, Setting, Pressure */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Seniority
                    <FieldInfoButton active={activeInfoField === "seniority"} onClick={() => setActiveInfoField(activeInfoField === "seniority" ? null : "seniority")} />
                  </label>
                  {activeInfoField === "seniority" && (
                    <FieldInfoCard
                      title="Seniority Level in PAL"
                      description="Sets the power dynamic and authority level. Senior Executives expect concise answers and challenge strategic reasoning; Peers focus on practical execution."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <select
                    value={personaSeniorty}
                    onChange={(e) => setPersonaSeniorty(e.target.value as SeniorityLevel)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      marginTop: "4px",
                    }}
                  >
                    <option value="Peer">Peer</option>
                    <option value="Manager">Manager</option>
                    <option value="Senior Executive">Senior Executive</option>
                    <option value="Key Client">Key Client</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Setting
                    <FieldInfoButton active={activeInfoField === "setting"} onClick={() => setActiveInfoField(activeInfoField === "setting" ? null : "setting")} />
                  </label>
                  {activeInfoField === "setting" && (
                    <FieldInfoCard
                      title="Conversational Setting in PAL"
                      description="Anchors the physical or situational environment (e.g., Executive Boardroom, 1-on-1, Crisis room), influencing the PAL's tone and formality."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="E.g., Executive Boardroom"
                    value={personaSetting}
                    onChange={(e) => setPersonaSetting(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      marginTop: "4px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Pressure Level
                    <FieldInfoButton active={activeInfoField === "pressure"} onClick={() => setActiveInfoField(activeInfoField === "pressure" ? null : "pressure")} />
                  </label>
                  {activeInfoField === "pressure" && (
                    <FieldInfoCard
                      title="Pressure Level & Objection Style"
                      description="Directs conversational pacing and objection intensity. High and Intense pressure instruct the PAL to cut off weak or evasive answers and press relentlessly for proof."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <select
                    value={personaPressure}
                    onChange={(e) => handlePressureChange(e.target.value as "Moderate" | "High" | "Intense")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      marginTop: "4px",
                    }}
                  >
                    <option value="Moderate">Moderate (Firm but fair)</option>
                    <option value="High">High (Demanding & impatient)</option>
                    <option value="Intense">Intense (Relentless scrutiny)</option>
                  </select>
                </div>
              </div>

              {/* Behavioral Traits */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                  Temperament & Behavioral Traits
                  <FieldInfoButton active={activeInfoField === "traits"} onClick={() => setActiveInfoField(activeInfoField === "traits" ? null : "traits")} />
                </label>
                {activeInfoField === "traits" && (
                  <FieldInfoCard
                    title="Temperament & Behavioral Traits"
                    description="Injected into '# PERSONALITY AND STYLE'. Tags like Skeptical, Direct, or Analytical instruct the PAL's emotional attitude and what arguments it accepts or rejects."
                    onClose={() => setActiveInfoField(null)}
                  />
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {["Skeptical", "Direct", "Analytical", "Demanding", "Assertive", "Reserved", "Frustrated", "Urgent"].map((trait) => {
                    const isSelected = personaTraits.includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setPersonaTraits(personaTraits.filter((t) => t !== trait));
                          } else {
                            setPersonaTraits([...personaTraits, trait]);
                          }
                        }}
                        style={{
                          height: "26px",
                          padding: "0 10px",
                          borderRadius: "13px",
                          fontSize: "12px",
                          border: isSelected ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                          backgroundColor: isSelected ? "rgba(10, 132, 255, 0.16)" : "var(--bg-control)",
                          color: isSelected ? "var(--accent-blue)" : "var(--text-secondary)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {isSelected ? <Check size={11} /> : "+ "}
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Face Picker */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Avatar Face
                    <FieldInfoButton active={activeInfoField === "face"} onClick={() => setActiveInfoField(activeInfoField === "face" ? null : "face")} />
                  </label>
                  {selectedFaceName && (
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      Selected: <strong style={{ color: "var(--text-primary)" }}>{selectedFaceName}</strong>
                    </span>
                  )}
                </div>
                {activeInfoField === "face" && (
                  <FieldInfoCard
                    title="Interactive Video Avatar"
                    description="Selects the visual video replica. The persona generates real-time video simulation with lip-sync, expressions, and natural movement matching this face."
                    onClose={() => setActiveInfoField(null)}
                  />
                )}

                {!isTavusConfigured ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px dashed var(--separator)",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.45,
                    }}
                  >
                    Avatar service not configured in <code>.env</code>. The persona will be saved locally as a rehearsal draft.
                  </div>
                ) : isLoadingFaces ? (
                  <div
                    style={{
                      padding: "24px 18px",
                      textAlign: "center",
                      backgroundColor: "var(--bg-control)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--separator)",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading avatars…</span>
                  </div>
                ) : faces.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      backgroundColor: "var(--bg-control)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--separator)",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No avatars found.
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                        gap: "10px",
                        maxHeight: "220px",
                        overflowY: "auto",
                        padding: "6px",
                        backgroundColor: "var(--bg-control)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--separator)",
                      }}
                    >
                      {faces.slice(0, visibleFaceCount).map((f) => {
                        const isSelected = f.face_id === selectedFaceId;
                        return (
                          <div
                            key={f.face_id}
                            onClick={() => {
                              setSelectedFaceId(f.face_id);
                              setSelectedFaceName(f.face_name || "Stock Avatar");
                              if (f.default_voice_id && !selectedVoiceId) {
                                setSelectedVoiceId(f.default_voice_id);
                              }
                            }}
                            style={{
                              padding: "8px",
                              borderRadius: "var(--radius-xs)",
                              border: isSelected ? "2px solid var(--accent-blue)" : "1px solid var(--separator)",
                              backgroundColor: isSelected ? "rgba(10, 132, 255, 0.12)" : "var(--bg-elevated)",
                              cursor: "pointer",
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <FaceVideoThumbnail
                              videoUrl={f.thumbnail_video_url}
                              name={f.face_name || "AV"}
                              isSelected={isSelected}
                            />
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: isSelected ? 600 : 450,
                                color: isSelected ? "var(--accent-blue)" : "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                width: "100%",
                              }}
                            >
                              {f.face_name || "Stock Avatar"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {faces.length > visibleFaceCount && (
                      <div style={{ marginTop: "10px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setVisibleFaceCount((prev) => prev + facePageSize)}
                          className="mac-btn focus-ring"
                          style={{
                            padding: "6px 16px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--separator)",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            fontWeight: 550,
                            cursor: "pointer",
                          }}
                        >
                          Load More Avatars ({Math.min(visibleFaceCount, faces.length)} of {faces.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Voice Model Picker */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                  Synthetic Voice Model
                  <FieldInfoButton active={activeInfoField === "voice"} onClick={() => setActiveInfoField(activeInfoField === "voice" ? null : "voice")} />
                </label>
                {activeInfoField === "voice" && (
                  <FieldInfoCard
                    title="Synthetic Voice Model"
                    description="Configures the acoustic voice model (layers.tts.voice_id). Sets the avatar's spoken voice timbre, accent, and speech cadence during the call."
                    onClose={() => setActiveInfoField(null)}
                  />
                )}
                <div style={{ marginTop: "4px" }}>
                  <select
                    value={selectedVoiceId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setSelectedVoiceId(vId);
                      const foundVoice = voices.find((v) => v.voice_id === vId);
                      setPersonaVoice(foundVoice ? foundVoice.voice_name : "Default");
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                    }}
                  >
                    <option value="">Use Avatar's Default Voice (Recommended)</option>
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.voice_name} {v.description ? `— ${v.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opening Line / Greeting */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    Opening Greeting
                    <FieldInfoButton active={activeInfoField === "greeting"} onClick={() => setActiveInfoField(activeInfoField === "greeting" ? null : "greeting")} />
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {personaGreeting.length} / 160 chars
                  </span>
                </div>
                {activeInfoField === "greeting" && (
                  <FieldInfoCard
                    title="Opening Greeting Line"
                    description="The initial sentence spoken aloud by the PAL when the live video connection opens (greeting). Note: The PAL cannot be interrupted while delivering this opening line, so keep it concise."
                    onClose={() => setActiveInfoField(null)}
                  />
                )}
                <input
                  type="text"
                  maxLength={160}
                  placeholder="E.g., Thank you for taking the time to meet today."
                  value={personaGreeting}
                  onChange={(e) => setPersonaGreeting(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "12.5px",
                    marginTop: "4px",
                  }}
                />
              </div>

              {/* Language Selector */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                  Primary Spoken Language
                  <FieldInfoButton active={activeInfoField === "language"} onClick={() => setActiveInfoField(activeInfoField === "language" ? null : "language")} />
                </label>
                {activeInfoField === "language" && (
                  <FieldInfoCard
                    title="Primary Spoken Language"
                    description="Configures speech-to-text recognition (ASR) and text-to-speech (TTS) language models (languages: [code]) to converse naturally in your chosen language."
                    onClose={() => setActiveInfoField(null)}
                  />
                )}
                <select
                  value={personaLanguageCode}
                  onChange={(e) => setPersonaLanguageCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "12.5px",
                    marginTop: "4px",
                  }}
                >
                  <option value="en">English (US/UK/AU)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="it">Italian (Italiano)</option>
                  <option value="pt">Portuguese (Português)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="zh">Chinese (Mandarin)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ar">Arabic (العربية)</option>
                </select>
              </div>

              {/* Backstory & Behavior Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                      Backstory & Professional Context
                      <FieldInfoButton active={activeInfoField === "backstory"} onClick={() => setActiveInfoField(activeInfoField === "backstory" ? null : "backstory")} />
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      {personaBackstory.length} / 1200 chars
                    </span>
                  </div>
                  {activeInfoField === "backstory" && (
                    <FieldInfoCard
                      title="Backstory & Professional Context"
                      description="Detailed history, hidden motivations, past experiences, and context. Injected into '# IDENTITY AND ROLE' so the PAL can reference specific events and nuances during dialogue."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <textarea
                    rows={3}
                    maxLength={1200}
                    placeholder="Counterpart background, expectations, sensitivity points, historical context…"
                    value={personaBackstory}
                    onChange={(e) => setPersonaBackstory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      marginTop: "4px",
                      lineHeight: 1.45,
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                      Behavior notes & Escalation Dynamics
                      <FieldInfoButton active={activeInfoField === "notes"} onClick={() => setActiveInfoField(activeInfoField === "notes" ? null : "notes")} />
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      {personaNotes.length} / 1000 chars
                    </span>
                  </div>
                  {activeInfoField === "notes" && (
                    <FieldInfoCard
                      title="Behavior Notes & Escalation Dynamics"
                      description="Injected directly into '# CORE BEHAVIORS'. Provides tactical rules on what answers escalate the counterpart's skepticism and what specific commitments de-escalate them."
                      onClose={() => setActiveInfoField(null)}
                    />
                  )}
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Specific conversational triggers, what de-escalates them, questions they press hard on…"
                    value={personaNotes}
                    onChange={(e) => setPersonaNotes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      marginTop: "4px",
                      lineHeight: 1.45,
                    }}
                  />
                </div>
              </div>

              {/* Collapsible Advanced Settings */}
              <div
                style={{
                  marginBottom: "20px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--separator)",
                  backgroundColor: "var(--bg-control)",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>Advanced Character Controls</span>
                  {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>

                {showAdvanced && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid var(--separator)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                      <div>
                        <label style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                          Turn-Taking Patience
                          <FieldInfoButton active={activeInfoField === "patience"} onClick={() => setActiveInfoField(activeInfoField === "patience" ? null : "patience")} />
                        </label>
                        {activeInfoField === "patience" && (
                          <FieldInfoCard
                            title="Turn-Taking Patience"
                            description="Controls how long the PAL waits after you pause or stop speaking before taking its turn. 'Low' produces fast-paced interruptions; 'High' gives you room to formulate thoughts."
                            onClose={() => setActiveInfoField(null)}
                          />
                        )}
                        <select
                          value={customPatience}
                          onChange={(e) => setCustomPatience(e.target.value as any)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-xs)",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          <option value="high">High (Patient, listens to pauses)</option>
                          <option value="medium">Medium (Standard conversational)</option>
                          <option value="low">Low (Fast response, presses quickly)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                          PAL Interruptibility
                          <FieldInfoButton active={activeInfoField === "interruptibility"} onClick={() => setActiveInfoField(activeInfoField === "interruptibility" ? null : "interruptibility")} />
                        </label>
                        {activeInfoField === "interruptibility" && (
                          <FieldInfoCard
                            title="PAL Interruptibility"
                            description="Determines how easily the PAL yields when you speak while it is talking. 'High' means the PAL stops speaking immediately; 'Low' means it holds the floor."
                            onClose={() => setActiveInfoField(null)}
                          />
                        )}
                        <select
                          value={customInterruptibility}
                          onChange={(e) => setCustomInterruptibility(e.target.value as any)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-xs)",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          <option value="high">High (Easy to interrupt)</option>
                          <option value="medium">Medium (Standard)</option>
                          <option value="low">Low (Hard to interrupt, holds floor)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allowCameraPerception}
                          onChange={(e) => setAllowCameraPerception(e.target.checked)}
                        />
                        <span>Analyze camera & voice for mood (Default: OFF, vitals are calculated locally)</span>
                      </label>
                      <FieldInfoButton active={activeInfoField === "perception"} onClick={() => setActiveInfoField(activeInfoField === "perception" ? null : "perception")} />
                    </div>
                    {activeInfoField === "perception" && (
                      <FieldInfoCard
                        title="Mood & Camera Perception"
                        description="When enabled, vision analysis examines your live camera feed for facial composure and sentiment. Default is OFF because mocktwo calculates composure vitals locally on your device."
                        onClose={() => setActiveInfoField(null)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowPromptPreviewModal(true)}
                  className="hover-subtle focus-ring"
                  style={{
                    padding: "7px 12px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Eye size={13} />
                  <span>View System Prompt ({livePromptInfo.wordCount} words)</span>
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={requestClose}
                    className="hover-subtle"
                    style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePersona}
                    disabled={!personaName.trim() || isSaving || Boolean(livePromptInfo.error)}
                    className="mac-btn focus-ring"
                    style={{
                      padding: "7px 18px",
                      backgroundColor: "var(--accent-blue)",
                      color: "#ffffff",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 600,
                      fontSize: "12.5px",
                      opacity: personaName.trim() && !livePromptInfo.error && !isSaving ? 1 : 0.45,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isSaving && <Loader2 size={13} className="animate-spin" />}
                    <span>{isSaving ? "Saving…" : "Save Persona"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Preview Modal */}
      {showPromptPreviewModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowPromptPreviewModal(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "80vh",
              backgroundColor: "var(--bg-window)",
              border: "1px solid var(--separator)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--separator)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                  Compiled PAL System Prompt
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {livePromptInfo.wordCount} words · Sent to conversational LLM layer
                </div>
              </div>
              <button
                onClick={() => setShowPromptPreviewModal(false)}
                className="hover-subtle focus-ring"
                style={{ color: "var(--text-tertiary)", padding: "4px", borderRadius: "var(--radius-xs)" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  marginBottom: "14px",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontWeight: 650, color: "var(--text-primary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Info size={13} style={{ color: "var(--accent-blue)" }} />
                  <span>How This System Prompt is Generated</span>
                </div>
                <div>
                  This is the exact instruction set sent to the persona system prompt (POST /v2/pals). It is dynamically assembled from your editor fields:
                </div>
                <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr", gap: "3px", fontSize: "11.5px" }}>
                  <div>• <strong style={{ color: "var(--text-primary)" }}># IDENTITY AND ROLE:</strong> Assembled from Persona Name, Title, Setting, Seniority & Backstory.</div>
                  <div>• <strong style={{ color: "var(--text-primary)" }}># PERSONALITY AND STYLE:</strong> Assembled from Temperament Traits & Pressure Level.</div>
                  <div>• <strong style={{ color: "var(--text-primary)" }}># CORE BEHAVIORS:</strong> Assembled from Behavior notes & Escalation Dynamics.</div>
                  <div>• <strong style={{ color: "var(--text-primary)" }}># RESPONSE STYLE & GUARDRAILS:</strong> Built-in spoken video call guardrails (1–3 sentences per turn, realistic roleplay, zero breaking character).</div>
                </div>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  backgroundColor: "var(--bg-control)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--separator)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {livePromptInfo.prompt || "Start typing in the editor to preview the generated system prompt."}
              </pre>
            </div>

            <div
              style={{
                padding: "10px 18px",
                borderTop: "1px solid var(--separator)",
                backgroundColor: "var(--bg-control)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setShowPromptPreviewModal(false)}
                className="mac-btn focus-ring"
                style={{
                  padding: "5px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--separator)",
                  fontSize: "12px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Confirmation Overlay */}
      {showDiscardConfirm && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowDiscardConfirm(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "380px",
              padding: "22px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--separator)",
              boxShadow: "var(--shadow-modal)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
              Discard unsaved scenario?
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45, margin: "0 0 18px 0" }}>
              You have unsaved changes. Closing the studio will discard what you have drafted.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="mac-btn focus-ring"
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  closeStudio();
                }}
                className="mac-btn focus-ring"
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-red, #ef4444)",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
