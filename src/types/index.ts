export type Screen =
  | "sign-in"
  | "today"
  | "scenarios"
  | "recordings"
  | "progress"
  | "simulation"
  | "processing";

export type InteractionType =
  | "Front Desk"
  | "Concierge"
  | "Executive Lounge"
  | "Guest Services"
  | "Escalation Management"
  | "Reservations";

export type DifficultyLevel = "Foundational" | "Intermediate" | "Advanced";

export type ScenarioSource = "Hotel Library" | "Assigned" | "Mine";

export type SubmissionStatus = "Draft" | "Pending" | "Approved" | "Declined";

export interface Guest {
  id: string;
  name: string;
  avatarUrl?: string;
  monogram: string;
  title: string;
  roomNumber: string;
  loyaltyTier: "Standard" | "Gold Elite" | "Platinum Premier" | "Diamond Ambassador";
  language: string;
  temperamentTraits: string[];
  voice: string;
  backstory: string;
  communicationNotes: string;
  scenariosCount: number;
  source?: "Hotel Library" | "Mine";
}

export interface GuestScenario {
  id: string;
  title: string;
  guestName: string;
  guestId?: string;
  roomNumber: string;
  loyaltyTier: "Standard" | "Gold Elite" | "Platinum Premier" | "Diamond Ambassador";
  interactionType: InteractionType;
  difficulty: DifficultyLevel;
  durationMinutes: number;
  summary: string;
  context: string;
  guestMood: string;
  learningObjectives: string[];
  keyChallenges: string[];
  recommendedPhrases: string[];
  guestAvatarUrl: string;
  personaSummary: string;
  source: ScenarioSource;
  submissionStatus?: SubmissionStatus;
  dueDate?: string;
  assignedBy?: string;
  sopDocumentName?: string;
  successCriteria?: string[];
  createdAt?: string;
  allowedGuestIds?: string[];
  allowedTraits?: string[];
}

export interface CommunicationCompetency {
  name: string;
  score: number; // 0 - 100
  assessment: string;
  highlights?: string[];
}

export interface TranscriptUtterance {
  id: string;
  speaker: "Guest" | "You";
  text: string;
  timestampSeconds: number;
  isWeakPhrase?: boolean;
  weakPhraseHint?: string;
}

export interface CoachingNoteItem {
  id: string;
  title: string;
  explanation: string;
  timestampSeconds: number;
}

export interface RecordingUserNote {
  id: string;
  timestampSeconds: number;
  text: string;
  createdAt: string;
}

export interface RecordingAnalytics {
  language: {
    fillerWordCount: number;
    fillerWordRate: string;
    fillerThresholdMessage: string;
    weakWords: string[];
    serviceVocabulary: string[];
  };
  listening: {
    youPercentage: number;
    guestPercentage: number;
    youSeconds: number;
    guestSeconds: number;
    monologueCount: number;
    questionsAsked: string[];
  };
  delivery: {
    wordsPerMinute: number;
    idealWpmRange: string;
    paceRating: string;
    pauseCount: number;
    longestPauseSeconds: number;
    toneEnergy: string;
  };
}

export interface Recording {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  guestId?: string;
  guestName: string;
  guestAvatarUrl?: string;
  date: string;
  relativeDate: string;
  dateGroup: "Today" | "Yesterday" | "This Week" | "Earlier";
  durationSeconds: number;
  score?: number; // undefined if too short (< 30s)
  status: "Completed" | "Too short" | "Incomplete";
  videoUrl?: string;
  mediaType?: "video" | "audio-only";
  transcript: TranscriptUtterance[];
  coachingNotes: {
    whatWentWell: CoachingNoteItem[];
    whatCouldBeBetter: CoachingNoteItem[];
  };
  competencies: {
    empathy: CommunicationCompetency;
    professionalism: CommunicationCompetency;
    activeListening: CommunicationCompetency;
    problemSolving: CommunicationCompetency;
    responseQuality: CommunicationCompetency;
  };
  analytics: RecordingAnalytics;
  userNotes: RecordingUserNote[];
  guestResolutionSummary?: string;
  sopCompliance?: string;
  selfReportedConfidence?: number;
  selfReflectionNotes?: string;
}

export interface EmployeeProfile {
  name: string;
  email: string;
  role: string;
  department: string;
  property: string;
  employeeId: string;
  avatarUrl?: string;
  streakDays: number;
  completedSessionsCount: number;
  averageRating: number;
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  selectedCamera: string;
  selectedMicrophone: string;
  selectedSpeaker: string;
  autoStartAudio: boolean;
  hapticFeedback: boolean;
  reducedMotion: boolean;
  showDevDiagnostics: boolean;
  language: string;
  recordingsRetentionDays: number; // e.g. 30, 90, 365, 0 (forever)
}

// Utility to sanitize room numbers and prevent "Room Room 724" / "Suite Suite 1408" duplicate bug
export function formatRoomNumber(room: string): string {
  if (!room) return "";
  let cleaned = room.trim();

  // Strip duplicate leading "Room " or "Suite " prefixes
  let prefixType: "room" | "suite" | null = null;
  while (/^(room|suite)\s+/i.test(cleaned)) {
    const match = cleaned.match(/^(room|suite)\s+/i);
    if (match) {
      if (!prefixType || match[1].toLowerCase() === "suite") {
        prefixType = match[1].toLowerCase() as "room" | "suite";
      }
      cleaned = cleaned.replace(/^(room|suite)\s+/i, "").trim();
    }
  }

  if (!cleaned) return "";

  // If already contains luxury category designation (Penthouse, Villa, Chalet, etc.)
  if (/^(royal|presidential|junior|executive)?\s*(suite|penthouse|villa|chalet|bungalow)\b/i.test(cleaned)) {
    return cleaned;
  }

  if (prefixType === "suite") {
    return `Suite ${cleaned}`;
  }

  return `Room ${cleaned}`;
}

// Compatibility helper: filters compatible guests for a given scenario
export function getCompatibleGuests(scenario: GuestScenario, allGuests: Guest[]): Guest[] {
  return allGuests.filter((guest) => {
    // Scenario's own guest is ALWAYS compatible
    if (guest.id === scenario.guestId || guest.name === scenario.guestName) {
      return true;
    }

    // Check allowedGuestIds if configured
    if (scenario.allowedGuestIds && scenario.allowedGuestIds.length > 0) {
      if (scenario.allowedGuestIds.includes(guest.id)) {
        return true;
      }
      // If allowedGuestIds is explicit and doesn't include guest, exclude unless traits also match
      if (!scenario.allowedTraits || scenario.allowedTraits.length === 0) {
        return false;
      }
    }

    // Check allowedTraits if configured
    if (scenario.allowedTraits && scenario.allowedTraits.length > 0) {
      const hasMatchingTrait = guest.temperamentTraits.some((trait) =>
        scenario.allowedTraits!.some((t) => t.toLowerCase() === trait.toLowerCase())
      );
      if (!hasMatchingTrait) return false;
    }

    return true;
  });
}
export function renderScenarioText(text: string, scenario: GuestScenario, guest: Guest): string {
  if (!text) return "";
  let rendered = text;

  // Replace explicit template placeholders
  rendered = rendered.replace(/{{\s*guest\.name\s*}}/gi, guest.name);
  rendered = rendered.replace(/{{\s*guest\.room\s*}}/gi, formatRoomNumber(guest.roomNumber));
  rendered = rendered.replace(/{{\s*guest\.title\s*}}/gi, guest.title);
  rendered = rendered.replace(/{{\s*guest\.loyaltyTier\s*}}/gi, guest.loyaltyTier);
  rendered = rendered.replace(/{{\s*guest\.mood\s*}}/gi, guest.temperamentTraits.join(" & ") || guest.title);

  // If guest is swapped from scenario default, substitute hard-coded scenario default guest name
  if (scenario.guestName && guest.name !== scenario.guestName) {
    const defaultNameRegex = new RegExp(scenario.guestName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    rendered = rendered.replace(defaultNameRegex, guest.name);

    // Also replace last name if found (e.g. "Sterling" -> "Laurent" or "Von Berg")
    const nameParts = scenario.guestName.split(" ");
    if (nameParts.length > 1) {
      const defaultLastName = nameParts[nameParts.length - 1];
      const guestNameParts = guest.name.split(" ");
      const guestLastName = guestNameParts[guestNameParts.length - 1];
      if (defaultLastName && guestLastName && defaultLastName !== guestLastName) {
        const lastNameRegex = new RegExp(`\\b${defaultLastName}\\b`, "g");
        rendered = rendered.replace(lastNameRegex, guestLastName);
      }
    }
  }

  return rendered;
}
