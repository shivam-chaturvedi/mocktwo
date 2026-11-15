import type {
  SessionBiometrics,
  DifficultyLevel,
  UserBaseline,
  ValidationStatusCode,
  PulseSample,
  HrvSample,
  BreathingSample,
  EdaSample,
  FaceSample,
} from "../../src/types";

export function generateFixtureSessionBiometrics(
  durationSeconds: number,
  _difficulty: DifficultyLevel,
  _personaTraits: string[] = [],
  _pressureLevel: "Moderate" | "High" | "Intense" = "High",
  baseline?: UserBaseline,
  forcedValidationIssues: { startSec: number; endSec: number; code: ValidationStatusCode }[] = [],
  forceOutOfRange: boolean = false
): SessionBiometrics {
  const basePulse = baseline?.restingPulse || 68;
  const sampleInterval = 2;
  const totalSteps = Math.max(1, Math.floor(durationSeconds / sampleInterval));

  const pulseRates: PulseSample[] = [];
  const hrvSamples: HrvSample[] = [];
  const breathingSamples: BreathingSample[] = [];
  const edaSamples: EdaSample[] = [];
  const faceSamples: FaceSample[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const t = Math.min(durationSeconds, i * sampleInterval);
    const bpm = forceOutOfRange && t >= 20 && t <= 35
      ? 114
      : Math.min(108, Math.round(basePulse + 12 + Math.sin(i / 2) * 8));

    pulseRates.push({
      timestampSeconds: t,
      pulseBpm: bpm,
      confidence: 90,
      stable: true,
      snrDb: 18,
      outOfRange: bpm > 110,
    });

    hrvSamples.push({
      timestampSeconds: t,
      rmssdMs: Math.max(25, Math.round(52 - (bpm - 68) * 0.8)),
      confidence: durationSeconds >= 60 ? 88 : 45,
      warmingUp: durationSeconds < 60,
    });

    breathingSamples.push({
      timestampSeconds: t,
      breathingRateBpm: 15,
      confidence: 85,
    });

    edaSamples.push({
      timestampSeconds: t,
      arousalIndex: 0.35,
      confidence: 80,
    });

    faceSamples.push({
      timestampSeconds: t,
      expressions: {
        neutral: 0.85,
        happy: 0.05,
        surprise: 0.05,
        contempt: 0,
        fear: 0.05,
        sad: 0,
        disgust: 0,
        angry: 0,
      },
    });
  }

  const cleanMeasured = forcedValidationIssues.length > 0 ? Math.max(1, durationSeconds - 14) : durationSeconds;

  return {
    pulse: {
      rate: pulseRates,
      state: "measured",
      avg: Math.round(basePulse + 12),
      peak: Math.max(...pulseRates.map((p) => p.pulseBpm)),
      min: Math.min(...pulseRates.map((p) => p.pulseBpm)),
      deltaVsBaseline: 12,
      confidence: 90,
    },
    hrv: {
      rmssd: durationSeconds >= 60 ? 46 : undefined,
      baevskyStressIndex: durationSeconds >= 60 ? 94 : undefined,
      baevskyDeltaVsBaseline: durationSeconds >= 60 ? 12 : undefined,
      state: durationSeconds >= 60 ? "measured" : "notEnoughTime",
      confidence: durationSeconds >= 60 ? 88 : undefined,
    },
    breathing: {
      quietRateBpm: 15,
      state: "notMeasurableWhileSpeaking",
      confidence: 85,
    },
    eda: {
      trace: edaSamples,
      state: "measured",
      peakArousal: 0.55,
      deltaVsBaseline: 0.15,
    },
    face: {
      trace: faceSamples,
      expressionAverages: {
        neutral: 0.82,
        fear: 0.08,
        surprise: 0.05,
        happy: 0.05,
        contempt: 0,
        sad: 0,
        disgust: 0,
        angry: 0,
      },
      blinkRatePerMin: 18,
      speakingSharePct: 45,
      state: "measured",
    },
    validationEvents: forcedValidationIssues.map((v) => ({
      startSeconds: v.startSec,
      endSeconds: v.endSec,
      code: v.code,
      hintText: "Excessive motion detected",
    })),
    cleanMeasuredSeconds: cleanMeasured,
    totalDurationSeconds: durationSeconds,
    coverageRatio: `Coverage: ${cleanMeasured} of ${durationSeconds} s measured cleanly`,
    recoverySecondsApprox: 18,
    readinessStatus: durationSeconds >= 60 ? "Full read" : durationSeconds >= 12 ? "Quick read" : "Too short",
    composureScore: 86,
    composureTier: "Composed",
    signalsAvailableCount: durationSeconds >= 60 ? 5 : 4,
    isPartialScore: durationSeconds < 60,
    nervousnessLevel: "Calm",
    peakStressMoments: [
      {
        timestampSeconds: Math.round(durationSeconds * 0.4),
        triggerEvent: "Counterpart pushback",
        pulseRiseBpm: 14,
        peakPulseBpm: 88,
        recoverySeconds: 16,
      },
    ],
  };
}
