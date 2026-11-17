import type {
  Persona,
  PracticeScenario,
  UserProfile,
  Recording,
  AppSettings,
  UserBaseline,
  InteractionType,
  DifficultyLevel,
} from "../../src/types";
import { DEFAULT_USER_BASELINE } from "../../src/services/biometrics";
import { generateFixtureSessionBiometrics } from "./fixtureBiometrics";

export const INITIAL_USER: UserProfile = {
  name: "Elena Vance",
  email: "elena.vance@workspace.io",
  role: "Senior Strategy Lead",
  team: "Client Partnerships & Product",
  workspace: "mocktwo Workspace",
  userId: "USR-8402",
  streakDays: 4,
  completedSessionsCount: 6,
  averageComposure: 88,
  department: "Client Partnerships & Product",
  property: "mocktwo Workspace",
  employeeId: "USR-8402",
  averageRating: 88,
};

export const INITIAL_EMPLOYEE = INITIAL_USER;

export const INITIAL_SETTINGS: AppSettings = {
  theme: "dark",
  selectedCamera: "",
  selectedMicrophone: "",
  selectedSpeaker: "",
  autoStartAudio: true,
  hapticFeedback: true,
  reducedMotion: false,
  showDevDiagnostics: false,
  language: "English (US)",
  recordingsRetentionDays: 90,
  heartRateSource: "camera",
  cameraPulseSource: "camera",
  connectedSensorName: "SmartSpectra Optical Engine",
  telemetryEnabled: false,
};

export const INITIAL_BASELINE: UserBaseline = DEFAULT_USER_BASELINE;

export const INITIAL_PERSONAS: Persona[] = [
  {
    id: "persona-marcus",
    name: "Marcus Sterling",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    monogram: "MS",
    title: "Senior Investment Partner",
    contextSetting: "Executive Boardroom",
    setting: "Executive Boardroom",
    seniority: "Senior Executive",
    language: "English (US)",
    temperamentTraits: ["Skeptical", "Impatient", "Direct"],
    voice: "Onyx (Deep Authoritative)",
    backstory: "Senior partner reviewing budget allocations and risk projections. Known for interrogating small assumptions and expecting immediate, unflustered answers.",
    communicationNotes: "Probes financial margins and asks terse follow-ups. Expects calm ownership and minimal hesitation.",
    scenariosCount: 3,
    pressureLevel: "High",
    source: "Library",
  },
  {
    id: "persona-sarah",
    name: "Sarah Jenkins",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    monogram: "SJ",
    title: "VP of Enterprise Procurement",
    contextSetting: "Client Briefing Room",
    setting: "Client Briefing Room",
    seniority: "Key Client",
    language: "English (US)",
    temperamentTraits: ["Demanding", "Analytical", "Price-focused"],
    voice: "Shimmer (Clear Precise)",
    backstory: "Experienced software procurement lead renegotiating contract renewals. Uses silence, price pressure, and competitor leverage to test counterpart resolve.",
    communicationNotes: "Uses aggressive discount anchors and demands rapid concession responses. Observes signs of anxiety closely.",
    scenariosCount: 2,
    pressureLevel: "Intense",
    source: "Library",
  },
  {
    id: "persona-david",
    name: "David Sterling-Cole",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    monogram: "DC",
    title: "VP of Engineering & Architecture",
    contextSetting: "Panel Room",
    setting: "Panel Room",
    seniority: "Senior Executive",
    language: "English (US)",
    temperamentTraits: ["Rigorous", "Detail-oriented", "Skeptical"],
    voice: "Echo (Direct Technical)",
    backstory: "High-level technical leader conducting behavioral and situational interviews for leadership hires. Probes deeply into failure modes and architecture tradeoffs.",
    communicationNotes: "Interrupts surface-level explanations to examine root-cause ownership.",
    scenariosCount: 4,
    pressureLevel: "High",
    source: "Library",
  },
  {
    id: "persona-elena",
    name: "Elena Rostova",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    monogram: "ER",
    title: "Managing Director",
    contextSetting: "Strategy Suite",
    setting: "Strategy Suite",
    seniority: "Senior Executive",
    language: "English (US)",
    temperamentTraits: ["Unforgiving", "Time-pressured", "Inquisitive"],
    voice: "Nova (Warm Polished)",
    backstory: "Demanding board member and strategic investor. Expects concise executive summaries without filler or evasive explanations.",
    communicationNotes: "Watches physical composure and answers that start without strategic delay.",
    scenariosCount: 2,
    pressureLevel: "Intense",
    source: "Library",
  },
  {
    id: "persona-jordan",
    name: "Jordan Hayes",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    monogram: "JH",
    title: "Principal Peer Lead",
    contextSetting: "Huddle Room",
    setting: "Huddle Room",
    seniority: "Peer",
    language: "English (US)",
    temperamentTraits: ["Defensive", "Frustrated", "Direct"],
    voice: "Fable (British Expressive)",
    backstory: "Colleague facing project deadline friction and misaligned sprint deliverables. Prone to reactive pushback during status syncs.",
    communicationNotes: "Expresses frustration early. Tests your ability to de-escalate tension and maintain steady physiological calm.",
    scenariosCount: 3,
    pressureLevel: "Moderate",
    source: "Library",
  },
];

export const INITIAL_GUESTS = INITIAL_PERSONAS;

export const INITIAL_SCENARIOS: PracticeScenario[] = [
  {
    id: "sc-sales-pricing",
    title: "Handling a Late-Stage Pricing Objection",
    personaName: "Sarah Jenkins",
    personaId: "persona-sarah",
    contextSetting: "Zoom Conference",
    setting: "Zoom Conference",
    seniority: "Key Client",
    interactionType: "Sales & Pitches",
    difficulty: "Intermediate",
    durationMinutes: 3,
    summary: "An aggressive commercial buyer challenges your pricing proposal 48 hours before contract execution.",
    context: "Sarah Jenkins opens the call with an ultimatum: 'We reviewed the proposal with our CFO this morning, and we simply cannot sign unless you reduce ARR by 22% across all tiers.'",
    personaMood: "Demanding & Price-focused",
    personaTone: "Demanding & Price-focused",
    learningObjectives: [
      "Maintain calm resting pulse when anchor discount is presented",
      "Pause for 2 seconds before countering rather than reflexively conceding",
      "Re-anchor value without physical or facial signs of tension",
    ],
    keyChallenges: [
      "Immediate pulse spike when threatened with canceled deal",
      "Suppressing fear facial micro-expressions upon hearing competitor names",
    ],
    recommendedPhrases: [
      "I appreciate the CFO's focus on fiscal discipline. Let's look at the scope that justifies this investment.",
      "Before we discuss concessions, let's confirm whether the deliverable timeline remains the priority.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Demanding VP of Enterprise Procurement known for testing counterpart resolve under strict deadline pressure.",
    source: "Library",
    submissionStatus: "Approved",
    referenceMaterialName: "Q4 Commercial Deal Guidelines.pdf",
    successCriteria: [
      "Pulse elevation remains under +20 bpm vs baseline",
      "No immediate defensive concession in first 45 seconds",
      "Composure index above 80",
    ],
    allowedPersonaIds: ["persona-sarah", "persona-marcus"],
  },
  {
    id: "sc-interview-failure",
    title: "Situational Interview: Explaining a Failure",
    personaName: "David Sterling-Cole",
    personaId: "persona-david",
    contextSetting: "Panel Room",
    setting: "Panel Room",
    seniority: "Senior Executive",
    interactionType: "Interviews",
    difficulty: "Advanced",
    durationMinutes: 3,
    summary: "Practice steady accountability and concise narrative when probed by a skeptical hiring manager.",
    context: "David asks you to walk through the largest technical or operational failure in your recent career, probing specifically for whether you deflect accountability to team members.",
    personaMood: "Analytical & Inquisitive",
    personaTone: "Analytical & Inquisitive",
    learningObjectives: [
      "Acknowledge personal responsibility cleanly without defensive excuses",
      "Maintain autonomic steadiness (HRV and pulse) throughout cross-examination",
      "Structure learning takeaways clearly and calmly",
    ],
    keyChallenges: [
      "Heart rate acceleration during follow-up 'Why didn't you foresee that?'",
      "Preventing rapid blinking or nervous facial tension",
    ],
    recommendedPhrases: [
      "I owned that release milestone, and the scoping gap was ultimately my accountability.",
      "Here is the root cause retrospective and the safeguards we put in place.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Rigorous engineering VP known for deep root-cause questioning and zero tolerance for defensive narratives.",
    source: "Library",
    submissionStatus: "Approved",
    referenceMaterialName: "Leadership Competency Framework.pdf",
    successCriteria: [
      "Pulse recovery within 14 seconds following challenging interruption",
      "Neutral expression maintained above 75% of session",
    ],
    allowedPersonaIds: ["persona-david", "persona-marcus"],
  },
  {
    id: "sc-exec-presentation",
    title: "Opening to Skeptical Stakeholders",
    personaName: "Marcus Sterling",
    personaId: "persona-marcus",
    contextSetting: "Executive Boardroom",
    setting: "Executive Boardroom",
    seniority: "Senior Executive",
    interactionType: "Presentations",
    difficulty: "Advanced",
    durationMinutes: 3,
    summary: "Deliver the first 3 minutes of a high-stakes proposal to partners who want to cut your budget.",
    context: "Marcus interrupts your introductory slide: 'We have 15 minutes, Elena. Skip the context slides and show me why this investment shouldn't be deferred.'",
    personaMood: "Skeptical & Direct",
    personaTone: "Skeptical & Direct",
    learningObjectives: [
      "Pivot narrative immediately without visible fluster or pulse spike",
      "Deliver high-impact value metrics with steady physiological composure",
      "Hold quiet deliberate pause while receiving sharp interruptions",
    ],
    keyChallenges: [
      "Overcoming initial sympathetic surge when presentation order is disrupted",
      "Suppressing autonomic arousal during unexpected time cuts",
    ],
    recommendedPhrases: [
      "Understood. Let's look directly at the unit economics and the 90-day breakeven.",
      "Here is the bottom-line delta that makes this urgent for Q1.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Senior Investment Partner known for testing presenter poise by interrupting slide decks.",
    source: "Library",
    submissionStatus: "Approved",
    allowedPersonaIds: ["persona-marcus", "persona-elena"],
  },
  {
    id: "sc-negotiation-discount",
    title: "Contract Renewal Deadlock",
    personaName: "Elena Rostova",
    personaId: "persona-elena",
    contextSetting: "Strategy Suite",
    setting: "Strategy Suite",
    seniority: "Senior Executive",
    interactionType: "Negotiation",
    difficulty: "Advanced",
    durationMinutes: 3,
    summary: "Hold your ground on multi-year terms when facing an aggressive counter-offer.",
    context: "Elena threatens to pause the deployment unless terms are modified: 'We have competitive proposals that offer identical capability at 30% lower cost.'",
    personaMood: "Unforgiving & Time-pressured",
    personaTone: "Unforgiving & Time-pressured",
    learningObjectives: [
      "Absorb competitive ultimatums without autonomic pulse spike",
      "Employ silent 2-second pause before responding to pricing pressure",
      "Protect pricing integrity with composed, factual justification",
    ],
    keyChallenges: [
      "Pulse exceeding 100 bpm during threat of canceled relationship",
      "Maintaining calm facial expression under direct time ultimatums",
    ],
    recommendedPhrases: [
      "We respect your mandate for efficiency, but we cannot compromise on implementation quality.",
      "Let's review the true cost of migration versus the locked guarantees we provide.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Managing director testing whether sales leaders break composure under ultimatum leverage.",
    source: "Library",
    submissionStatus: "Approved",
    allowedPersonaIds: ["persona-elena", "persona-sarah"],
  },
  {
    id: "sc-difficult-feedback",
    title: "Delivering Difficult Performance Feedback",
    personaName: "Jordan Hayes",
    personaId: "persona-jordan",
    contextSetting: "Huddle Room",
    setting: "Huddle Room",
    seniority: "Peer",
    interactionType: "Difficult Conversations",
    difficulty: "Intermediate",
    durationMinutes: 3,
    summary: "Address repeated sprint delivery delays with a defensive colleague without escalating conflict.",
    context: "Jordan reacts with frustration when you bring up missed project milestones: 'I'm carrying twice the workload of anyone else on this squad, and now you're nitpicking my timeline?'",
    personaMood: "Defensive & Frustrated",
    personaTone: "Defensive & Frustrated",
    learningObjectives: [
      "Stay grounded and maintain quiet breathing cadence when counterpart vents",
      "De-escalate emotional reactivity through calm acknowledgement",
      "Re-focus conversation on concrete objective agreements",
    ],
    keyChallenges: [
      "Mirroring peer emotional agitation with sympathetic arousal",
      "Managing autonomic return during uncomfortable defensive pauses",
    ],
    recommendedPhrases: [
      "I see how hard you have pushed on this release, and that effort isn't unnoticed.",
      "Let's step back from the sprint pressure and look at how we eliminate the delivery bottleneck.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Talented colleague experiencing burnout and defensive reactivity during critical reviews.",
    source: "Library",
    submissionStatus: "Approved",
    allowedPersonaIds: ["persona-jordan"],
  },
  {
    id: "sc-customer-escalation",
    title: "Critical Service Outage De-escalation",
    personaName: "Sarah Jenkins",
    personaId: "persona-sarah",
    contextSetting: "Video Bridge",
    setting: "Video Bridge",
    seniority: "Key Client",
    interactionType: "Customer Service",
    difficulty: "Intermediate",
    durationMinutes: 3,
    summary: "Face an enraged enterprise stakeholder whose primary workflow was interrupted by a platform outage.",
    context: "Sarah demands immediate answers: 'We lost three hours of core operational data this morning. I need to know why our account team didn't notify us before the downtime.'",
    personaMood: "Demanding & Agitated",
    personaTone: "Demanding & Agitated",
    learningObjectives: [
      "Maintain calm pulse baseline when confronted with client anger",
      "Offer empathetic validation before technical explanations",
      "Provide clear incident containment steps with steady composure",
    ],
    keyChallenges: [
      "Physiological anxiety spike when customer threatens executive escalation",
      "Maintaining calm facial composure and controlled respiration",
    ],
    recommendedPhrases: [
      "I completely understand your frustration with this downtime. Let me give you the verified facts.",
      "Here is the exact failover protocol that is now protecting your workflow.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Enterprise customer demanding transparent incident recovery under severe business pressure.",
    source: "Library",
    submissionStatus: "Approved",
    allowedPersonaIds: ["persona-sarah", "persona-marcus"],
  },
  {
    id: "sc-hospitality-vip",
    title: "Late Arrival & Room Reassignment",
    personaName: "Marcus Sterling",
    personaId: "persona-marcus",
    contextSetting: "Main Suite Lounge",
    setting: "Main Suite Lounge",
    seniority: "Key Client",
    interactionType: "Hospitality",
    difficulty: "Advanced",
    durationMinutes: 3,
    summary: "Handling an exhausted late-night arrival whose reserved suite requires emergency maintenance.",
    context: "Marcus arrives at midnight following flight cancellations expecting his reserved suite to be ready immediately.",
    personaMood: "Exhausted & Critical",
    personaTone: "Exhausted & Critical",
    learningObjectives: [
      "Provide immediate sanctuary while coordinating alternative suite accommodations",
      "Maintain poised, empathetic composure under sharp criticism",
      "De-escalate traveler fatigue with rapid, generous solutions",
    ],
    keyChallenges: [
      "Managing sympathetic pulse acceleration when guest threatens cancellation",
      "Maintaining serene facial demeanor during midnight logistical stress",
    ],
    recommendedPhrases: [
      "While we finalize a preferred executive alternative, let me welcome you to our private lounge.",
      "I am personally taking responsibility for your comfort this evening.",
    ],
    personaAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Exhausted executive traveler arriving late under intense logistical strain.",
    source: "Library",
    submissionStatus: "Approved",
    allowedPersonaIds: ["persona-marcus"],
  },
];

// 7 MOCK SESSIONS REQUIRED BY THE SDK TRUTH SPECIFICATION:
// 1. 75 s (Full read, all 5 signals, RMSSD & Baevsky active, composure 92)
// 2. 41 s (Standard, 4 signals: pulse, recovery, EDA, face; HRV warming up, composure 86)
// 3. 18 s (Quick read, 2 signals: pulse & recovery; breathing/EDA/HRV warming up, composure 78)
// 4. 8 s (Too short, < 12 s, no composure score, status: "Too short")
// 5. 60 s with mid-session EXCESSIVE_MOTION stretch (clean 46 of 60 s, composure 71)
// 6. 52 s with out-of-range pulse (> 110 bpm, emits "outOfRange", composure 54)
// 7. 30 s with no biometrics (optical camera disabled / unavailable)

export const INITIAL_RECORDINGS: Recording[] = [
  // 1. 75 s FULL READ SESSION
  {
    id: "rec-full-75s",
    scenarioId: "sc-interview-failure",
    scenarioTitle: "Situational Interview: Explaining a Failure",
    personaId: "persona-david",
    personaName: "David Sterling-Cole",
    personaAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    date: "Today, 10:15 AM",
    relativeDate: "Today",
    dateGroup: "Today",
    durationMinutes: 1.25,
    durationSeconds: 75,
    composureScore: 92,
    score: 92,
    composureTier: "Composed",
    nervousnessLevel: "Calm",
    readinessStatus: "Full read",
    status: "Completed",
    mediaType: "video",
    sessionBiometrics: generateFixtureSessionBiometrics(
      75,
      "Advanced",
      ["Analytical", "Inquisitive", "Challenging"],
      "High",
      INITIAL_BASELINE
    ),
    pressureCoaching: {
      summarySentence: "Full read: All 5 physiological signals measured cleanly. Autonomic return occurred in approx. 14 seconds.",
      composureTier: "Composed",
      pressureMoments: [
        {
          timestampSeconds: 26,
          counterpartQuote: "Who on your team made that scoping assumption, and why wasn't it caught earlier?",
          reaction: "Pulse rose from 68 to 86 bpm (+18 vs baseline). Fear expression registered 28%.",
          userAction: "Maintained steady breathing cadence and paused for 1.8 seconds before answering.",
          suggestion: "Take an intentional diaphragmatic breath to blunt the initial pulse surge before countering.",
        },
        {
          timestampSeconds: 52,
          counterpartQuote: "That sounds like a post-mortem rationalization. What did the client say when you told them?",
          reaction: "Pulse recovered to 72 bpm. EDA arousal delta held low (+0.14 relative).",
          userAction: "Facial composure remained centered at 82% neutral baseline.",
          suggestion: "High composure. Keep shoulders relaxed through closing remarks.",
        },
      ],
      whereHeldSteady: [
        {
          id: "hs-1",
          timestampSeconds: 28,
          title: "Rapid Pulse Recovery",
          description: "Cardiac rate stabilized back to resting window within 14 seconds after initial confrontation.",
        },
        {
          id: "hs-2",
          timestampSeconds: 56,
          title: "Facial Tension Dampening",
          description: "Neutral facial baseline held steady across 84% of probing dialogue.",
        },
      ],
      whereShowedStrain: [
        {
          id: "ss-1",
          timestampSeconds: 24,
          title: "Acute Autonomic Rise",
          description: "Transient pulse rise of +18 bpm detected when David questioned scoping oversight.",
        },
      ],
      counterpartHandling: [
        {
          area: "Acknowledging Points",
          assessment: "Directly acknowledged the validity of the technical critique.",
          status: "strong",
        },
        {
          area: "Answering vs Dodging",
          assessment: "Answered directly before providing relevant context.",
          status: "strong",
        },
        {
          area: "Turn Management",
          assessment: "Allowed counterpart to complete thoughts without premature interruption.",
          status: "strong",
        },
      ],
      drills: [
        {
          id: "drill-1",
          title: "Two-Second Pause Before Direct Answers",
          description: "Incorporate an intentional 2-second pause before countering difficult accountability questions.",
          type: "pause",
        },
        {
          id: "drill-2",
          title: "Calm Diaphragmatic Breath Reset",
          description: "Practice smooth abdominal exhalation to dampen sympathetic cardiac acceleration.",
          type: "breathing",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 94,
          assessment: "Autonomic stability held through confrontation",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 91,
          assessment: "Pulse returned to baseline in approx. 14 seconds",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 90,
          assessment: "Pulse stayed strictly within 40–110 bpm window",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 88,
          assessment: "Baevsky index within +14% of baseline",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 92,
          assessment: "Neutral facial baseline maintained across 82% of dialogue",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Elena, walk me through the largest technical or operational failure in your recent career. Who on your team made that scoping assumption?",
        timestampSeconds: 4,
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "I owned that release milestone directly. We miscalculated the database migration indexing window, and that responsibility was mine.",
        timestampSeconds: 28,
      },
      {
        id: "tr-3",
        speaker: "Persona",
        text: "That sounds like a post-mortem rationalization. What did the client say when you told them?",
        timestampSeconds: 48,
      },
      {
        id: "tr-4",
        speaker: "You",
        text: "We contacted them within twenty minutes with an executive RCA and our immediate failover rollback. The transparency preserved the contract.",
        timestampSeconds: 58,
      },
    ],
    userNotes: [],
  },

  // 2. 41 s STANDARD SESSION (4 signals active, HRV warming up / not enough time)
  {
    id: "rec-standard-41s",
    scenarioId: "sc-sales-pricing",
    scenarioTitle: "Handling a Late-Stage Pricing Objection",
    personaId: "persona-sarah",
    personaName: "Sarah Jenkins",
    personaAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    date: "Yesterday, 3:45 PM",
    relativeDate: "Yesterday",
    dateGroup: "Yesterday",
    durationMinutes: 0.7,
    durationSeconds: 41,
    composureScore: 86,
    score: 86,
    composureTier: "Composed",
    nervousnessLevel: "Mild",
    readinessStatus: "Quick read",
    status: "Completed",
    mediaType: "video",
    sessionBiometrics: generateFixtureSessionBiometrics(
      41,
      "Intermediate",
      ["Demanding", "Price-focused"],
      "Intense",
      INITIAL_BASELINE
    ),
    pressureCoaching: {
      summarySentence: "Quick read: Pulse, recovery, breathing and face measured. HRV requires 60 s of steady measurement.",
      composureTier: "Composed",
      pressureMoments: [
        {
          timestampSeconds: 16,
          counterpartQuote: "We simply cannot sign unless you reduce ARR by 22% across all tiers.",
          reaction: "Pulse increased to 94 bpm (+26 vs baseline). Blink frequency rose to 26/min.",
          userAction: "Paused for 2 seconds and re-anchored on deliverable scope.",
          suggestion: "Avoid verbal rush when countering price anchors; keep vocal start slow.",
        },
      ],
      whereHeldSteady: [
        {
          id: "hs-1",
          timestampSeconds: 20,
          title: "Controlled Re-anchor",
          description: "Maintained steady eye-line and avoided physical concession fidgeting.",
        },
      ],
      whereShowedStrain: [
        {
          id: "ss-1",
          timestampSeconds: 16,
          title: "Cardiac Spike Upon Discount Anchor",
          description: "Pulse surged to 94 bpm immediately upon 22% cut demand.",
        },
      ],
      counterpartHandling: [
        {
          area: "Tone Matching",
          assessment: "Remained polite and composed despite sharp discount pressure.",
          status: "strong",
        },
      ],
      drills: [
        {
          id: "drill-1",
          title: "Anchor Pause Drill",
          description: "Hold a silent 2-second pause before acknowledging discount demands.",
          type: "pause",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 88,
          assessment: "Good composure under sharp discount ultimatum",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 85,
          assessment: "Autonomic recovery within approx. 18 seconds",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 84,
          assessment: "Pulse controlled under 95 bpm",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 80,
          assessment: "Session under 60 s (partial estimation)",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 89,
          assessment: "Neutral baseline held across 76% of conversation",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Elena, our CFO reviewed the proposal this morning. We simply cannot sign unless you reduce ARR by 22% across all tiers.",
        timestampSeconds: 6,
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "I understand the CFO's mandate for fiscal discipline. Let's look at the implementation scope that justifies this investment.",
        timestampSeconds: 22,
      },
    ],
    userNotes: [],
  },

  // 3. 18 s QUICK READ SESSION (2 signals: pulse & recovery; breathing/EDA/HRV warming up)
  {
    id: "rec-quick-18s",
    scenarioId: "sc-exec-presentation",
    scenarioTitle: "Opening to Skeptical Stakeholders",
    personaId: "persona-marcus",
    personaName: "Marcus Sterling",
    personaAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    date: "3 days ago",
    relativeDate: "3 days ago",
    dateGroup: "This Week",
    durationMinutes: 0.3,
    durationSeconds: 18,
    composureScore: 78,
    score: 78,
    composureTier: "Steady",
    nervousnessLevel: "Mild",
    readinessStatus: "Quick read",
    status: "Completed",
    mediaType: "video",
    sessionBiometrics: generateFixtureSessionBiometrics(
      18,
      "Advanced",
      ["Skeptical", "Impatient"],
      "High",
      INITIAL_BASELINE
    ),
    pressureCoaching: {
      summarySentence: "Quick read (partial): Based on 2 of 5 signals (pulse & face). Breathing needs 30 s, HRV needs 60 s.",
      composureTier: "Steady",
      pressureMoments: [
        {
          timestampSeconds: 14,
          counterpartQuote: "Skip the context slides, Elena. Show me why this shouldn't be deferred.",
          reaction: "Pulse registered 88 bpm (+20 vs baseline). Neutral expression dipped to 64%.",
          userAction: "Transitioned immediately to slide three without apologizing.",
          suggestion: "Excellent pivot. Maintain steady shoulders while adjusting presentation order.",
        },
      ],
      whereHeldSteady: [
        {
          id: "hs-1",
          timestampSeconds: 15,
          title: "Immediate Adaptation",
          description: "Accepted executive directive without visible defensive resistance.",
        },
      ],
      whereShowedStrain: [
        {
          id: "ss-1",
          timestampSeconds: 13,
          title: "Startle Reaction",
          description: "Surprise expression registered 24% when Marcus cut off the introduction.",
        },
      ],
      counterpartHandling: [
        {
          area: "Executive Agility",
          assessment: "Adapted slide flow immediately to client preferences.",
          status: "strong",
        },
      ],
      drills: [
        {
          id: "drill-1",
          title: "Slide Cut Recovery Drill",
          description: "Practice starting presentation directly on unit economics slide.",
          type: "reframing",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 80,
          assessment: "Steady recovery under abrupt slide cutoff",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 78,
          assessment: "Pulse stabilizing (quick read approx.)",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 77,
          assessment: "Pulse kept below 90 bpm",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 74,
          assessment: "HRV unavailable (session < 60 s)",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 81,
          assessment: "Facial composure preserved through surprise",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Skip the context slides, Elena. Show me why this shouldn't be deferred.",
        timestampSeconds: 6,
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "Understood. Let's look directly at the unit economics and the 90-day breakeven.",
        timestampSeconds: 14,
      },
    ],
    userNotes: [],
  },

  // 4. 8 s TOO SHORT SESSION (no score, under 12 s)
  {
    id: "rec-short-8s",
    scenarioId: "sc-difficult-feedback",
    scenarioTitle: "Delivering Difficult Performance Feedback",
    personaId: "persona-jordan",
    personaName: "Jordan Hayes",
    personaAvatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    date: "4 days ago",
    relativeDate: "4 days ago",
    dateGroup: "This Week",
    durationMinutes: 0.13,
    durationSeconds: 8,
    composureScore: undefined,
    score: 0,
    composureTier: "Building",
    nervousnessLevel: "Mild",
    readinessStatus: "Too short",
    status: "Too short",
    mediaType: "video",
    sessionBiometrics: generateFixtureSessionBiometrics(
      8,
      "Intermediate",
      ["Defensive", "Frustrated"],
      "Moderate",
      INITIAL_BASELINE
    ),
    pressureCoaching: {
      summarySentence: "Too short: Session ended in 8 seconds. Pulse measurement requires at least 12 s of steady measurement.",
      composureTier: "Building",
      pressureMoments: [],
      whereHeldSteady: [],
      whereShowedStrain: [],
      counterpartHandling: [],
      drills: [
        {
          id: "drill-1",
          title: "Full Conversation Practice",
          description: "Complete at least 30 seconds to capture breathing and pulse stability metrics.",
          type: "breathing",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 0,
          assessment: "Insufficient session duration for analysis",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 0,
          assessment: "Insufficient session duration for analysis",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 0,
          assessment: "Insufficient session duration for analysis",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 0,
          assessment: "Insufficient session duration for analysis",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 0,
          assessment: "Insufficient session duration for analysis",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Elena, what is this sync regarding?",
        timestampSeconds: 3,
      },
    ],
    userNotes: [],
  },

  // 5. 60 s WITH MID-SESSION EXCESSIVE_MOTION STRETCH (clean 46 of 60 s)
  {
    id: "rec-motion-60s",
    scenarioId: "sc-negotiation-discount",
    scenarioTitle: "Contract Renewal Deadlock",
    personaId: "persona-elena",
    personaName: "Elena Rostova",
    personaAvatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    date: "5 days ago",
    relativeDate: "5 days ago",
    dateGroup: "Earlier",
    durationMinutes: 1,
    durationSeconds: 60,
    composureScore: 71,
    score: 71,
    composureTier: "Steady",
    nervousnessLevel: "Moderate",
    readinessStatus: "Full read",
    status: "Completed",
    mediaType: "video",
    sessionBiometrics: generateFixtureSessionBiometrics(
      60,
      "Advanced",
      ["Unforgiving", "Time-pressured"],
      "Intense",
      INITIAL_BASELINE,
      [{ startSec: 18, endSec: 32, code: "EXCESSIVE_MOTION" }]
    ),
    pressureCoaching: {
      summarySentence: "Full read: Coverage 46 of 60 s cleanly measured. Movement at 18–32 s reduced optical confidence.",
      composureTier: "Steady",
      pressureMoments: [
        {
          timestampSeconds: 22,
          counterpartQuote: "We have competitive proposals that offer identical capability at 30% lower cost.",
          reaction: "Movement artifact detected. Pulse reading dropped to low confidence temporarily.",
          userAction: "Adjusted chair position before returning to steady seated position.",
          suggestion: "Please remain still during measurement to ensure continuous optical accuracy.",
        },
      ],
      whereHeldSteady: [
        {
          id: "hs-1",
          timestampSeconds: 42,
          title: "Post-Motion Stability",
          description: "Regained steady camera alignment and resting pulse control in second half of call.",
        },
      ],
      whereShowedStrain: [
        {
          id: "ss-1",
          timestampSeconds: 20,
          title: "Physical Fidgeting",
          description: "Excessive motion detected between 18–32 s during Elena's pricing challenge.",
        },
      ],
      counterpartHandling: [
        {
          area: "Physical Poise",
          assessment: "Minimize physical readjustments while receiving high-pressure challenges.",
          status: "developing",
        },
      ],
      drills: [
        {
          id: "drill-1",
          title: "Stillness Under Pressure",
          description: "Maintain grounded shoulder and head position when facing direct pushback.",
          type: "pause",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 72,
          assessment: "Moderate composure with temporary motion disruption",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 70,
          assessment: "Autonomic recovery delayed by physical fidgeting",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 74,
          assessment: "Signal interrupted during 14-second motion window",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 69,
          assessment: "HRV confidence reduced during movement phase",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 73,
          assessment: "Contempt and fear micro-expressions detected during dispute",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Elena, we have competitive proposals that offer identical capability at 30% lower cost.",
        timestampSeconds: 12,
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "We respect your mandate for efficiency, but we cannot compromise on verified SLA guarantees.",
        timestampSeconds: 38,
      },
    ],
    userNotes: [],
  },

  // 6. 52 s OUT-OF-RANGE PULSE SESSION (> 110 bpm)
  {
    id: "rec-outofrange-52s",
    scenarioId: "sc-customer-escalation",
    scenarioTitle: "Critical Service Outage De-escalation",
    personaId: "persona-sarah",
    personaName: "Sarah Jenkins",
    personaAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    date: "6 days ago",
    relativeDate: "6 days ago",
    dateGroup: "Earlier",
    durationMinutes: 0.86,
    durationSeconds: 52,
    composureScore: 54,
    score: 54,
    composureTier: "Building",
    nervousnessLevel: "High",
    readinessStatus: "Quick read",
    status: "Completed",
    mediaType: "video",
    sessionBiometrics: generateFixtureSessionBiometrics(
      52,
      "Intermediate",
      ["Demanding", "Agitated"],
      "Intense",
      INITIAL_BASELINE,
      [],
      true // forceOutOfRange = true
    ),
    pressureCoaching: {
      summarySentence: "Quick read: Pulse spiked above 110 bpm (out of measurement range) during escalation threat.",
      composureTier: "Building",
      pressureMoments: [
        {
          timestampSeconds: 24,
          counterpartQuote: "We lost three hours of core operational data. I need to know why our account team didn't notify us.",
          reaction: "Pulse exceeded 110 bpm (>outOfRange marker). Fear facial expression registered 42%.",
          userAction: "Spoke rapidly without pausing to reset physiological state.",
          suggestion: "Take an immediate pause. Extended exhalation will help prevent pulse spike above range.",
        },
      ],
      whereHeldSteady: [
        {
          id: "hs-1",
          timestampSeconds: 44,
          title: "Factual Recovery",
          description: "Delivered incident timeline accurately despite intense cardiac acceleration.",
        },
      ],
      whereShowedStrain: [
        {
          id: "ss-1",
          timestampSeconds: 26,
          title: "Pulse Out of Range (>110 bpm)",
          description: "Elevated sympathetic activation pushed heart rate past the 110 bpm optical tracking boundary.",
        },
      ],
      counterpartHandling: [
        {
          area: "Autonomic Pacing",
          assessment: "Practice silent breath intake when client raises voice.",
          status: "strained",
        },
      ],
      drills: [
        {
          id: "drill-1",
          title: "Cardiac De-escalation Reset",
          description: "Practice slowing exhalation to keep cardiac rate under 100 bpm during heated confrontation.",
          type: "breathing",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 52,
          assessment: "Severe physiological strain during confrontation",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 50,
          assessment: "Delayed recovery following out-of-range pulse surge",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 48,
          assessment: "Cardiac rate exceeded 110 bpm range limit",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 56,
          assessment: "HRV unavailable (session < 60 s)",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 62,
          assessment: "Elevated fear and surprise micro-expressions",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Sarah, we lost three hours of core operational data this morning. I need to know why our account team didn't notify us before the downtime.",
        timestampSeconds: 8,
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "I completely understand the severity of this disruption. Here is the exact containment protocol now in place.",
        timestampSeconds: 32,
      },
    ],
    userNotes: [],
  },

  // 7. 30 s NO BIOMETRICS SESSION (camera pulse measurement unavailable)
  {
    id: "rec-nobiometrics-30s",
    scenarioId: "sc-hospitality-vip",
    scenarioTitle: "Late Arrival & Room Reassignment",
    personaId: "persona-marcus",
    personaName: "Marcus Sterling",
    personaAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    date: "1 week ago",
    relativeDate: "1 week ago",
    dateGroup: "Earlier",
    durationMinutes: 0.5,
    durationSeconds: 30,
    composureScore: undefined,
    score: 0,
    composureTier: "Building",
    nervousnessLevel: "Mild",
    readinessStatus: "Quick read",
    status: "Completed",
    mediaType: "video",
    sessionBiometrics: {
      pulse: {
        rate: [],
        baselineValue: 68,
        state: "unavailable",
        confidence: 0,
        windowSeconds: 12,
        rangeBpm: "40–110 bpm",
        hasOutOfRange: false,
      },
      waveform: {
        samples: [],
        state: "unavailable",
      },
      hrv: {
        trace: [],
        state: "unavailable",
        confidence: 0,
        windowSeconds: 60,
      },
      breathing: {
        rate: [],
        state: "unavailable",
        confidence: 0,
        windowSeconds: 30,
        rangeBpm: "5–40 br/min",
      },
      eda: {
        trace: [],
        state: "unavailable",
        startSeconds: 35,
      },
      face: {
        trace: [],
        expressionAverages: {
          neutral: 0.8,
          fear: 0.05,
          contempt: 0.05,
          surprise: 0.05,
          sad: 0.02,
          happy: 0.01,
          disgust: 0.01,
          angry: 0.01,
        },
        blinkRatePerMin: 0,
        speakingSharePct: 0,
        state: "unavailable",
      },
      validationEvents: [
        {
          timestampSeconds: 0,
          code: "NO_FACE_FOUND",
          hintText: "Position your face directly in front of the camera",
        },
      ],
      cleanMeasuredSeconds: 0,
      totalDurationSeconds: 30,
      coverageRatio: "Coverage: 0 of 30 s measured cleanly",
      readinessStatus: "Quick read",
      signalsAvailableCount: 0,
      isPartialScore: true,
      nervousnessLevel: "Mild",
      peakStressMoments: [],
      source: "unavailable",
    },
    pressureCoaching: {
      summarySentence: "Camera pulse measurement was unavailable for this session. Video stream could not detect landmarks.",
      composureTier: "Building",
      pressureMoments: [],
      whereHeldSteady: [],
      whereShowedStrain: [],
      counterpartHandling: [],
      drills: [
        {
          id: "drill-1",
          title: "Lighting & Framing Setup",
          description: "Ensure even front lighting and unobstructed camera view before launching practice.",
          type: "breathing",
        },
      ],
      pressureSkills: [
        {
          id: "composure",
          name: "Composure",
          score: 0,
          assessment: "Biometrics unavailable",
          subtext: "How steadily your body managed acute stress",
        },
        {
          id: "recovery",
          name: "Recovery",
          score: 0,
          assessment: "Biometrics unavailable",
          subtext: "Speed of autonomic return after pressure peaks",
        },
        {
          id: "pulse_control",
          name: "Pulse control",
          score: 0,
          assessment: "Biometrics unavailable",
          subtext: "Cardiac acceleration control under scrutiny",
        },
        {
          id: "autonomic_balance",
          name: "Autonomic balance",
          score: 0,
          assessment: "Biometrics unavailable",
          subtext: "Parasympathetic vs sympathetic tone",
        },
        {
          id: "expression_calm",
          name: "Expression calm",
          score: 0,
          assessment: "Biometrics unavailable",
          subtext: "Facial tension dampening and stability",
        },
      ],
    },
    transcript: [
      {
        id: "tr-1",
        speaker: "Persona",
        text: "Marcus here. I have arrived at midnight and my reserved suite is unavailable?",
        timestampSeconds: 6,
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "Welcome Marcus. Allow me to offer immediate lounge sanctuary while we finalize an upgraded alternative.",
        timestampSeconds: 18,
      },
    ],
    userNotes: [],
  },
];

export async function generateScenarioDraft(
  prompt: string,
  attachedDocName?: string
): Promise<Partial<PracticeScenario>> {
  await new Promise((res) => setTimeout(res, 500));

  const lower = prompt.toLowerCase();
  let interactionType: InteractionType = "Interviews";
  let difficulty: DifficultyLevel = "Intermediate";
  let title = "High-Stakes Conversation Practice";
  let persona = INITIAL_PERSONAS[0];

  if (lower.includes("interview") || lower.includes("hiring") || lower.includes("job")) {
    interactionType = "Interviews";
    title = "Technical & Behavioral Interview";
    persona = INITIAL_PERSONAS[2];
  } else if (lower.includes("pricing") || lower.includes("sales") || lower.includes("discount") || lower.includes("deal")) {
    interactionType = "Sales & Pitches";
    title = "Enterprise Pitch & Pricing Objection";
    persona = INITIAL_PERSONAS[1];
  } else if (lower.includes("board") || lower.includes("presentation") || lower.includes("exec") || lower.includes("leadership")) {
    interactionType = "Presentations";
    difficulty = "Advanced";
    title = "Executive Q&A Presentation";
    persona = INITIAL_PERSONAS[0];
  } else if (lower.includes("negotiat") || lower.includes("contract") || lower.includes("terms")) {
    interactionType = "Negotiation";
    difficulty = "Advanced";
    title = "Contract Renewal Negotiation";
    persona = INITIAL_PERSONAS[3];
  } else if (lower.includes("feedback") || lower.includes("conflict") || lower.includes("difficult") || lower.includes("performance")) {
    interactionType = "Difficult Conversations";
    difficulty = "Advanced";
    title = "Direct Performance Feedback";
    persona = INITIAL_PERSONAS[4];
  } else if (lower.includes("hotel") || lower.includes("hospitality") || lower.includes("guest")) {
    interactionType = "Hospitality";
    difficulty = "Advanced";
    title = "High-Tier Client Incident Resolution";
    persona = INITIAL_PERSONAS[0];
  }

  return {
    title,
    personaName: persona.name,
    personaId: persona.id,
    guestName: persona.name,
    guestId: persona.id,
    contextSetting: persona.contextSetting,
    setting: persona.contextSetting,
    seniority: persona.seniority,
    interactionType,
    difficulty,
    durationMinutes: 3,
    summary: prompt.trim() || "Practice session synthesized for pressure resilience and composure.",
    context: `Scenario synthesized from prompt: "${prompt.slice(0, 100)}..." ${
      attachedDocName ? `Aligned with document: ${attachedDocName}` : ""
    }`,
    personaMood: persona.temperamentTraits.join(" & "),
    personaTone: persona.temperamentTraits.join(" & "),
    guestMood: persona.temperamentTraits.join(" & "),
    learningObjectives: [
      "Acknowledge personal accountability without defensiveness",
      "Maintain calm diaphragmatic breathing cadence under direct challenge",
      "De-escalate tension and steer toward a constructive outcome",
    ],
    keyChallenges: [
      "Managing spike in heart rate during direct challenge",
      "Preventing rapid blinking and facial tension",
    ],
    recommendedPhrases: [
      "I appreciate the direct feedback. Here is the context and my recommended next step.",
      "Let's break down the underlying concern together.",
    ],
    personaAvatarUrl: persona.avatarUrl,
    guestAvatarUrl: persona.avatarUrl,
    personaSummary: persona.backstory,
    source: "Mine",
    submissionStatus: "Draft",
    referenceMaterialName: attachedDocName,
    successCriteria: [
      "Zero defensive language",
      "Composure maintained under peak stress",
      "Constructive resolution achieved",
    ],
  };
}
