export type Screen =
  | "sign-in"
  | "home"
  | "today" // alias for backward-compatibility
  | "scenarios"
  | "recordings"
  | "progress"
  | "simulation"
  | "processing";

export type InteractionType =
  | "Interviews"
  | "Sales & Pitches"
  | "Presentations"
  | "Negotiation"
  | "Difficult Conversations"
  | "Customer Service"
  | "Hospitality"
  // Legacy aliases for backward compatibility with persisted data
  | "Front Desk"
  | "Concierge"
  | "Executive Lounge"
  | "Guest Services"
  | "Escalation Management"
  | "Reservations";

export type DifficultyLevel = "Foundational" | "Intermediate" | "Advanced";

export type ScenarioSource = "Library" | "Mine" | "Hotel Library" | "Assigned";

export type SubmissionStatus = "Draft" | "Pending" | "Approved" | "Declined";

export type SeniorityLevel = "Peer" | "Manager" | "Senior Executive" | "Key Client";

export type ComposureTier = "Building" | "Steady" | "Composed" | "Unshakeable";

export function getComposureTier(score: number): ComposureTier {
  if (score >= 93) return "Unshakeable";
  if (score >= 83) return "Composed";
  if (score >= 70) return "Steady";
  return "Building";
}

// SDK TRUTH TABLE VALIDATION STATUS CODES
export type ValidationStatusCode =
  | "OK"
  | "NO_FACE_FOUND"
  | "MULTIPLE_FACES_FOUND"
  | "FACE_NOT_CENTERED"
  | "TOO_DARK"
  | "TOO_BRIGHT"
  | "CHEST_NOT_VISIBLE"
  | "CAMERA_TUNING"
  | "FRAME_RATE_TOO_LOW"
  | "EXCESSIVE_MOTION"
  | "FACE_TOO_CLOSE"
  | "FACE_TOO_FAR"
  | "FACE_TOO_HIGH"
  | "FACE_TOO_LOW"
  | "FACE_NOT_FORWARD";

export const VALIDATION_HINTS: Record<ValidationStatusCode, string> = {
  OK: "Camera and framing optimal",
  NO_FACE_FOUND: "Position your face directly in front of the camera",
  MULTIPLE_FACES_FOUND: "Only one face should be visible in frame",
  FACE_NOT_CENTERED: "Center your face in the camera frame",
  TOO_DARK: "Increase front lighting on your face",
  TOO_BRIGHT: "Reduce harsh backlighting or glare",
  CHEST_NOT_VISIBLE: "Lower camera slightly so upper chest is visible for breathing measurement",
  CAMERA_TUNING: "Adjusting camera exposure and white balance…",
  FRAME_RATE_TOO_LOW: "Camera frame rate unstable. Close heavy background apps",
  EXCESSIVE_MOTION: "Please remain still during measurement",
  FACE_TOO_CLOSE: "Move back slightly from the camera",
  FACE_TOO_FAR: "Move closer to the camera",
  FACE_TOO_HIGH: "Lower your camera or raise your seat",
  FACE_TOO_LOW: "Raise your camera or lower your seat",
  FACE_NOT_FORWARD: "Look straight ahead at the camera",
};

// METRIC STATE ENUM
export type MetricState =
  | "measured"
  | "warmingUp"
  | "notEnoughTime"
  | "lowConfidence"
  | "outOfRange"
  | "notMeasurableWhileSpeaking"
  | "unavailable";

export type ExpressionKey =
  | "angry"
  | "contempt"
  | "disgust"
  | "fear"
  | "happy"
  | "neutral"
  | "sad"
  | "surprise";

export type NervousnessLevel = "Calm" | "Mild" | "Moderate" | "High";

export type SessionReadinessStatus = "Full read" | "Quick read" | "Too short";

export interface PulseSample {
  t: number;
  value: number | "outOfRange";
  confidence: number;
  stable: boolean;
}

export interface ArterialWaveformPoint {
  t: number;
  shapeValue: number; // 0-1 relative shape
}

export interface HrvSample {
  t: number;
  rmssd: number;
  meanNn: number;
  sdnn: number;
  baevsky: number;
  confidence: number;
  stable: boolean;
}

export interface BreathingSample {
  t: number;
  value: number; // 5-40 br/min
  confidence: number;
  stable: boolean;
  isMeasurable: boolean;
}

export interface EdaSample {
  t: number;
  value: number; // relative arousal
}

export interface FaceSample {
  t: number;
  isTalking: boolean;
  blinkCount: number;
  expressions: Record<ExpressionKey, number>;
}

export interface BiometricSample {
  t: number;
  heartRate: number;
  hrv?: number;
  source: "measured" | "estimated" | "unavailable";
}

export interface PeakStressMoment {
  timestampSeconds: number;
  counterpartQuote: string;
  reaction: string; // SDK physiological signals only (pulse/arousal/expression)
  userAction: string; // What the body did / calm response
  suggestion: string; // Practical reset (breathing, pause, slower start)
}

export interface SessionBiometrics {
  // Pulse rate (12 s window, 40-110 bpm only)
  pulse: {
    rate: PulseSample[];
    avg?: number;
    peak?: number;
    min?: number;
    baselineValue: number;
    deltaVsBaseline?: number;
    state: MetricState;
    confidence: number;
    windowSeconds: 12;
    rangeBpm: "40–110 bpm";
    hasOutOfRange: boolean;
  };
  // Waveform (relative shape)
  waveform: {
    samples: ArterialWaveformPoint[];
    state: MetricState;
  };
  // HRV (60 s window, confidence is 0 until 60 s)
  hrv: {
    trace: HrvSample[];
    rmssd?: number;
    meanNn?: number;
    sdnn?: number;
    baevsky?: number;
    baevskyDeltaVsBaseline?: number; // e.g. +18%
    state: MetricState;
    confidence: number;
    windowSeconds: 60;
  };
  // Breathing (30 s window, 5-40 br/min, not measurable while talking)
  breathing: {
    rate: BreathingSample[];
    quietRateBpm?: number;
    state: MetricState;
    confidence: number;
    windowSeconds: 30;
    rangeBpm: "5–40 br/min";
  };
  // EDA proxy trace (starts after 35+ s, relative, no confidence)
  eda: {
    trace: EdaSample[];
    peakArousalDelta?: number;
    state: MetricState;
    startSeconds: 35;
  };
  // Face (478 landmarks, immediate)
  face: {
    trace: FaceSample[];
    expressionAverages: Record<ExpressionKey, number>;
    blinkRatePerMin: number;
    speakingSharePct: number;
    state: MetricState;
  };
  // Quality & Session Readiness
  validationEvents: {
    timestampSeconds: number;
    code: ValidationStatusCode;
    hintText: string;
  }[];
  cleanMeasuredSeconds: number;
  totalDurationSeconds: number;
  coverageRatio: string; // "Coverage: X of Y s measured cleanly"
  recoverySecondsApprox?: number; // resolution ~12s
  readinessStatus: SessionReadinessStatus;
  composureScore?: number; // mocktwo Composure Index
  composureTier?: ComposureTier;
  signalsAvailableCount: number; // 0-5
  isPartialScore: boolean;
  nervousnessLevel: NervousnessLevel;
  peakStressMoments: PeakStressMoment[];

  // Backward compatibility aliases
  avgHR?: number;
  peakHR?: number;
  minHR?: number;
  baselineHR?: number;
  avgHRV?: number;
  baselineHRV?: number;
  recoverySeconds?: number;
  source?: "measured" | "estimated" | "unavailable";
  samples?: BiometricSample[];
}

export interface UserBaseline {
  restingPulse: number;
  restingHrvRmssd: number;
  restingBaevsky?: number;
  restingBreathingRate: number;
  restingEdaArousal?: number;
  restingExpressions?: Record<ExpressionKey, number>;
  measuredAt: string;
  lastCalibratedAt?: string;
  isCalibrated: boolean;
  qualityScore?: number;
  qualityRating?: "Good" | "Fair" | "Poor";
  sdkVersion?: string;
  durationSeconds?: number;
  // Legacy aliases
  restingHR?: number;
  restingHRV?: number;
}

export interface Persona {
  id: string;
  name: string;
  avatarUrl?: string;
  monogram: string;
  title: string;
  contextSetting: string; // e.g. "Zoom Conference", "Executive Boardroom", "Panel room"
  setting?: string; // convenience alias
  roomNumber?: string; // backward compatibility
  seniority: SeniorityLevel | string; // e.g. "Senior Executive", "Key Client"
  loyaltyTier?: string; // backward compatibility
  language: string;
  temperamentTraits: string[];
  voice: string;
  backstory: string;
  communicationNotes: string;
  scenariosCount: number;
  pressureLevel?: "Moderate" | "High" | "Intense";
  source?: "Library" | "Mine" | "Hotel Library";
}

export type Guest = Persona;

export interface PracticeScenario {
  id: string;
  title: string;
  personaName: string;
  guestName?: string; // backward compatibility
  personaId?: string;
  guestId?: string; // backward compatibility
  contextSetting: string;
  setting?: string; // backward compatibility & alias
  roomNumber?: string; // backward compatibility
  seniority: SeniorityLevel | string;
  loyaltyTier?: string; // backward compatibility
  interactionType: InteractionType;
  difficulty: DifficultyLevel;
  durationMinutes: number;
  summary: string;
  context: string;
  personaMood: string;
  personaTone?: string; // alias
  guestMood?: string; // backward compatibility
  learningObjectives: string[];
  keyChallenges: string[];
  recommendedPhrases: string[];
  personaAvatarUrl: string;
  guestAvatarUrl?: string; // backward compatibility
  personaSummary: string;
  source: ScenarioSource;
  submissionStatus?: SubmissionStatus;
  referenceMaterialName?: string;
  sopDocumentName?: string; // backward compatibility
  successCriteria?: string[];
  createdAt?: string;
  allowedPersonaIds?: string[];
  allowedGuestIds?: string[]; // backward compatibility
  allowedTraits?: string[];
  // Legacy optional properties to prevent build errors
  dueDate?: string;
  assignedBy?: string;
}

export interface TranscriptUtterance {
  id: string;
  speaker: "Persona" | "You" | "Guest";
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

export interface CoachingHeldSteadyItem {
  id: string;
  timestampSeconds: number;
  title: string;
  description: string;
}

export interface CoachingStrainItem {
  id: string;
  timestampSeconds: number;
  title: string;
  description: string;
}

export interface CounterpartHandlingItem {
  area: string;
  assessment: string;
  status: "strong" | "developing" | "strained";
}

export interface PracticeDrill {
  id: string;
  title: string;
  description: string;
  type: "breathing" | "pause" | "reframing";
  scenarioSuggestionId?: string;
}

// EXACT 5 PRESSURE SKILLS (Derived exclusively from SDK signals)
export interface PressureSkillItem {
  id: "composure" | "recovery" | "pulse_control" | "autonomic_balance" | "expression_calm";
  name: "Composure" | "Recovery" | "Pulse control" | "Autonomic balance" | "Expression calm";
  score: number;
  assessment: string;
  subtext?: string;
}

export interface RecordingPressureCoaching {
  summarySentence: string;
  composureTier: ComposureTier;
  pressureMoments: PeakStressMoment[];
  whereHeldSteady: CoachingHeldSteadyItem[];
  whereShowedStrain: CoachingStrainItem[];
  counterpartHandling: CounterpartHandlingItem[];
  drills: PracticeDrill[];
  pressureSkills: PressureSkillItem[];
}

export interface Recording {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  personaId?: string;
  guestId?: string;
  personaName: string;
  guestName?: string;
  personaAvatarUrl?: string;
  guestAvatarUrl?: string;
  date: string;
  relativeDate: string;
  dateGroup: "Today" | "Yesterday" | "This Week" | "Earlier";
  durationSeconds: number;
  durationMinutes?: number;
  composureScore?: number;
  score?: number; // backward compatibility
  composureTier?: ComposureTier;
  nervousnessLevel?: NervousnessLevel;
  readinessStatus?: SessionReadinessStatus;
  status: "Completed" | "Too short" | "Incomplete";
  videoUrl?: string;
  mediaType?: "video" | "audio-only";
  transcript: TranscriptUtterance[];
  sessionBiometrics?: SessionBiometrics;
  pressureCoaching?: RecordingPressureCoaching;
  userNotes: RecordingUserNote[];
  selfReportedConfidence?: number;
  selfReflectionNotes?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  team: string;
  workspace: string;
  userId: string;
  avatarUrl?: string;
  streakDays: number;
  completedSessionsCount: number;
  averageComposure: number;
  // Aliases for backward compatibility
  department?: string;
  property?: string;
  averageRating?: number;
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  selectedCamera: string;
  selectedMicrophone: string;
  selectedSpeaker: string;
  autoStartAudio: boolean;
  hapticFeedback: boolean; // Turn-taking sounds
  reducedMotion: boolean;
  showDevDiagnostics: boolean;
  language: string;
  recordingsRetentionDays: number;
  heartRateSource: "mock" | "camera" | "bluetooth" | "unavailable";
  cameraPulseSource?: "camera" | "mock" | "unavailable";
  connectedSensorName?: string;
  telemetryEnabled: boolean;
  showHabitsInTranscript?: boolean;
  weeklyGoalSessions?: number;
}

// Utility to sanitize context settings, preventing duplication bugs
export function formatContextSetting(setting: string): string {
  if (!setting) return "";
  let cleaned = setting.trim();

  while (/^(room|suite|setting|call|meeting|office|panel)\s+/i.test(cleaned)) {
    const match = cleaned.match(/^(room|suite|setting|call|meeting|office|panel)\s+/i);
    if (match) {
      const remainder = cleaned.replace(/^(room|suite|setting|call|meeting|office|panel)\s+/i, "").trim();
      if (new RegExp(`^${match[1]}\\b`, "i").test(remainder)) {
        cleaned = remainder;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return cleaned;
}

// Compatibility helper: filters compatible personas for a given scenario
export function getCompatiblePersonas(scenario?: PracticeScenario | null, allPersonas: Persona[] = []): Persona[] {
  if (!scenario) return allPersonas || [];
  return (allPersonas || []).filter((persona) => {
    if (!persona) return false;
    if (
      persona.id === scenario.personaId ||
      persona.id === scenario.guestId ||
      persona.name === scenario.personaName ||
      persona.name === scenario.guestName
    ) {
      return true;
    }

    const allowedIds = scenario.allowedPersonaIds || scenario.allowedGuestIds;
    if (allowedIds && allowedIds.length > 0) {
      if (allowedIds.includes(persona.id)) {
        return true;
      }
      if (!scenario.allowedTraits || scenario.allowedTraits.length === 0) {
        return false;
      }
    }

    if (scenario.allowedTraits && scenario.allowedTraits.length > 0) {
      const hasMatchingTrait = (persona.temperamentTraits || []).some((trait) =>
        scenario.allowedTraits!.some((t) => t.toLowerCase() === trait.toLowerCase())
      );
      if (!hasMatchingTrait) return false;
    }

    return true;
  });
}

export function renderScenarioText(text: string, scenario?: PracticeScenario | null, persona?: Persona | null): string {
  if (!text) return "";
  if (!persona) return text;
  let rendered = text;

  const setting = formatContextSetting(persona.contextSetting || persona.roomNumber || "");
  const seniority = persona.seniority || persona.loyaltyTier || "";
  const tone = (persona.temperamentTraits || []).join(" & ") || persona.title || "";

  rendered = rendered.replace(/{{\s*persona\.name\s*}}/gi, persona.name || "Counterpart");
  rendered = rendered.replace(/{{\s*persona\.setting\s*}}/gi, setting);
  rendered = rendered.replace(/{{\s*persona\.title\s*}}/gi, persona.title || "");
  rendered = rendered.replace(/{{\s*persona\.seniority\s*}}/gi, seniority);
  rendered = rendered.replace(/{{\s*persona\.tone\s*}}/gi, tone);

  // Backward compatibility tags
  rendered = rendered.replace(/{{\s*guest\.name\s*}}/gi, persona.name || "Counterpart");
  rendered = rendered.replace(/{{\s*guest\.setting\s*}}/gi, setting);
  rendered = rendered.replace(/{{\s*guest\.roomNumber\s*}}/gi, setting);
  rendered = rendered.replace(/{{\s*guest\.room\s*}}/gi, setting);
  rendered = rendered.replace(/{{\s*guest\.title\s*}}/gi, persona.title || "");
  rendered = rendered.replace(/{{\s*guest\.loyaltyTier\s*}}/gi, seniority);
  rendered = rendered.replace(/{{\s*guest\.mood\s*}}/gi, tone);
  rendered = rendered.replace(/{{\s*guest\.tone\s*}}/gi, tone);

  const defaultName = scenario?.personaName || scenario?.guestName;
  if (defaultName && persona.name && persona.name !== defaultName) {
    const defaultNameRegex = new RegExp(defaultName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    rendered = rendered.replace(defaultNameRegex, persona.name);

    const nameParts = defaultName.split(" ");
    if (nameParts.length > 1) {
      const defaultLastName = nameParts[nameParts.length - 1];
      const personaNameParts = persona.name.split(" ");
      const personaLastName = personaNameParts[personaNameParts.length - 1];
      if (defaultLastName && personaLastName && defaultLastName !== personaLastName) {
        const lastNameRegex = new RegExp(`\\b${defaultLastName}\\b`, "g");
        rendered = rendered.replace(lastNameRegex, personaLastName);
      }
    }
  }

  return rendered;
}
