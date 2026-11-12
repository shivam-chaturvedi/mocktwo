import React, { useState } from "react";
import { useApp } from "../../context";
import { generateScenarioDraft } from "../../data/mockData";
import {
  X,
  Wand2,
  Mic,
  Paperclip,
  RotateCw,
  Check,
  User,
  Volume2
} from "lucide-react";
import type { GuestScenario, Guest, InteractionType, DifficultyLevel } from "../../types";

export const StudioSheet: React.FC = () => {
  const {
    isStudioOpen,
    studioInitialTab,
    closeStudio,
    addScenario,
    addGuest,
    guests
  } = useApp();

  const [studioMode, setStudioMode] = useState<"describe" | "manual" | "guest">(
    studioInitialTab === "guest" ? "guest" : "describe"
  );

  // Describe Mode State
  const [promptText, setPromptText] = useState("");
  const [attachedDoc, setAttachedDoc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<Partial<GuestScenario> | null>(null);
  const [isDictating, setIsDictating] = useState(false);

  // Manual Mode State
  const [manualStep, setManualStep] = useState<1 | 2 | 3 | 4>(1);
  const [manualGuestId, setManualGuestId] = useState(guests[0]?.id || "");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState<InteractionType>("Front Desk");
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel>("Intermediate");
  const [manualDuration, setManualDuration] = useState(3);
  const [manualContext, setManualContext] = useState("");
  const [manualObjectives, setManualObjectives] = useState<string[]>([
    "De-escalate initial guest frustration warmly",
    "Offer immediate luxury alternative amenities"
  ]);

  // Guest Editor State
  const [guestName, setGuestName] = useState("");
  const [guestTitle, setGuestTitle] = useState("");
  const [guestRoom, setGuestRoom] = useState("Suite 1204");
  const [guestTier, setGuestTier] = useState<Guest["loyaltyTier"]>("Platinum Premier");
  const [guestLanguage, setGuestLanguage] = useState("English (US)");
  const [guestTraits, setGuestTraits] = useState<string[]>(["Agitated", "Impatient"]);
  const [guestVoice, setGuestVoice] = useState("Echo (Direct American)");
  const [guestBackstory, setGuestBackstory] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  if (!isStudioOpen) return null;

  const templates = [
    { label: "Late Check-in Friction", prompt: "A Diamond member arrives at 01:30 AM after a delayed flight and finds their reserved room has maintenance issues." },
    { label: "Room Not Ready", prompt: "An international traveler arrives at 11:00 AM before official check-in time and needs a place to shower and change for a client summit." },
    { label: "Billing Dispute", prompt: "A corporate executive disputes daily minibar and parking charges on checkout, requesting full adjustment." },
    { label: "VIP Request", prompt: "A VIP diplomatic patron requests immediate private security coordination and bespoke room placement away from public elevators." },
    { label: "Noise Complaint", prompt: "An adjoining guest reports loud music from a neighboring suite at 23:00 and demands an immediate room swap." },
    { label: "Lost Luggage", prompt: "A guest arrives without baggage due to airline mishandling and has an urgent black-tie dinner in three hours." },
    { label: "Upsell Opportunity", prompt: "A celebratory anniversary couple asks about standard room features; explore presenting a penthouse suite enhancement." }
  ];

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    try {
      const draft = await generateScenarioDraft(promptText, attachedDoc || undefined);
      setGeneratedDraft(draft);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDescribeDraft = () => {
    if (!generatedDraft) return;
    const finalScenario: GuestScenario = {
      id: `sc-mine-${Date.now()}`,
      title: generatedDraft.title || "Custom Scenario",
      guestName: generatedDraft.guestName || "Marcus Sterling",
      guestId: generatedDraft.guestId || "guest-marcus",
      roomNumber: generatedDraft.roomNumber || "Suite 1408",
      loyaltyTier: generatedDraft.loyaltyTier || "Diamond Ambassador",
      interactionType: generatedDraft.interactionType || "Front Desk",
      difficulty: generatedDraft.difficulty || "Intermediate",
      durationMinutes: generatedDraft.durationMinutes || 3,
      summary: generatedDraft.summary || promptText,
      context: generatedDraft.context || "",
      guestMood: generatedDraft.guestMood || "Direct & Firm",
      learningObjectives: generatedDraft.learningObjectives || ["Resolve situation diplomatically"],
      keyChallenges: generatedDraft.keyChallenges || ["High guest expectations"],
      recommendedPhrases: generatedDraft.recommendedPhrases || ["Allow me to handle this personally."],
      guestAvatarUrl: generatedDraft.guestAvatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
      personaSummary: generatedDraft.personaSummary || "",
      source: "Mine",
      submissionStatus: "Draft",
      sopDocumentName: attachedDoc || undefined,
      successCriteria: generatedDraft.successCriteria || ["Diplomatic resolution committed"],
      createdAt: new Date().toISOString().split("T")[0]
    };
    addScenario(finalScenario);
    closeStudio();
  };

  const handleSaveManualScenario = () => {
    const matchedGuest = guests.find((g) => g.id === manualGuestId) || guests[0];
    const finalScenario: GuestScenario = {
      id: `sc-mine-${Date.now()}`,
      title: manualTitle.trim() || `${manualCategory} Situation`,
      guestName: matchedGuest.name,
      guestId: matchedGuest.id,
      roomNumber: matchedGuest.roomNumber,
      loyaltyTier: matchedGuest.loyaltyTier,
      interactionType: manualCategory,
      difficulty: manualDifficulty,
      durationMinutes: manualDuration,
      summary: manualContext.slice(0, 140),
      context: manualContext,
      guestMood: matchedGuest.temperamentTraits.join(" & "),
      learningObjectives: manualObjectives,
      keyChallenges: ["Maintaining composure under policy discussion"],
      recommendedPhrases: ["I am taking complete personal ownership of this right now."],
      guestAvatarUrl: matchedGuest.avatarUrl || "",
      personaSummary: matchedGuest.backstory,
      source: "Mine",
      submissionStatus: "Draft",
      successCriteria: ["Uphold five-star luxury standards", "Deliver swift concrete resolution"],
      createdAt: new Date().toISOString().split("T")[0]
    };
    addScenario(finalScenario);
    closeStudio();
  };

  const handleSaveGuest = () => {
    if (!guestName.trim()) return;
    const newGuest: Guest = {
      id: `guest-${Date.now()}`,
      name: guestName.trim(),
      monogram: guestName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      title: guestTitle.trim() || "Private Patron",
      roomNumber: guestRoom.trim() || "Suite 1204",
      loyaltyTier: guestTier,
      language: guestLanguage,
      temperamentTraits: guestTraits,
      voice: guestVoice,
      backstory: guestBackstory.trim() || "Discerning international guest visiting The Grand Palais.",
      communicationNotes: guestNotes.trim() || "Values proactive anticipation and flawless hospitality.",
      scenariosCount: 0
    };
    addGuest(newGuest);
    closeStudio();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "grid",
        placeItems: "center",
        padding: "24px"
      }}
      onClick={closeStudio}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "960px",
          height: "680px",
          maxHeight: "90vh",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          border: "1px solid var(--separator)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Mode Switcher */}
        <header
          style={{
            height: "56px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
              Scenario & Guest Studio
            </span>

            {/* Segmented Control: Describe (AI) | Manual | Guest Editor */}
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
              <button
                onClick={() => setStudioMode("describe")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "describe" ? 600 : 450,
                  color: studioMode === "describe" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "describe" ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <Wand2 size={12} style={{ color: "var(--accent-blue)" }} />
                <span>Describe (AI)</span>
              </button>

              <button
                onClick={() => setStudioMode("manual")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "manual" ? 600 : 450,
                  color: studioMode === "manual" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "manual" ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Manual Form
              </button>

              <button
                onClick={() => setStudioMode("guest")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "12px",
                  fontWeight: studioMode === "guest" ? 600 : 450,
                  color: studioMode === "guest" ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: studioMode === "guest" ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <User size={12} style={{ color: "var(--accent-green)" }} />
                <span>Guest Editor</span>
              </button>
            </div>
          </div>

          <button
            onClick={closeStudio}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer"
            }}
            className="hover-subtle"
          >
            <X size={16} />
          </button>
        </header>

        {/* Studio Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {/* ============================================================ */}
          {/* DESCRIBE (AI-ASSISTED) MODE */}
          {/* ============================================================ */}
          {studioMode === "describe" && (
            <div style={{ maxWidth: "880px", margin: "0 auto" }}>
              {!generatedDraft ? (
                <>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                      Describe the situation in a few sentences…
                    </label>
                    <div
                      style={{
                        position: "relative",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-lg)",
                        overflow: "hidden"
                      }}
                    >
                      <textarea
                        rows={4}
                        placeholder="E.g., A Diamond member arrives at midnight after a cancelled flight. Their assigned executive suite has a faulty thermostat, and standard suites are sold out..."
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          background: "none",
                          border: "none",
                          outline: "none",
                          color: "var(--text-primary)",
                          fontSize: "13.5px",
                          lineHeight: 1.5,
                          resize: "none"
                        }}
                      />

                      {/* Bottom action toolbar inside textarea */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 14px",
                          borderTop: "1px solid var(--separator)",
                          backgroundColor: "rgba(30, 30, 32, 0.4)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {/* Dictation Simulation Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsDictating((prev) => !prev);
                              if (!isDictating) {
                                setPromptText((prev) => prev + " Guest is demanding immediate suite upgrade and valet luggage delivery.");
                              }
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              color: isDictating ? "var(--accent-red)" : "var(--text-secondary)",
                              background: "none",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <Mic size={14} />
                            <span>{isDictating ? "Listening…" : "Dictate"}</span>
                          </button>

                          {/* SOP Attachment Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const doc = prompt("Enter SOP/Policy Document Name:", "SOP-804-Escalation-Recovery.pdf");
                              if (doc) setAttachedDoc(doc);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              color: attachedDoc ? "var(--accent-blue)" : "var(--text-secondary)",
                              background: "none",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <Paperclip size={14} />
                            <span>{attachedDoc || "Attach SOP / Policy"}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={!promptText.trim() || isGenerating}
                          style={{
                            height: "32px",
                            padding: "0 14px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--accent-blue)",
                            color: "#ffffff",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            border: "none",
                            cursor: promptText.trim() && !isGenerating ? "pointer" : "not-allowed",
                            opacity: promptText.trim() && !isGenerating ? 1 : 0.5
                          }}
                        >
                          <Wand2 size={13} />
                          <span>{isGenerating ? "Synthesizing Draft…" : "Generate Scenario"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Template Chips */}
                  <div style={{ marginTop: "24px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                      Or Start from a Standard Luxury Template:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {templates.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPromptText(tpl.prompt)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--bg-control)",
                            border: "1px solid var(--separator)",
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.12s ease"
                          }}
                          className="hover-subtle"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Generated Draft Preview & Editable Review */
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Wand2 size={16} style={{ color: "var(--accent-blue)" }} />
                      <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
                        AI Generated Scenario Preview
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGeneratedDraft(null)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer"
                      }}
                    >
                      <RotateCw size={12} />
                      <span>Regenerate / Edit Prompt</span>
                    </button>
                  </div>

                  <div
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--separator)",
                      padding: "20px"
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div>
                        <label style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 600 }}>Title</label>
                        <input
                          type="text"
                          value={generatedDraft.title || ""}
                          onChange={(e) => setGeneratedDraft((prev) => ({ ...prev, title: e.target.value }))}
                          style={{ width: "100%", padding: "7px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 600 }}>Assigned Guest</label>
                        <div style={{ padding: "7px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}>
                          {generatedDraft.guestName} ({generatedDraft.loyaltyTier})
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 600 }}>Situation Context</label>
                      <textarea
                        rows={3}
                        value={generatedDraft.context || ""}
                        onChange={(e) => setGeneratedDraft((prev) => ({ ...prev, context: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px", lineHeight: 1.4 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 600 }}>Learning Objectives</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                        {generatedDraft.learningObjectives?.map((obj, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-secondary)" }}>
                            <Check size={13} style={{ color: "var(--accent-blue)" }} />
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setGeneratedDraft(null)}
                      style={{ height: "34px", padding: "0 14px", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", color: "var(--text-secondary)", fontSize: "12.5px", cursor: "pointer" }}
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDescribeDraft}
                      style={{ height: "34px", padding: "0 18px", borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-blue)", color: "#ffffff", fontSize: "12.5px", fontWeight: 600, border: "none", cursor: "pointer" }}
                    >
                      Save to Mine
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* MANUAL FORM MODE */}
          {/* ============================================================ */}
          {studioMode === "manual" && (
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              {/* Stepper indicator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "24px" }}>
                {[
                  { step: 1, label: "Guest" },
                  { step: 2, label: "Situation" },
                  { step: 3, label: "Objectives" },
                  { step: 4, label: "Review" }
                ].map((s) => (
                  <div key={s.step} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: manualStep === s.step ? "var(--accent-blue)" : manualStep > s.step ? "var(--accent-green)" : "var(--bg-control)",
                        color: manualStep >= s.step ? "#ffffff" : "var(--text-tertiary)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "11px",
                        fontWeight: 650
                      }}
                    >
                      {manualStep > s.step ? "✓" : s.step}
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: manualStep === s.step ? 600 : 450, color: manualStep === s.step ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {s.label}
                    </span>
                    {s.step < 4 && <span style={{ color: "var(--separator)", marginLeft: "4px" }}>—</span>}
                  </div>
                ))}
              </div>

              {manualStep === 1 && (
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
                    Step 1: Select Guest Persona
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                    {guests.map((g) => {
                      const isSelected = manualGuestId === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setManualGuestId(g.id)}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: isSelected ? "rgba(10, 132, 255, 0.12)" : "var(--bg-control)",
                            border: isSelected ? "1.5px solid var(--accent-blue)" : "1px solid var(--separator)",
                            cursor: "pointer"
                          }}
                        >
                          <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>{g.name}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>{g.title}</div>
                          <div style={{ fontSize: "11px", color: "var(--accent-orange)", marginTop: "4px" }}>{g.temperamentTraits.join(" · ")}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setManualStep(2)}
                      style={{ height: "34px", padding: "0 18px", borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-blue)", color: "#ffffff", fontSize: "12.5px", fontWeight: 600, border: "none", cursor: "pointer" }}
                    >
                      Next: Situation →
                    </button>
                  </div>
                </div>
              )}

              {manualStep === 2 && (
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
                    Step 2: Situation & Parameters
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Scenario Title</label>
                      <input
                        type="text"
                        placeholder="E.g., Late Night Room Move"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Category</label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value as InteractionType)}
                          style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                        >
                          <option value="Front Desk">Front Desk</option>
                          <option value="Concierge">Concierge</option>
                          <option value="Executive Lounge">Executive Lounge</option>
                          <option value="Guest Services">Guest Services</option>
                          <option value="Escalation Management">Escalation Management</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Difficulty</label>
                        <select
                          value={manualDifficulty}
                          onChange={(e) => setManualDifficulty(e.target.value as DifficultyLevel)}
                          style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                        >
                          <option value="Foundational">Foundational</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Est. Duration</label>
                        <select
                          value={manualDuration}
                          onChange={(e) => setManualDuration(Number(e.target.value))}
                          style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                        >
                          <option value={2}>2 minutes</option>
                          <option value={3}>3 minutes</option>
                          <option value={4}>4 minutes</option>
                          <option value={5}>5 minutes</option>
                          <option value={7}>7 minutes</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Situation Narrative</label>
                      <textarea
                        rows={3}
                        placeholder="Describe what happened prior to guest approaching..."
                        value={manualContext}
                        onChange={(e) => setManualContext(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button onClick={() => setManualStep(1)} style={{ height: "34px", padding: "0 14px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Back</button>
                    <button onClick={() => setManualStep(3)} style={{ height: "34px", padding: "0 18px", backgroundColor: "var(--accent-blue)", color: "#ffffff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer" }}>Next: Objectives →</button>
                  </div>
                </div>
              )}

              {manualStep === 3 && (
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
                    Step 3: Key Objectives
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                    {manualObjectives.map((obj, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          value={obj}
                          onChange={(e) => {
                            const updated = [...manualObjectives];
                            updated[i] = e.target.value;
                            setManualObjectives(updated);
                          }}
                          style={{ flex: 1, padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
                        />
                        <button
                          type="button"
                          onClick={() => setManualObjectives(manualObjectives.filter((_, idx) => idx !== i))}
                          style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setManualObjectives([...manualObjectives, "New learning objective"])}
                      style={{ alignSelf: "flex-start", padding: "4px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--accent-blue)", cursor: "pointer", marginTop: "4px" }}
                    >
                      + Add Objective
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button onClick={() => setManualStep(2)} style={{ height: "34px", padding: "0 14px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Back</button>
                    <button onClick={() => setManualStep(4)} style={{ height: "34px", padding: "0 18px", backgroundColor: "var(--accent-blue)", color: "#ffffff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer" }}>Next: Review →</button>
                  </div>
                </div>
              )}

              {manualStep === 4 && (
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
                    Step 4: Review & Save
                  </h3>
                  <div style={{ padding: "18px", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--separator)", marginBottom: "20px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{manualTitle || "Untitled Scenario"}</div>
                    <div style={{ fontSize: "12.5px", color: "var(--accent-blue)", marginBottom: "10px" }}>{manualCategory} · {manualDifficulty} · ~{manualDuration} min</div>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>{manualContext || "No situation narrative provided."}</p>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "6px" }}>Objectives:</div>
                    {manualObjectives.map((o, i) => (
                      <div key={i} style={{ fontSize: "12px", color: "var(--text-secondary)", marginLeft: "8px", marginBottom: "4px" }}>• {o}</div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button onClick={() => setManualStep(3)} style={{ height: "34px", padding: "0 14px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Back</button>
                    <button onClick={handleSaveManualScenario} style={{ height: "34px", padding: "0 20px", backgroundColor: "var(--accent-blue)", color: "#ffffff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer" }}>Save to Mine</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* GUEST EDITOR MODE */}
          {/* ============================================================ */}
          {studioMode === "guest" && (
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Guest Full Name</label>
                  <input
                    type="text"
                    placeholder="E.g., Baroness Valerie de Chalon"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Title / Profession</label>
                  <input
                    type="text"
                    placeholder="E.g., Managing Partner, Private Equity"
                    value={guestTitle}
                    onChange={(e) => setGuestTitle(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Loyalty Tier</label>
                  <select
                    value={guestTier}
                    onChange={(e) => setGuestTier(e.target.value as Guest["loyaltyTier"])}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12.5px", marginTop: "4px" }}
                  >
                    <option value="Diamond Ambassador">Diamond Ambassador</option>
                    <option value="Platinum Premier">Platinum Premier</option>
                    <option value="Gold Elite">Gold Elite</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Room / Suite</label>
                  <input
                    type="text"
                    value={guestRoom}
                    onChange={(e) => setGuestRoom(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12.5px", marginTop: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Primary Language</label>
                  <input
                    type="text"
                    value={guestLanguage}
                    onChange={(e) => setGuestLanguage(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12.5px", marginTop: "4px" }}
                  />
                </div>
              </div>

              {/* Temperament Traits */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Temperament & Behavioral Traits</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {["Demanding", "Agitated", "Impatient", "Affable", "Precise", "VIP", "Analytical", "Cautious", "Hurried"].map((trait) => {
                    const isSelected = guestTraits.includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setGuestTraits(guestTraits.filter((t) => t !== trait));
                          } else {
                            setGuestTraits([...guestTraits, trait]);
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
                          cursor: "pointer"
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}{trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Picker with Preview button */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Synthetic Voice Model</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <select
                    value={guestVoice}
                    onChange={(e) => setGuestVoice(e.target.value)}
                    style={{ flex: 1, padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px" }}
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
                    style={{
                      height: "36px",
                      padding: "0 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: isPlayingVoice ? "var(--accent-green)" : "var(--text-secondary)",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      cursor: "pointer"
                    }}
                  >
                    <Volume2 size={14} />
                    <span>{isPlayingVoice ? "Playing Sample…" : "Test Voice"}</span>
                  </button>
                </div>
              </div>

              {/* Backstory & Communication Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Backstory & Persona Context</label>
                  <textarea
                    rows={2}
                    placeholder="Frequent guest expectations, travel patterns, sensitivity points..."
                    value={guestBackstory}
                    onChange={(e) => setGuestBackstory(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Staff Communication Protocol Notes</label>
                  <textarea
                    rows={2}
                    placeholder="How staff should address the guest, specific de-escalation keys..."
                    value={guestNotes}
                    onChange={(e) => setGuestNotes(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={closeStudio}
                  style={{ height: "34px", padding: "0 14px", backgroundColor: "var(--bg-control)", border: "1px solid var(--separator)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGuest}
                  disabled={!guestName.trim()}
                  style={{
                    height: "34px",
                    padding: "0 18px",
                    backgroundColor: "var(--accent-blue)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 600,
                    cursor: guestName.trim() ? "pointer" : "not-allowed",
                    opacity: guestName.trim() ? 1 : 0.5
                  }}
                >
                  Save Guest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
