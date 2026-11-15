import React, { useState } from "react";
import { useApp } from "../../context";
import { serviceRegistry } from "../../services/api";
import {
  X,
  Wand2,
  Mic,
  Paperclip,
  RotateCw,
  Check,
  User,
  Volume2,
  FilePlus,
  AlertCircle,
} from "lucide-react";
import type { PracticeScenario, Persona, InteractionType, DifficultyLevel, SeniorityLevel } from "../../types";

export const StudioSheet: React.FC = () => {
  const {
    isStudioOpen,
    studioInitialTab,
    closeStudio,
    addScenario,
    addPersona,
    personas,
  } = useApp();

  const [studioMode, setStudioMode] = useState<"describe" | "manual" | "persona">(
    studioInitialTab === "guest" || studioInitialTab === "persona" ? "persona" : "describe"
  );

  // Describe Mode State
  const [promptText, setPromptText] = useState("");
  const [attachedDoc, setAttachedDoc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<Partial<PracticeScenario> | null>(null);
  const [isDictating, setIsDictating] = useState(false);

  // Manual Mode State
  const [manualStep, setManualStep] = useState<1 | 2 | 3 | 4>(1);
  const [manualPersonaId, setManualPersonaId] = useState(personas[0]?.id || "");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState<InteractionType>("Interviews");
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel>("Intermediate");
  const [manualDuration, setManualDuration] = useState(3);
  const [manualContext, setManualContext] = useState("");
  const [manualObjectives, setManualObjectives] = useState<string[]>([
    "Acknowledge personal accountability without defensiveness",
    "Maintain steady breathing cadence under challenging questions",
  ]);

  // Persona Editor State
  const [personaName, setPersonaName] = useState("");
  const [personaTitle, setPersonaTitle] = useState("");
  const [personaSetting, setPersonaSetting] = useState("Executive Boardroom");
  const [personaSeniorty, setPersonaSeniorty] = useState<SeniorityLevel>("Senior Executive");
  const personaLanguage = "English (US)";
  const [personaTraits, setPersonaTraits] = useState<string[]>(["Skeptical", "Direct"]);
  const [personaVoice, setPersonaVoice] = useState("Echo (Direct American)");
  const [personaBackstory, setPersonaBackstory] = useState("");
  const [personaNotes, setPersonaNotes] = useState("");
  const [personaPressure, setPersonaPressure] = useState<"Moderate" | "High" | "Intense">("High");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isFormDirty = Boolean(
    promptText.trim() ||
    attachedDoc ||
    generatedDraft ||
    manualTitle.trim() ||
    manualContext.trim() ||
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

  if (!isStudioOpen) return null;

  const categories: InteractionType[] = [
    "Interviews",
    "Sales & Pitches",
    "Presentations",
    "Negotiation",
    "Difficult Conversations",
    "Customer Service",
    "Hospitality",
  ];

  // 4 Universal AI Describe Templates
  const templates = [
    {
      label: "Tough Interview Question",
      prompt: "A senior hiring committee asks you to explain a high-stakes failure, probing who was at fault and what you personally learned.",
    },
    {
      label: "Pricing Objection",
      prompt: "An aggressive procurement director demands a 30% discount 48 hours before contract sign-off or threatens to freeze onboarding.",
    },
    {
      label: "Skeptical Executive Q&A",
      prompt: "An impatient executive partner interrupts 30 seconds into your deck demanding return metrics and payback justification.",
    },
    {
      label: "Difficult Performance Feedback",
      prompt: "A defensive colleague pushes back on critical delivery milestones, claiming unrealistic deadlines and lack of engineering context.",
    },
  ];

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      if (serviceRegistry.scenarios.generateDraft) {
        const draft = await serviceRegistry.scenarios.generateDraft(promptText, attachedDoc || undefined);
        setGeneratedDraft(draft);
      } else {
        throw new Error("AI scenario generation requires a connected mocktwo workspace backend; please create manually or connect a backend.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI scenario generation requires a connected mocktwo workspace backend; please create manually or connect a backend.";
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDescribeDraft = () => {
    if (!generatedDraft || isSaving) return;
    setIsSaving(true);
    const finalScenario: PracticeScenario = {
      id: `sc-mine-${Date.now()}`,
      title: generatedDraft.title || "Custom Scenario",
      personaName: generatedDraft.personaName || generatedDraft.guestName || "Counterpart",
      personaId: generatedDraft.personaId || generatedDraft.guestId || "persona-custom",
      contextSetting: generatedDraft.contextSetting || generatedDraft.roomNumber || "Executive Meeting Room",
      seniority: generatedDraft.seniority || generatedDraft.loyaltyTier || "Senior Executive",
      interactionType: generatedDraft.interactionType || "Interviews",
      difficulty: generatedDraft.difficulty || "Intermediate",
      durationMinutes: generatedDraft.durationMinutes || 3,
      summary: generatedDraft.summary || promptText,
      context: generatedDraft.context || "",
      personaMood: generatedDraft.personaMood || generatedDraft.guestMood || "Direct & Analytical",
      learningObjectives: generatedDraft.learningObjectives || ["Maintain composure and answer directly"],
      keyChallenges: generatedDraft.keyChallenges || ["Managing unexpected interruptions"],
      recommendedPhrases: generatedDraft.recommendedPhrases || ["I hear your concern directly, let's address the metrics."],
      personaAvatarUrl: generatedDraft.personaAvatarUrl || generatedDraft.guestAvatarUrl || "",
      personaSummary: "Custom counterpart generated in Studio",
      source: "Mine",
      referenceMaterialName: attachedDoc || undefined,
      createdAt: new Date().toISOString().split("T")[0],
    };
    addScenario(finalScenario);
    setIsSaving(false);
    closeStudio();
  };

  const handleSaveManualScenario = () => {
    if (isSaving) return;
    setIsSaving(true);
    const assignedPersona = personas.find((p) => p.id === manualPersonaId) || personas[0];
    const newScenario: PracticeScenario = {
      id: `sc-mine-${Date.now()}`,
      title: manualTitle.trim() || "Untitled Practice Scenario",
      personaName: assignedPersona.name,
      personaId: assignedPersona.id,
      contextSetting: assignedPersona.contextSetting,
      seniority: assignedPersona.seniority,
      interactionType: manualCategory,
      difficulty: manualDifficulty,
      durationMinutes: manualDuration,
      summary: manualContext.slice(0, 140) || "Custom rehearsal scenario.",
      context: manualContext,
      personaMood: assignedPersona.temperamentTraits.join(" & ") || "Direct",
      learningObjectives: manualObjectives.filter((o) => o.trim().length > 0),
      keyChallenges: ["Maintaining steady breathing during aggressive prompts"],
      recommendedPhrases: ["I acknowledge the core bottleneck directly."],
      personaAvatarUrl: assignedPersona.avatarUrl || "",
      personaSummary: `${assignedPersona.title}; values directness and unshakeable composure.`,
      source: "Mine",
      createdAt: new Date().toISOString().split("T")[0],
    };
    addScenario(newScenario);
    setIsSaving(false);
    closeStudio();
  };

  const handleSavePersona = () => {
    if (!personaName.trim() || isSaving) return;
    setIsSaving(true);
    const newP: Persona = {
      id: `persona-mine-${Date.now()}`,
      name: personaName.trim(),
      avatarUrl: undefined,
      monogram: personaName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      title: personaTitle.trim() || "Counterpart",
      contextSetting: personaSetting.trim() || "Panel room",
      seniority: personaSeniorty,
      language: personaLanguage.trim() || "English (US)",
      temperamentTraits: personaTraits,
      voice: personaVoice,
      backstory: personaBackstory.trim(),
      communicationNotes: personaNotes.trim(),
      scenariosCount: 0,
      pressureLevel: personaPressure,
      source: "Mine",
    };
    addPersona(newP);
    setIsSaving(false);
    closeStudio();
  };

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
                onClick={() => setStudioMode("describe")}
                className="focus-ring"
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "describe" ? 600 : 450,
                  color: studioMode === "describe" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "describe" ? "var(--bg-elevated)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Wand2 size={12} style={{ color: "var(--accent-purple)" }} />
                <span>Describe (AI)</span>
              </button>
              <button
                onClick={() => setStudioMode("manual")}
                className="focus-ring"
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "manual" ? 600 : 450,
                  color: studioMode === "manual" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "manual" ? "var(--bg-elevated)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FilePlus size={12} style={{ color: "var(--accent-blue)" }} />
                <span>Manual Builder</span>
              </button>
              <button
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
          {/* DESCRIBE (AI) MODE */}
          {/* ============================================================ */}
          {studioMode === "describe" && (
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Describe the Situation
                </label>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Write a scenario in plain language or select an AI template. The studio will synthesize objectives,
                  objections, and counterpart traits.
                </p>
              </div>

              {/* Quick Template Buttons */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                {templates.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => setPromptText(tpl.prompt)}
                    className="hover-subtle focus-ring"
                    style={{
                      fontSize: "11px",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              {/* Main Prompt Textarea */}
              <div
                style={{
                  position: "relative",
                  backgroundColor: "var(--bg-control)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--separator)",
                  padding: "12px",
                  marginBottom: "14px",
                }}
              >
                <textarea
                  rows={4}
                  placeholder="E.g., An enterprise partner is skeptical of our Q3 timeline and threatens to delay funding unless we demonstrate immediate break-even..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    resize: "none",
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={() => setIsDictating((prev) => !prev)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11.5px",
                        color: isDictating ? "var(--accent-red)" : "var(--text-secondary)",
                      }}
                      className="hover-subtle"
                    >
                      <Mic size={13} />
                      <span>{isDictating ? "Listening…" : "Dictate"}</span>
                    </button>

                    <button
                      onClick={() => setAttachedDoc(attachedDoc ? null : "Enterprise-Reference-Doc.pdf")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11.5px",
                        color: attachedDoc ? "var(--accent-blue)" : "var(--text-secondary)",
                      }}
                      className="hover-subtle"
                    >
                      <Paperclip size={13} />
                      <span>{attachedDoc ? "Doc Attached" : "Attach reference material (PDF/TXT)"}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !promptText.trim()}
                    className="mac-btn focus-ring"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--accent-purple)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: isGenerating || !promptText.trim() ? 0.5 : 1,
                    }}
                  >
                    {isGenerating ? <RotateCw size={13} className="animate-spin-apple" /> : <Wand2 size={13} />}
                    <span>{isGenerating ? "Synthesizing…" : "Generate Scenario"}</span>
                  </button>
                </div>
              </div>

              {generationError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(255, 159, 10, 0.12)",
                    border: "1px solid rgba(255, 159, 10, 0.3)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    lineHeight: 1.4,
                  }}
                >
                  <AlertCircle size={16} style={{ color: "var(--accent-orange)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <span style={{ fontWeight: 600, display: "block", marginBottom: "2px" }}>
                      AI Workspace Service Disconnected
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {generationError}
                    </span>
                  </div>
                </div>
              )}

              {/* Generated Draft Preview */}
              {generatedDraft && (
                <div
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--separator)",
                    padding: "16px 20px",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                      {generatedDraft.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 600 }}>
                      {generatedDraft.interactionType} · {generatedDraft.difficulty}
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                    {generatedDraft.summary}
                  </p>
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleSaveDescribeDraft}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "6px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Save to Mine & Practice
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* MANUAL BUILDER MODE */}
          {/* ============================================================ */}
          {studioMode === "manual" && (
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
                  { step: 3, label: "Objectives" },
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
                  <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "12px" }}>
                    Step 1: Select Persona
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                    {personas.map((p) => {
                      const isSelected = p.id === manualPersonaId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setManualPersonaId(p.id)}
                          style={{
                            padding: "12px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: isSelected ? "var(--selection)" : "var(--bg-control)",
                            border: isSelected ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: "var(--bg-elevated)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: "11px",
                              fontWeight: 650,
                              color: "var(--text-primary)",
                            }}
                          >
                            {p.monogram || p.name.slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              {p.title} · {p.seniority}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setManualStep(2)}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
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
                  <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "12px" }}>
                    Step 2: Scenario Details
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Scenario Title</label>
                      <input
                        type="text"
                        placeholder="E.g., Challenging Engineering Timeline Pushback"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          backgroundColor: "var(--bg-control)",
                          border: "1px solid var(--separator)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Category</label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value as InteractionType)}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Difficulty</label>
                        <select
                          value={manualDifficulty}
                          onChange={(e) => setManualDifficulty(e.target.value as DifficultyLevel)}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          <option value="Foundational">Foundational</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Duration (min)</label>
                        <input
                          type="number"
                          value={manualDuration}
                          onChange={(e) => setManualDuration(Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Situation Narrative</label>
                      <textarea
                        rows={3}
                        placeholder="Describe the context and opening state before dialogue begins…"
                        value={manualContext}
                        onChange={(e) => setManualContext(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
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
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      onClick={() => setManualStep(1)}
                      className="hover-subtle"
                      style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setManualStep(3)}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                      }}
                    >
                      Next: Objectives →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Objectives */}
              {manualStep === 3 && (
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "12px" }}>
                    Step 3: Key Objectives
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                    {manualObjectives.map((obj, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          value={obj}
                          onChange={(e) => {
                            const updated = [...manualObjectives];
                            updated[i] = e.target.value;
                            setManualObjectives(updated);
                          }}
                          style={{
                            flex: 1,
                            padding: "7px 10px",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "12.5px",
                          }}
                        />
                        <button
                          onClick={() => setManualObjectives(manualObjectives.filter((_, idx) => idx !== i))}
                          style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setManualObjectives([...manualObjectives, ""])}
                      style={{
                        alignSelf: "flex-start",
                        fontSize: "12px",
                        color: "var(--accent-blue)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      + Add Objective
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      onClick={() => setManualStep(2)}
                      className="hover-subtle"
                      style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setManualStep(4)}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
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
                  <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "12px" }}>
                    Step 4: Review & Save
                  </h3>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "var(--bg-elevated)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--separator)",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {manualTitle || "Untitled Scenario"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--accent-blue)", marginTop: "2px" }}>
                      {manualCategory} · {manualDifficulty} · ~{manualDuration}m
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "8px" }}>
                      {manualContext || "No situation narrative provided."}
                    </p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      onClick={() => setManualStep(3)}
                      className="hover-subtle"
                      style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveManualScenario}
                      className="mac-btn focus-ring"
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 600,
                      }}
                    >
                      Save to Mine
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
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Persona Full Name</label>
                  <input
                    type="text"
                    placeholder="E.g., Dr. Aris Thorne"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
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
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Title / Profession</label>
                  <input
                    type="text"
                    placeholder="E.g., Chief Risk Officer"
                    value={personaTitle}
                    onChange={(e) => setPersonaTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Seniority</label>
                  <select
                    value={personaSeniorty}
                    onChange={(e) => setPersonaSeniorty(e.target.value as SeniorityLevel)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
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
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Setting</label>
                  <input
                    type="text"
                    placeholder="E.g., Executive Boardroom"
                    value={personaSetting}
                    onChange={(e) => setPersonaSetting(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Pressure Level</label>
                  <select
                    value={personaPressure}
                    onChange={(e) => setPersonaPressure(e.target.value as "Moderate" | "High" | "Intense")}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    <option value="Moderate">Moderate Pressure</option>
                    <option value="High">High Pressure</option>
                    <option value="Intense">Intense Pressure</option>
                  </select>
                </div>
              </div>

              {/* Behavioral Traits */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Temperament & Behavioral Traits
                </label>
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
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Synthetic Voice Model */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Synthetic Voice Model</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <select
                    value={personaVoice}
                    onChange={(e) => setPersonaVoice(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                    }}
                  >
                    <option value="Echo (Direct American)">Echo (Direct American)</option>
                    <option value="Alloy (Warm British)">Alloy (Warm British)</option>
                    <option value="Nova (Gentle Mid-Atlantic)">Nova (Gentle Mid-Atlantic)</option>
                    <option value="Fable (Polished Neutral)">Fable (Polished Neutral)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayingVoice(true);
                      setTimeout(() => setIsPlayingVoice(false), 1200);
                    }}
                    className="hover-subtle"
                    style={{
                      height: "34px",
                      padding: "0 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: isPlayingVoice ? "var(--accent-green)" : "var(--text-secondary)",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Volume2 size={13} />
                    <span>{isPlayingVoice ? "Playing…" : "Test Voice"}</span>
                  </button>
                </div>
              </div>

              {/* Backstory & Behavior Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Backstory & Conversational Context
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Counterpart background, expectations, sensitivity points…"
                    value={personaBackstory}
                    onChange={(e) => setPersonaBackstory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
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
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Behavior notes</label>
                  <textarea
                    rows={2}
                    placeholder="Specific conversational triggers, what de-escalates them, physical cues…"
                    value={personaNotes}
                    onChange={(e) => setPersonaNotes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      marginTop: "4px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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
                  disabled={!personaName.trim()}
                  className="mac-btn focus-ring"
                  style={{
                    padding: "7px 18px",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "12.5px",
                    opacity: personaName.trim() ? 1 : 0.5,
                  }}
                >
                  Save Persona
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
