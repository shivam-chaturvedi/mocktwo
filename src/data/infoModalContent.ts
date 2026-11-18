import { WELLNESS_DISCLAIMER } from "../services/biometrics.ts";

export type MetricType =
  | "recovery"
  | "pulse"
  | "hrv"
  | "baevsky"
  | "breathing"
  | "blinks"
  | "speaking"
  | "composure"
  | "autonomic_balance"
  | "expression_calm";

export interface MetricDefinition {
  title: string;
  category: string;
  accent: string;
  simpleExplanation: string;
  whyItMatters: string;
  formulaLabel: string;
  formula: string;
  targetRange: string;
  targetDescription: string;
  howToImprove: string;
}

export const METRIC_MODAL_DEFINITIONS: Record<MetricType, MetricDefinition> = {
  recovery: {
    title: "Autonomic Recovery Time",
    category: "Autonomic Nervous System & Vagal Tone",
    accent: "var(--accent-green)",
    simpleExplanation:
      "Recovery is your body's 'brake pedal'. When an AI counterpart challenges you or interrupts, your heart naturally speeds up. Recovery measures how many seconds it takes for your pulse to return back within +5 bpm of your calm resting baseline after reaching peak tension.",
    whyItMatters:
      "In high-stakes conversations, having your heart speed up is normal human biology. What distinguishes master communicators is not having zero stress, but how rapidly their body recovers back to calm so their voice stays steady and their thinking stays clear.",
    formulaLabel: "Mathematical Latency & Scoring Formula",
    formula:
      "RecoveryLatency = Time(Pulse <= Baseline + 5 bpm) - Time(PeakPulseSpike)\nRecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)",
    targetRange: "≤ 12 seconds (Instant to Fast)",
    targetDescription:
      "• 1s–12s: Resilient vagal return (Unshakeable / Composed).\n• 13s–20s: Moderate recovery tail (Steady).\n• > 25s: Prolonged autonomic arousal (you carried tension into subsequent speaking turns).",
    howToImprove:
      "Take an intentional 1.5-second pause before replying to an objection. A slow exhale through the mouth activates the vagus nerve and immediately drops your pulse back down.",
  },
  pulse: {
    title: "Pulse & Peak Acceleration",
    category: "Cardiovascular Telemetry",
    accent: "var(--accent-red)",
    simpleExplanation:
      "Your pulse rate in beats per minute (bpm), tracked continuously from your webcam by observing micro-capillary blood flow in your face. It monitors both your average heart rate and the peak spike reached when the conversation got intense.",
    whyItMatters:
      "Cardiovascular acceleration reflects sympathetic 'fight-or-flight' activation. Keeping your pulse close to baseline ensures your breath control, pacing, and vocal tone remain confident.",
    formulaLabel: "Pulse Elevation & Control Formula",
    formula:
      "PulseRise = max(0, PeakPulse - CalibratedRestingBaseline)\nPulseControlScore = clamp(40, 100, 100 - PulseRise × 2.2)",
    targetRange: "+0 to +8 bpm above baseline",
    targetDescription:
      "• +0 to +5 bpm: Exceptional physiological containment.\n• +6 to +12 bpm: Healthy conversational engagement.\n• +15+ bpm: Acute sympathetic stress reaction.",
    howToImprove:
      "Inhale slowly into your diaphragm before speaking, and keep your shoulders relaxed to avoid physical tension that drives heart rate upward.",
  },
  hrv: {
    title: "Heart Rate Variability (HRV - RMSSD)",
    category: "Autonomic Resilience",
    accent: "var(--accent-blue)",
    simpleExplanation:
      "Heart Rate Variability measures the microscopic variations in milliseconds between consecutive heartbeats. Contrary to intuition, higher variability means your heart is relaxed and ready to adapt. Low variability means your body is rigid and tense.",
    whyItMatters:
      "High HRV indicates strong parasympathetic nervous system reserve. When HRV is high, you adapt smoothly to sudden curveball questions.",
    formulaLabel: "Root Mean Square of Successive Differences (RMSSD)",
    formula:
      "RMSSD = sqrt( 1 / (N - 1) × Σ (RR[i+1] - RR[i])² ) in ms\nRequires a continuous 60s window of steady optical telemetry.",
    targetRange: "35 ms to 70+ ms",
    targetDescription:
      "• > 50 ms: High autonomic reserve.\n• 30–50 ms: Normal conversational tone.\n• < 25 ms: Elevated autonomic fatigue or stress lockdown.",
    howToImprove:
      "Calm rhythmic breathing at ~6 breaths per minute maximizes heart rate variability (respiratory sinus arrhythmia).",
  },
  baevsky: {
    title: "Baevsky Stress Index",
    category: "Physiological Strain Metric",
    accent: "var(--accent-purple)",
    simpleExplanation:
      "Developed by aerospace physician Roman Baevsky for spaceflight telemetry, this index measures how strictly your autonomic nervous system is 'locking down' your heart rhythm under pressure. Higher numbers indicate higher mental strain.",
    whyItMatters:
      "When pressure builds, your body reduces heartbeat variance and locks into a rigid rhythm. The Baevsky Index measures this lockdown relative to your resting baseline.",
    formulaLabel: "Baevsky Stress Formula",
    formula:
      "SI = AMo / (2 × Mo × MxDMn)\nwhere Mo is mode RR interval, AMo is mode amplitude (%), and MxDMn is interval spread.",
    targetRange: "≤ +15% delta vs baseline",
    targetDescription:
      "• ≤ 0%: Body as calm as your resting baseline.\n• +1% to +25%: Mild healthy focus.\n• > +50%: Significant sympathetic lockdown.",
    howToImprove:
      "Release jaw and neck tension, and don't rush your answers. Give yourself permission to pause.",
  },
  breathing: {
    title: "Breathing Rate (Quiet Segments)",
    category: "Respiratory Cadence",
    accent: "var(--accent-teal)",
    simpleExplanation:
      "Measures your breathing rate in breaths per minute (br/min). While speaking, jaw movement and vocal airflow prevent optical chest/sinus tracking, which is why it displays 'Not measurable while speaking'. In quiet listening segments, it measures your natural breathing pace.",
    whyItMatters:
      "Rapid shallow breathing triggers adrenaline and raises your heart rate. Slow, rhythmic diaphragmatic breathing triggers vagal return.",
    formulaLabel: "Respiratory Frequency Window",
    formula:
      "BreathingRate = Optical Sinus Cycles per 30s Window (valid range: 5–40 br/min)",
    targetRange: "10 to 16 br/min",
    targetDescription:
      "• 8–14 br/min: Calm, controlled diaphragmatic cadence.\n• 15–20 br/min: Normal conversational listening.\n• > 22 br/min: Rapid, shallow chest breathing.",
    howToImprove:
      "Practice 4-second inhales through the nose and 4-second exhales while the counterpart is speaking.",
  },
  blinks: {
    title: "Eye Blink Frequency",
    category: "Neurological & Focus Indicator",
    accent: "var(--accent-indigo)",
    simpleExplanation:
      "Tracks how many times you blink per minute using 478 MediaPipe facial landmarks. Elevated blink rates often indicate cognitive overwhelm, searching for words, or sudden nervousness.",
    whyItMatters:
      "In high-stakes discussions, rapid blinking can make you appear uncertain. A steady, calm gaze conveys authority and active listening.",
    formulaLabel: "Blink Edge Detection Formula",
    formula:
      "BlinkRate = (Debounced Eyelid Closure Rising Edges / DurationMinutes)",
    targetRange: "12 to 22 blinks/min",
    targetDescription:
      "• 12–20 blinks/min: Composed, engaged eye contact.\n• 21–30 blinks/min: Moderate cognitive processing.\n• > 30 blinks/min: Anxiety or cognitive overload.",
    howToImprove:
      "Maintain soft eye contact with the counterpart video rather than darting your eyes when thinking.",
  },
  speaking: {
    title: "Speaking Share (%)",
    category: "Conversational Dynamics",
    accent: "var(--accent-blue)",
    simpleExplanation:
      "The exact percentage of the rehearsal that you spent talking versus listening to the counterpart, derived from spoken dialogue turn timestamps.",
    whyItMatters:
      "High-stakes conversations are a two-way dance. Monopolizing the conversation (>70%) prevents learning the counterpart's objections, while speaking too little (<30%) fails to persuade.",
    formulaLabel: "Dialogue Turn Ratio Formula",
    formula:
      "SpeakingShare% = (Total User Talk Seconds / Total Session Seconds) × 100",
    targetRange: "40% to 60%",
    targetDescription:
      "• 40%–60%: Balanced, authoritative dialogue.\n• > 70%: Over-talking or defensive rambling.\n• < 30%: Passive or overly reticent.",
    howToImprove:
      "Follow the 'Rule of 3': state your point in 3 concise sentences, then ask an open-ended question to return the floor.",
  },
  composure: {
    title: "Composure Index (%)",
    category: "Executive Poise Score",
    accent: "var(--accent-blue)",
    simpleExplanation:
      "The composite score representing how steadily your body held up when challenged. Combines pulse stability (60% weight) and autonomic recovery speed (40% weight) against your calibrated calm resting baseline.",
    whyItMatters:
      "Composure gives you an objective physiological metric of how you handle pressure, free from subjective bias.",
    formulaLabel: "Composite Index Formula",
    formula:
      "ComposureScore = round( PulseControl × 0.60 + RecoveryScore × 0.40 )\nwhere PulseControl = clamp(40, 100, 100 - PulseRise × 2.2)\nand RecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)",
    targetRange: "76% to 100% (Steady / Composed / Unshakeable)",
    targetDescription:
      "• 93%–100%: Unshakeable poise.\n• 83%–92%: Composed with minor elevation.\n• 70%–82%: Steady and dependable.\n• < 70%: Building; elevated pulse or delayed recovery.",
    howToImprove:
      "Focus on recovery time: even if a question catches you off guard, deliberate breathing brings your score right back up.",
  },
  autonomic_balance: {
    title: "Autonomic Balance",
    category: "Sympathetic vs Parasympathetic Tone",
    accent: "var(--accent-green)",
    simpleExplanation:
      "Measures the balance between your sympathetic nervous system (the accelerator) and your parasympathetic nervous system (the brake). Evaluated via continuous HRV RMSSD against your calm baseline.",
    whyItMatters:
      "Autonomic balance indicates whether your body remained in a sustainable state of relaxed alertness or slipped into chronic exhaustion.",
    formulaLabel: "Vagal Balance Ratio",
    formula:
      "AutonomicScore = clamp(40, 100, round((SessionAvgHRV / BaselineHRV) × 100))\nRequires sessions ≥ 60 seconds with active baseline.",
    targetRange: "70% to 100%",
    targetDescription:
      "• High: Resilient autonomic tone.\n• Low: Autonomic fatigue or sympathetic dominance.",
    howToImprove:
      "Take 3 deep belly breaths before starting any rehearsal.",
  },
  expression_calm: {
    title: "Expression Calm & Micro-Expressions",
    category: "Facial Tension Metric",
    accent: "var(--accent-orange)",
    simpleExplanation:
      "Monitors micro-movements across 478 facial landmarks for involuntary signs of tension, eye squints, furrowed brow, or jaw clenching during objection moments.",
    whyItMatters:
      "Micro-expressions leak emotional state before you speak. A relaxed, open facial posture communicates confidence.",
    formulaLabel: "Landmark Telemetry Condition",
    formula:
      "Requires studio direct lighting. When lighting is dim or uncalibrated, telemetry displays as unmeasured ('—') to prevent false estimations.",
    targetRange: "Neutral / Relaxed Dominance",
    targetDescription:
      "• Neutral / Relaxed: Calm executive presence.\n• Tension: Brow furrowing or jaw clenching detected during objections.",
    howToImprove:
      "Consciously un-clench your jaw and soften your forehead muscles when listening to tough questions.",
  },
};

export const COMPOSURE_MODAL_DATA = {
  title: "Understanding Composure",
  subtitle: "How your score is measured, calculated, and interpreted",
  accent: "var(--accent-blue)",
  whatIsSectionTitle: "What is Composure Snapshot?",
  whatIsParagraph:
    "Your Composure Snapshot reflects how calmly and steadily your body holds up when under conversational pressure. Using your camera, the system tracks micro-capillary pulses on your face to observe your heart rate and autonomic nervous system in real time, comparing your reactions against your personal resting calm baseline.",
  howCalculatedSectionTitle:
    "How It Gets Calculated & Mathematical Formulae",
  step1Title: "1. Pulse Control (60% weight):",
  step1Description:
    "Compares your peak pulse spike during the rehearsal against your calibrated resting baseline:",
  step1Formula:
    "PulseControl = clamp(40, 100, 100 - (PeakPulse - RestingPulse) × 2.2)",
  step2Title: "2. Autonomic Recovery (40% weight):",
  step2Description:
    "Measures how many seconds your pulse takes to return within +5 bpm of your calm baseline following peak tension:",
  step2Formula:
    "RecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)",
  step3Title: "3. Composite Composure Score:",
  step3Description:
    "Combines pulse stability and autonomic vagal return into a single 0% to 100% score:",
  step3Formula:
    "ComposureScore = round(PulseControl × 0.60 + RecoveryScore × 0.40)",
  nervousnessSectionTitle: "Nervousness Levels & How They Are Derived",
  nervousnessDescription:
    "Nervousness measures the degree of sympathetic autonomic arousal triggered during your conversation:",
  nervousnessTiers: [
    {
      name: "CALM",
      range: "≥ 88%",
      color: "var(--accent-green)",
      description:
        "Heart rate remains within +0 to +3 bpm of baseline. Instant recovery (≤ 12s).",
    },
    {
      name: "MILD",
      range: "76% – 87%",
      color: "var(--accent-blue)",
      description:
        "Healthy conversational focus. Minor pulse elevation (+4 to +8 bpm) stabilizing within 16s.",
    },
    {
      name: "MODERATE",
      range: "60% – 75%",
      color: "var(--accent-orange)",
      description:
        "Noticeable cardiovascular activation (+9 to +16 bpm) or recovery taking 17 to 24 seconds.",
    },
    {
      name: "HIGH",
      range: "< 60%",
      color: "var(--accent-red)",
      description:
        "Elevated stress arousal (+17+ bpm) or extended recovery taking longer than 25 seconds.",
    },
  ],
  pressureDetectionSectionTitle:
    "How Pressure & Stress Moments Are Detected",
  pressureDetectionP1:
    "On your timeline chart, purple dots mark peak stress moments. The optical engine monitors your instantaneous capillary pulse: whenever your heart rate jumps by +8 bpm or more within a rolling 12-second window, an acute pressure event is flagged.",
  pressureDetectionP2:
    "The system applies a -12 second conversational lookback, synchronizing each physical spike directly with the transcript to show you the counterpart's exact objection or interruption that provoked the reaction.",
  percentagesTiersSectionTitle: "What Do The Percentages & Tiers Mean?",
  percentagesTiers: [
    {
      name: "UNSHAKEABLE",
      range: "93% – 100%",
      color: "var(--accent-purple)",
      description:
        "Exceptional poise. Heart rate remains virtually flat at baseline with instant recovery.",
    },
    {
      name: "COMPOSED",
      range: "83% – 92%",
      color: "var(--accent-green)",
      description:
        "High emotional control. Minor pulse elevation that settles within a few seconds.",
    },
    {
      name: "STEADY",
      range: "70% – 82%",
      color: "var(--accent-blue)",
      description:
        "Controlled and grounded. Healthy cardiovascular response with reliable recovery back to baseline.",
    },
    {
      name: "BUILDING",
      range: "< 70%",
      color: "var(--accent-orange)",
      description:
        "Developing poise. Higher pulse elevation or delayed recovery under sudden pressure.",
    },
  ],
  steadyHighlightTitle: "What does Steady (e.g. 75%) mean?",
  steadyHighlightBody:
    "Steady is a strong, dependable practice score. It means that when the AI counterpart pushed or objected, your body naturally became alert (a normal human reaction), but your autonomic nervous system stayed grounded and brought your heart rate right back to baseline without letting stress overwhelm your speech.",
  disclaimer:
    "100% on-device and private. Optical frames are processed in memory and never transmitted or recorded remotely. This is an educational coaching indicator, not a diagnostic medical evaluation.",
};

export const TIMELINE_MODAL_DATA = {
  title: "Understanding Pressure Timeline",
  subtitle: "Continuous cardiovascular response and conversational synchronization",
  accent: "var(--accent-blue)",
  whatThisGraphSectionTitle: "What This Graph Denotes",
  whatThisGraphParagraph:
    "The Pressure Timeline plots your physiological cardiovascular response second-by-second across the entire rehearsal. It shows how your heart rate accelerates or stabilizes in direct response to the counterpart's questions, objections, and conversational tension.",
  howCalculatedSectionTitle: "How Readings Are Calculated & Plotted",
  step1Title: "1. Pulse Curve (Solid Blue Line):",
  step1Description:
    "Continuously measured via optical remote photoplethysmography (rPPG). The optical sensor detects blood volume pulses in facial micro-capillaries at 30 frames per second:",
  step1Formula:
    "PulseReading(t) = Rolling12sMean(MicroCapillaryPulseFrequencies) in bpm",
  step2Title: "2. Sensor Warm-Up (0:00 to 0:12 Shaded Region):",
  step2Description:
    "The initial 12 seconds are shaded because the rPPG optical frequency filter requires a contiguous 12-second window of video frames to achieve initial cardiovascular phase synchronization.",
  step3Title: "3. Speaking Bands (Light Blue Shaded Columns):",
  step3Description:
    "Synchronized with your actual spoken dialogue timestamps. This distinguishes vocal speech exertion from silent cognitive tension while listening to objections.",
  step4Title: "4. Peak Stress Moments (Purple Markers):",
  step4Description:
    "Automatically detected whenever your pulse accelerates by +8 bpm or more within 12 seconds:",
  step4Formula:
    "ConversationalTriggerTime = max(0, PeakTimestamp - 12 seconds)",
  step4Note:
    "Clicking any purple marker on the graph instantly jumps playback to the counterpart statement that triggered the physiological reaction.",
  step5Title: "5. Resting Baseline (Dashed Line):",
  step5Description:
    "Your calibrated calm resting pulse (measured during your 90s calm baseline protocol). The elevation above this dashed reference measures acute sympathetic arousal.",
  disclaimer: `${WELLNESS_DISCLAIMER} All telemetry is computed locally on-device.`,
};
