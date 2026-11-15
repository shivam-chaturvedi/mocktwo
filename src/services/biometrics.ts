import {
  type ComposureTier,
  type NervousnessLevel,
  type UserBaseline,
  getComposureTier,
} from "../types/index.ts";

export const WELLNESS_DISCLAIMER = "Wellness indicator, not a medical measurement.";

export const DEFAULT_USER_BASELINE: UserBaseline = {
  restingPulse: 68,
  restingHrvRmssd: 54,
  restingBaevsky: 82,
  restingBreathingRate: 14,
  restingEdaArousal: 0.22,
  restingExpressions: {
    neutral: 0.88,
    happy: 0.08,
    surprise: 0.02,
    contempt: 0.0,
    fear: 0.01,
    sad: 0.01,
    disgust: 0.0,
    angry: 0.0,
  },
  measuredAt: "2026-11-10T08:30:00Z",
  isCalibrated: true,
  restingHR: 68,
  restingHRV: 54,
};

// Proprietary mocktwo Composure Index calculation
export function calculateComposureScore(params: {
  pulseRiseVsBaseline?: number;
  peakPulse?: number;
  recoverySecondsApprox?: number;
  hrvVsBaseline?: number;
  edaArousalVsBaseline?: number;
  expressionTensionShare?: number;
  signalsAvailableCount: number;
}): { score: number; tier: ComposureTier; nervousness: NervousnessLevel; isPartial: boolean } {
  const {
    pulseRiseVsBaseline = 12,
    peakPulse = 84,
    recoverySecondsApprox = 24,
    hrvVsBaseline = -10,
    edaArousalVsBaseline = 0.2,
    expressionTensionShare = 0.15,
    signalsAvailableCount,
  } = params;

  const pulseScore = Math.max(40, 100 - Math.max(0, pulseRiseVsBaseline) * 2.2);
  const peakScore = Math.max(45, 100 - Math.max(0, peakPulse - 70) * 1.4);
  const recoveryScore = Math.max(50, 100 - Math.max(0, recoverySecondsApprox - 12) * 2.0);
  const hrvScore = Math.max(45, 100 - Math.abs(Math.min(0, hrvVsBaseline)) * 1.5);
  const edaScore = Math.max(50, 100 - Math.max(0, edaArousalVsBaseline) * 80);
  const expressionScore = Math.max(45, 100 - Math.max(0, expressionTensionShare) * 130);

  // Renormalized weighting based on available signals
  let weighted = 0;
  let weightSum = 0;

  if (params.pulseRiseVsBaseline !== undefined) {
    weighted += (pulseScore * 0.2 + peakScore * 0.15);
    weightSum += 0.35;
  }
  if (params.recoverySecondsApprox !== undefined) {
    weighted += recoveryScore * 0.25;
    weightSum += 0.25;
  }
  if (params.hrvVsBaseline !== undefined) {
    weighted += hrvScore * 0.15;
    weightSum += 0.15;
  }
  if (params.edaArousalVsBaseline !== undefined) {
    weighted += edaScore * 0.1;
    weightSum += 0.1;
  }
  if (params.expressionTensionShare !== undefined) {
    weighted += expressionScore * 0.15;
    weightSum += 0.15;
  }

  const score = weightSum > 0 ? Math.round(weighted / weightSum) : 75;
  const tier = getComposureTier(score);

  let nervousness: NervousnessLevel = "Mild";
  if (score >= 88) nervousness = "Calm";
  else if (score >= 76) nervousness = "Mild";
  else if (score >= 60) nervousness = "Moderate";
  else nervousness = "High";

  return {
    score,
    tier,
    nervousness,
    isPartial: signalsAvailableCount < 5,
  };
}
