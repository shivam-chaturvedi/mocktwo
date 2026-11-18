/**
 * Pure mathematical, statistical, and signal-gating functions for Presage SmartSpectra vitals telemetry.
 * 
 * ZERO UI or SDK runtime dependencies. Completely testable in standard Node / test runners.
 * Never invents, fabricates, or defaults numbers. Missing telemetry is always NULL.
 */

import {
  BASELINE_TARGET_SECONDS,
  BASELINE_MIN_PULSE_SAMPLES,
  BASELINE_MIN_BREATHING_SAMPLES,
  BASELINE_MIN_HRV_SAMPLES,
  BASELINE_MIN_FACE_PRESENT_RATIO,
  BASELINE_MAX_MOTION_RATIO,
  BASELINE_MIN_QUALITY_SCORE,
} from "../../constants/baseline.ts";

export interface VitalsSamplePoint {
  timestampUs: number; // Linux epoch microseconds
  tMs: number;         // Milliseconds from measurement window origin
  pulse?: number | null;
  pulseConfidence?: number | null;
  pulseStable?: boolean;
  breathingRate?: number | null;
  breathingConfidence?: number | null;
  breathingStable?: boolean;
  hrvRmssd?: number | null;
  hrvSdnn?: number | null;
  hrvMeanNn?: number | null;
  hrvBaevsky?: number | null;
  hrvConfidence?: number | null;
  hrvStable?: boolean;
  eda?: number | null;
  blinkDetected?: boolean;
  talkingDetected?: boolean;
  expressions?: Record<string, number> | null;
  validationCode?: number | null;
}

export interface ValidationEvent {
  timestampUs: number;
  code: number;
  hint?: string;
}

export interface ExpressionScoreItem {
  type: string | number;
  confidence: number;
}

export interface ExpressionSample {
  timestampUs: number;
  stable?: boolean;
  scores: ExpressionScoreItem[];
}

export interface BlinkSample {
  timestampUs: number;
  detected: boolean;
}

export interface BaselineSummary {
  isValid: boolean;
  status?: "complete" | "incomplete" | "error";
  missingSignals?: string[];
  invalidReason: string | null;
  durationSeconds: number;

  // Pulse
  pulseMean: number | null;
  pulseMedian: number | null;
  pulseMin: number | null;
  pulseMax: number | null;
  pulseSd: number | null;
  pulseConfidence: number | null;
  pulseSampleCount: number;

  // HRV
  hrvRmssd: number | null;
  hrvSdnn: number | null;
  hrvMeanNn: number | null;
  hrvBaevsky: number | null;
  hrvConfidence: number | null;
  hrvSampleCount: number;

  // Breathing
  breathingMean: number | null;
  breathingSd: number | null;
  breathingConfidence: number | null;
  breathingSampleCount: number;

  // Blinking
  blinkCount: number;
  blinkRatePerMin: number;

  // Expressions
  expressionMap: Record<string, number>;
  dominantExpression: string | null;

  // EDA
  edaMean: number | null;
  edaSd: number | null;
  edaSlope: number | null;

  // Quality metrics & provenance
  facePresentRatio: number;
  talkingRatio: number;
  motionRatio: number;
  validationHistogram: Record<string, number>;
  qualityScore: number;
}

export const EXPRESSION_NAMES: Record<number, string> = {
  0: "UNSPECIFIED",
  1: "ANGRY",
  2: "CONTEMPT",
  3: "DISGUST",
  4: "FEAR",
  5: "HAPPY",
  6: "NEUTRAL",
  7: "SAD",
  8: "SURPRISE",
};

/**
 * Evaluates whether a vitals sample passes the official SmartSpectra quality gates:
 * - Pulse: confidence >= 40, stable = true, physiological range 30-220 bpm.
 * - Breathing: confidence >= 45, stable = true, physiological range 4-50 br/min.
 * - HRV: confidence >= 50, stable = true, rmssd > 0.
 * - Validation code must be 0 (kOk) or null.
 */
export function applyQualityGate(sample: {
  pulse?: number | null;
  pulseConfidence?: number | null;
  pulseStable?: boolean;
  breathingRate?: number | null;
  breathingConfidence?: number | null;
  breathingStable?: boolean;
  hrvRmssd?: number | null;
  hrvConfidence?: number | null;
  hrvStable?: boolean;
  validationCode?: number | null;
}) {
  const isValidationOk = sample.validationCode == null || sample.validationCode === 0;

  const pulseValid =
    isValidationOk &&
    sample.pulse != null &&
    sample.pulse >= 30 &&
    sample.pulse <= 220 &&
    (sample.pulseConfidence ?? 0) >= 40 &&
    sample.pulseStable === true;

  const breathingValid =
    isValidationOk &&
    sample.breathingRate != null &&
    sample.breathingRate >= 4 &&
    sample.breathingRate <= 50 &&
    (sample.breathingConfidence ?? 0) >= 45 &&
    sample.breathingStable === true;

  const hrvValid =
    isValidationOk &&
    sample.hrvRmssd != null &&
    sample.hrvRmssd >= 5 &&
    sample.hrvRmssd <= 300 &&
    (sample.hrvConfidence == null || sample.hrvConfidence >= 5);

  return {
    pulseValid,
    breathingValid,
    hrvValid,
    sampleValid: pulseValid || breathingValid || hrvValid,
  };
}

/**
 * Counts rising edge transitions (detected: false -> true), debounced by debounceMs.
 */
export function countBlinkEdges(blinks: BlinkSample[], debounceMs: number = 200): number {
  if (!blinks || blinks.length === 0) return 0;

  // Deduplicate and sort by timestamp
  const sorted = [...blinks].sort((a, b) => a.timestampUs - b.timestampUs);
  let count = 0;
  let lastState = false;
  let lastEdgeTimeUs = -Infinity;
  const debounceUs = debounceMs * 1000;

  for (const item of sorted) {
    const isDetected = Boolean(item.detected);
    if (!lastState && isDetected) {
      if (item.timestampUs - lastEdgeTimeUs >= debounceUs) {
        count++;
        lastEdgeTimeUs = item.timestampUs;
      }
    }
    lastState = isDetected;
  }

  return count;
}

/**
 * Calculates average confidence for each facial expression across stable frames.
 */
export function averageExpressions(expressions: ExpressionSample[]): {
  expressionMap: Record<string, number>;
  dominantExpression: string | null;
} {
  const accumulator: Record<string, { sum: number; count: number }> = {};

  if (!expressions || expressions.length === 0) {
    return { expressionMap: {}, dominantExpression: null };
  }

  for (const sample of expressions) {
    if (sample.stable === false) continue;
    if (!sample.scores || !Array.isArray(sample.scores)) continue;

    for (const score of sample.scores) {
      let name: string;
      if (typeof score.type === "number") {
        name = EXPRESSION_NAMES[score.type] || `TYPE_${score.type}`;
      } else {
        name = String(score.type);
      }
      if (name === "UNSPECIFIED") continue;

      if (!accumulator[name]) {
        accumulator[name] = { sum: 0, count: 0 };
      }
      accumulator[name].sum += Math.max(0, Math.min(1, score.confidence));
      accumulator[name].count += 1;
    }
  }

  const expressionMap: Record<string, number> = {};
  let dominantExpression: string | null = null;
  let maxAvg = -1;

  for (const [key, val] of Object.entries(accumulator)) {
    if (val.count > 0) {
      const avg = Number((val.sum / val.count).toFixed(3));
      expressionMap[key] = avg;
      if (avg > maxAvg && key !== "NEUTRAL") {
        maxAvg = avg;
        dominantExpression = key;
      }
    }
  }

  // If no emotional expression has strong presence, default dominant to NEUTRAL if present
  if (!dominantExpression && expressionMap["NEUTRAL"] != null) {
    dominantExpression = "NEUTRAL";
  }

  return { expressionMap, dominantExpression };
}

/**
 * Computes mean, median, min, max, and standard deviation for an array of numbers.
 * Returns all nulls if array is empty.
 */
export function computeSummaryStats(values: number[]): {
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  sd: number | null;
} {
  if (!values || values.length === 0) {
    return { mean: null, median: null, min: null, max: null, sd: null };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];

  let median: number;
  const mid = Math.floor(n / 2);
  if (n % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  let varianceSum = 0;
  for (const v of sorted) {
    varianceSum += Math.pow(v - mean, 2);
  }
  const sd = Math.sqrt(varianceSum / n);

  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    sd: Number(sd.toFixed(2)),
  };
}

/**
 * Pure quality score computation function (0 to 100).
 * Based strictly on face presence ratio, stable telemetry coverage, and absence of motion/talking artifacts.
 */
export function computeQualityScore(params: {
  facePresentRatio: number;
  pulseValidRatio: number;
  breathingValidRatio: number;
  motionRatio: number;
  talkingRatio: number;
}): number {
  const {
    facePresentRatio,
    pulseValidRatio,
    breathingValidRatio,
    motionRatio,
    talkingRatio,
  } = params;

  if (facePresentRatio < 0.3) {
    return 0; // Not enough face coverage to form any valid baseline
  }

  // Base score computed from telemetry availability (max 100)
  // 40% face presence + 35% valid pulse + 25% valid breathing
  const baseCoverage =
    Math.min(1.0, Math.max(0, facePresentRatio)) * 40 +
    Math.min(1.0, Math.max(0, pulseValidRatio)) * 35 +
    Math.min(1.0, Math.max(0, breathingValidRatio)) * 25;

  // Penalties for motion artifacts and talking during calm baseline
  const motionPenalty = motionRatio * 30;
  const talkingPenalty = talkingRatio * 20;

  const rawScore = baseCoverage - motionPenalty - talkingPenalty;
  const clamped = Math.max(0, Math.min(100, Math.round(rawScore)));
  return clamped;
}

/**
 * Computes linear regression slope for EDA / series points.
 */
export function computeLinearSlope(points: Array<{ x: number; y: number }>): number | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return Number(slope.toFixed(4));
}

/**
 * Summarizes the entire baseline capture window (default 90s) from gated samples and validation events.
 */
export function summarizeBaseline(
  samples: VitalsSamplePoint[],
  validationEvents: ValidationEvent[],
  windowDurationMs: number = BASELINE_TARGET_SECONDS * 1000
): BaselineSummary {
  const durationSeconds = Math.max(1, Math.round(windowDurationMs / 1000));

  if (!samples || samples.length === 0) {
    return {
      isValid: false,
      status: "incomplete",
      missingSignals: ["pulse", "breathing", "hrv"],
      invalidReason: "No vitals samples collected during session",
      durationSeconds,
      pulseMean: null,
      pulseMedian: null,
      pulseMin: null,
      pulseMax: null,
      pulseSd: null,
      pulseConfidence: null,
      pulseSampleCount: 0,
      hrvRmssd: null,
      hrvSdnn: null,
      hrvMeanNn: null,
      hrvBaevsky: null,
      hrvConfidence: null,
      hrvSampleCount: 0,
      breathingMean: null,
      breathingSd: null,
      breathingConfidence: null,
      breathingSampleCount: 0,
      blinkCount: 0,
      blinkRatePerMin: 0,
      expressionMap: {},
      dominantExpression: null,
      edaMean: null,
      edaSd: null,
      edaSlope: null,
      facePresentRatio: 0,
      talkingRatio: 0,
      motionRatio: 0,
      validationHistogram: {},
      qualityScore: 0,
    };
  }

  // 1. Validation code distribution and face presence
  const valCounts: Record<string, number> = {};
  let totalValEvents = validationEvents.length;

  for (const ev of validationEvents) {
    const key = String(ev.code);
    valCounts[key] = (valCounts[key] || 0) + 1;
  }

  const validationHistogram: Record<string, number> = {};
  if (totalValEvents > 0) {
    for (const [k, count] of Object.entries(valCounts)) {
      validationHistogram[k] = Number((count / totalValEvents).toFixed(3));
    }
  }

  // Validation code 0 is kOk; code 1 is kNoFaceFound; code 12 is kExcessiveMotion
  const noFaceCount = (valCounts["1"] || 0);
  const motionCount = (valCounts["12"] || 0);

  const facePresentRatio =
    totalValEvents > 0
      ? Number((1 - noFaceCount / totalValEvents).toFixed(3))
      : (samples.length > 0 ? 1.0 : 0.0);

  const motionRatio =
    totalValEvents > 0
      ? Number((motionCount / totalValEvents).toFixed(3))
      : 0.0;

  // 2. Filter gated metrics
  const validPulseValues: number[] = [];
  const validPulseConfidences: number[] = [];

  const validHrvRmssd: number[] = [];
  const validHrvSdnn: number[] = [];
  const validHrvMeanNn: number[] = [];
  const validHrvBaevsky: number[] = [];
  const validHrvConfidences: number[] = [];

  const validBreathing: number[] = [];
  const validBreathingConfidences: number[] = [];

  const edaPoints: Array<{ x: number; y: number }> = [];
  const edaValues: number[] = [];

  let talkingSamples = 0;
  const blinkSamples: BlinkSample[] = [];
  const expressionSamples: ExpressionSample[] = [];

  for (const s of samples) {
    const gate = applyQualityGate(s);

    if (gate.pulseValid && s.pulse != null) {
      validPulseValues.push(s.pulse);
      if (s.pulseConfidence != null) validPulseConfidences.push(s.pulseConfidence);
    }

    if (gate.hrvValid && s.hrvRmssd != null) {
      validHrvRmssd.push(s.hrvRmssd);
      if (s.hrvSdnn != null) validHrvSdnn.push(s.hrvSdnn);
      if (s.hrvMeanNn != null) validHrvMeanNn.push(s.hrvMeanNn);
      if (s.hrvBaevsky != null) validHrvBaevsky.push(s.hrvBaevsky);
      if (s.hrvConfidence != null) validHrvConfidences.push(s.hrvConfidence);
    }

    if (gate.breathingValid && s.breathingRate != null) {
      validBreathing.push(s.breathingRate);
      if (s.breathingConfidence != null) validBreathingConfidences.push(s.breathingConfidence);
    }

    if (s.eda != null) {
      edaValues.push(s.eda);
      edaPoints.push({ x: s.tMs / 1000, y: s.eda });
    }

    if (s.talkingDetected) {
      talkingSamples++;
    }

    if (s.blinkDetected !== undefined) {
      blinkSamples.push({ timestampUs: s.timestampUs, detected: s.blinkDetected });
    }

    if (s.expressions) {
      const scores: ExpressionScoreItem[] = Object.entries(s.expressions).map(([type, confidence]) => ({
        type,
        confidence,
      }));
      expressionSamples.push({ timestampUs: s.timestampUs, stable: true, scores });
    }
  }

  const talkingRatio = samples.length > 0 ? Number((talkingSamples / samples.length).toFixed(3)) : 0;
  const pulseValidRatio = durationSeconds > 0 ? Math.min(1.0, validPulseValues.length / durationSeconds) : 0;
  const breathingValidRatio = durationSeconds > 0 ? Math.min(1.0, validBreathing.length / durationSeconds) : 0;

  // 3. Compute statistical summaries
  const pulseStats = computeSummaryStats(validPulseValues);
  const pulseMeanConf =
    validPulseConfidences.length > 0
      ? Number((validPulseConfidences.reduce((a, b) => a + b, 0) / validPulseConfidences.length).toFixed(1))
      : null;

  const hrvRmssdStats = computeSummaryStats(validHrvRmssd);
  const hrvSdnnStats = computeSummaryStats(validHrvSdnn);
  const hrvMeanNnStats = computeSummaryStats(validHrvMeanNn);
  const hrvBaevskyStats = computeSummaryStats(validHrvBaevsky);
  const hrvMeanConf =
    validHrvConfidences.length > 0
      ? Number((validHrvConfidences.reduce((a, b) => a + b, 0) / validHrvConfidences.length).toFixed(1))
      : null;

  const breathingStats = computeSummaryStats(validBreathing);
  const breathingMeanConf =
    validBreathingConfidences.length > 0
      ? Number((validBreathingConfidences.reduce((a, b) => a + b, 0) / validBreathingConfidences.length).toFixed(1))
      : null;

  const edaStats = computeSummaryStats(edaValues);
  const edaSlope = computeLinearSlope(edaPoints);

  const blinkCount = countBlinkEdges(blinkSamples);
  const blinkRatePerMin = Number(((blinkCount / durationSeconds) * 60).toFixed(1));

  const { expressionMap, dominantExpression } = averageExpressions(expressionSamples);

  // 4. Quality score & validity decision
  const qualityScore = computeQualityScore({
    facePresentRatio,
    pulseValidRatio,
    breathingValidRatio,
    motionRatio,
    talkingRatio,
  });

  // Minimum quality gates to accept baseline:
  // - Duration must be at least 75 seconds (nominally 90s).
  // - Face must be present for at least 65% of the window.
  // - All three signals must meet the minimum sample thresholds:
  //   * Pulse >= BASELINE_MIN_PULSE_SAMPLES (30)
  //   * Breathing >= BASELINE_MIN_BREATHING_SAMPLES (20)
  //   * HRV (RMSSD) >= BASELINE_MIN_HRV_SAMPLES (10)
  // - Motion ratio <= BASELINE_MAX_MOTION_RATIO (0.40)
  // - Quality score >= BASELINE_MIN_QUALITY_SCORE (60)
  const missingSignals: string[] = [];
  if (validPulseValues.length < BASELINE_MIN_PULSE_SAMPLES) {
    missingSignals.push("pulse");
  }
  if (validBreathing.length < BASELINE_MIN_BREATHING_SAMPLES) {
    missingSignals.push("breathing");
  }
  if (validHrvRmssd.length < BASELINE_MIN_HRV_SAMPLES) {
    missingSignals.push("hrv");
  }

  let isValid = true;
  let invalidReason: string | null = null;

  if (windowDurationMs < 75000) {
    isValid = false;
    invalidReason = `Measurement duration too short (${Math.round(windowDurationMs / 1000)}s; ${BASELINE_TARGET_SECONDS}s required)`;
  } else if (facePresentRatio < BASELINE_MIN_FACE_PRESENT_RATIO) {
    isValid = false;
    invalidReason = `Face not visible consistently (${Math.round(facePresentRatio * 100)}% visible; ${Math.round(BASELINE_MIN_FACE_PRESENT_RATIO * 100)}% required)`;
  } else if (missingSignals.length > 0) {
    isValid = false;
    const parts = missingSignals.map((s) => {
      if (s === "pulse") return `pulse (${validPulseValues.length}/${BASELINE_MIN_PULSE_SAMPLES}s)`;
      if (s === "breathing") return `breathing (${validBreathing.length}/${BASELINE_MIN_BREATHING_SAMPLES}s)`;
      if (s === "hrv") return `HRV (${validHrvRmssd.length}/${BASELINE_MIN_HRV_SAMPLES}s)`;
      return s;
    });
    invalidReason = `Incomplete calibration: Missing stable ${parts.join(", ")}`;
  } else if (motionRatio > BASELINE_MAX_MOTION_RATIO) {
    isValid = false;
    invalidReason = `Excessive motion detected during calibration (${Math.round(motionRatio * 100)}% motion)`;
  } else if (qualityScore < BASELINE_MIN_QUALITY_SCORE) {
    isValid = false;
    invalidReason = `Overall measurement quality below acceptable threshold (score: ${qualityScore}/100; ${BASELINE_MIN_QUALITY_SCORE} required)`;
  }

  const status: "complete" | "incomplete" = isValid ? "complete" : "incomplete";

  return {
    isValid,
    status,
    missingSignals: missingSignals.length > 0 ? missingSignals : undefined,
    invalidReason,
    durationSeconds,

    pulseMean: pulseStats.mean,
    pulseMedian: pulseStats.median,
    pulseMin: pulseStats.min,
    pulseMax: pulseStats.max,
    pulseSd: pulseStats.sd,
    pulseConfidence: pulseMeanConf,
    pulseSampleCount: validPulseValues.length,

    hrvRmssd: hrvRmssdStats.mean,
    hrvSdnn: hrvSdnnStats.mean,
    hrvMeanNn: hrvMeanNnStats.mean,
    hrvBaevsky: hrvBaevskyStats.mean,
    hrvConfidence: hrvMeanConf,
    hrvSampleCount: validHrvRmssd.length,

    breathingMean: breathingStats.mean,
    breathingSd: breathingStats.sd,
    breathingConfidence: breathingMeanConf,
    breathingSampleCount: validBreathing.length,

    blinkCount,
    blinkRatePerMin,

    expressionMap,
    dominantExpression,

    edaMean: edaStats.mean,
    edaSd: edaStats.sd,
    edaSlope,

    facePresentRatio,
    talkingRatio,
    motionRatio,
    validationHistogram,
    qualityScore,
  };
}
