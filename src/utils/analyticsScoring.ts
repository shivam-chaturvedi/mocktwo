/**
 * Pure Analytics & Composure Scoring Functions
 *
 * Computes real physiological metrics and composure scores from raw telemetry samples
 * and user baseline calibration. No synthetic or randomized values.
 */

import { type ComposureTier, type NervousnessLevel, getComposureTier } from "../types/index.ts";

export interface TelemetrySample {
  timestampOffsetMs: number;
  pulseBpm: number | null;
  hrvRmssd: number | null;
  breathingRate: number | null;
  confidence: number | null;
  isClean: boolean;
}

export interface BaselineReference {
  restingPulse: number;
  restingHrvRmssd?: number | null;
  restingBreathingRate?: number | null;
}

export interface SessionMetricsResult {
  avgPulse: number | null;
  peakPulse: number | null;
  pulseRise: number | null;
  avgHrvRmssd: number | null;
  recoverySeconds: number | null;
  composureScore: number | null;
  pulseControlScore: number | null;
  recoveryScore: number | null;
  tier: ComposureTier | null;
  nervousness: NervousnessLevel | null;
}

/**
 * Computes deterministic session composure metrics from telemetry samples.
 * Returns null for any metric that cannot be computed due to missing/insufficient data.
 */
export function computeSessionMetrics(
  samples: TelemetrySample[],
  baseline: BaselineReference | null
): SessionMetricsResult {
  const cleanPulseSamples = samples.filter(
    (s) => s.isClean && s.pulseBpm !== null && s.pulseBpm >= 40 && s.pulseBpm <= 110
  );

  // If no clean pulse telemetry or no baseline calibration exists, metrics cannot be computed
  if (cleanPulseSamples.length === 0 || !baseline || !baseline.restingPulse) {
    return {
      avgPulse: null,
      peakPulse: null,
      pulseRise: null,
      avgHrvRmssd: null,
      recoverySeconds: null,
      composureScore: null,
      pulseControlScore: null,
      recoveryScore: null,
      tier: null,
      nervousness: null,
    };
  }

  const pulseValues = cleanPulseSamples.map((s) => s.pulseBpm as number);
  const avgPulse = Math.round(pulseValues.reduce((sum, v) => sum + v, 0) / pulseValues.length);
  const peakPulse = Math.max(...pulseValues);
  const pulseRise = Math.max(0, peakPulse - baseline.restingPulse);

  // Recovery time calculation: seconds from the peak pulse sample until pulse returns within +5 bpm of baseline
  let recoverySeconds: number | null = null;
  const peakIndex = cleanPulseSamples.findIndex((s) => s.pulseBpm === peakPulse);
  if (peakIndex !== -1) {
    const baselineThreshold = baseline.restingPulse + 5;
    const postPeakSamples = cleanPulseSamples.slice(peakIndex);
    const recoveredSample = postPeakSamples.find((s) => (s.pulseBpm as number) <= baselineThreshold);
    if (recoveredSample) {
      const deltaMs = recoveredSample.timestampOffsetMs - cleanPulseSamples[peakIndex].timestampOffsetMs;
      recoverySeconds = Math.max(0, Math.round(deltaMs / 1000));
    }
  }

  // HRV (RMSSD) is only statistically meaningful across a minimum 60-second window
  const validHrvSamples = samples.filter(
    (s) => s.timestampOffsetMs >= 60000 && s.hrvRmssd !== null && s.hrvRmssd !== undefined && s.isClean
  );
  const avgHrvRmssd =
    validHrvSamples.length > 0
      ? Math.round(
          validHrvSamples.reduce((sum, s) => sum + (s.hrvRmssd as number), 0) / validHrvSamples.length
        )
      : null;

  // Pulse control: 100 base, penalized by pulse elevation above resting baseline
  const pulseControlScore = Math.max(40, Math.min(100, Math.round(100 - pulseRise * 2.2)));

  // Recovery score: 100 base, penalized if recovery took longer than 12 seconds
  const recoveryScore =
    recoverySeconds !== null
      ? Math.max(40, Math.min(100, Math.round(100 - Math.max(0, recoverySeconds - 12) * 2.0)))
      : null;

  // Composite composure score
  let composureScore: number;
  if (recoveryScore !== null) {
    composureScore = Math.round(pulseControlScore * 0.6 + recoveryScore * 0.4);
  } else {
    composureScore = pulseControlScore;
  }

  const tier = getComposureTier(composureScore);

  let nervousness: NervousnessLevel = "Mild";
  if (composureScore >= 88) nervousness = "Calm";
  else if (composureScore >= 76) nervousness = "Mild";
  else if (composureScore >= 60) nervousness = "Moderate";
  else nervousness = "High";

  return {
    avgPulse,
    peakPulse,
    pulseRise,
    avgHrvRmssd,
    recoverySeconds,
    composureScore,
    pulseControlScore,
    recoveryScore,
    tier,
    nervousness,
  };
}
