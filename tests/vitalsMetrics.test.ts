import test from "node:test";
import assert from "node:assert/strict";
import {
  applyQualityGate,
  countBlinkEdges,
  averageExpressions,
  computeSummaryStats,
  computeQualityScore,
  summarizeBaseline,
  type VitalsSamplePoint,
  type ValidationEvent,
} from "../src/services/vitals/metrics.ts";

test("vitalsMetrics: applyQualityGate correctly validates signal stability and confidence thresholds", () => {
  // Low pulse confidence (< 40)
  const lowPulseConf = applyQualityGate({
    pulse: 72,
    pulseConfidence: 35,
    pulseStable: true,
  });
  assert.equal(lowPulseConf.pulseValid, false);

  // Unstable pulse
  const unstablePulse = applyQualityGate({
    pulse: 72,
    pulseConfidence: 65,
    pulseStable: false,
  });
  assert.equal(unstablePulse.pulseValid, false);

  // Validation error (code 1 = kNoFaceFound)
  const faceLostPulse = applyQualityGate({
    pulse: 72,
    pulseConfidence: 80,
    pulseStable: true,
    validationCode: 1,
  });
  assert.equal(faceLostPulse.pulseValid, false);

  // Valid pulse (conf >= 40, stable = true, code = 0)
  const validPulse = applyQualityGate({
    pulse: 72,
    pulseConfidence: 45,
    pulseStable: true,
    validationCode: 0,
  });
  assert.equal(validPulse.pulseValid, true);

  // Breathing gate (conf >= 45, stable = true)
  assert.equal(
    applyQualityGate({ breathingRate: 16, breathingConfidence: 40, breathingStable: true }).breathingValid,
    false
  );
  assert.equal(
    applyQualityGate({ breathingRate: 16, breathingConfidence: 50, breathingStable: true }).breathingValid,
    true
  );

  // HRV gate (conf >= 50, stable = true, rmssd > 0)
  assert.equal(
    applyQualityGate({ hrvRmssd: 45, hrvConfidence: 48, hrvStable: true }).hrvValid,
    false
  );
  assert.equal(
    applyQualityGate({ hrvRmssd: 45, hrvConfidence: 55, hrvStable: true }).hrvValid,
    true
  );
});

test("vitalsMetrics: countBlinkEdges counts rising edges with debouncing", () => {
  assert.equal(countBlinkEdges([]), 0);

  const series = [
    { timestampUs: 1_000_000, detected: false },
    { timestampUs: 1_050_000, detected: true },  // Edge 1
    { timestampUs: 1_100_000, detected: true },
    { timestampUs: 1_150_000, detected: false },
    // Rapid bounce within 100ms (< 200ms debounce threshold)
    { timestampUs: 1_200_000, detected: true },  // Should be ignored by debounce (only 150ms after edge 1)
    { timestampUs: 1_400_000, detected: false },
    { timestampUs: 1_600_000, detected: true },  // Edge 2 (> 200ms from prior edge)
    { timestampUs: 1_700_000, detected: false },
  ];

  const count = countBlinkEdges(series, 200);
  assert.equal(count, 2);
});

test("vitalsMetrics: averageExpressions computes mean confidences and dominant expression", () => {
  assert.deepEqual(averageExpressions([]), {
    expressionMap: {},
    dominantExpression: null,
  });

  const samples = [
    {
      timestampUs: 1_000_000,
      stable: true,
      scores: [
        { type: 6, confidence: 0.8 }, // NEUTRAL
        { type: 5, confidence: 0.1 }, // HAPPY
      ],
    },
    {
      timestampUs: 2_000_000,
      stable: false, // Unstable frame ignored
      scores: [
        { type: 5, confidence: 0.99 },
      ],
    },
    {
      timestampUs: 3_000_000,
      stable: true,
      scores: [
        { type: 6, confidence: 0.6 }, // NEUTRAL -> avg 0.7
        { type: 5, confidence: 0.3 }, // HAPPY -> avg 0.2
      ],
    },
  ];

  const result = averageExpressions(samples);
  assert.equal(result.expressionMap["NEUTRAL"], 0.7);
  assert.equal(result.expressionMap["HAPPY"], 0.2);
  assert.equal(result.dominantExpression, "HAPPY"); // Dominant non-neutral expression
});

test("vitalsMetrics: computeSummaryStats returns pure stats or nulls without hallucinating", () => {
  const empty = computeSummaryStats([]);
  assert.equal(empty.mean, null);
  assert.equal(empty.median, null);
  assert.equal(empty.sd, null);

  const stats = computeSummaryStats([60, 70, 80]);
  assert.equal(stats.mean, 70);
  assert.equal(stats.median, 70);
  assert.equal(stats.min, 60);
  assert.equal(stats.max, 80);
  assert.equal(stats.sd, 8.16);
});

test("vitalsMetrics: computeQualityScore enforces deterministic bounds", () => {
  // Lost face (< 30%)
  const scoreFaceLost = computeQualityScore({
    facePresentRatio: 0.1,
    pulseValidRatio: 0.8,
    breathingValidRatio: 0.8,
    motionRatio: 0,
    talkingRatio: 0,
  });
  assert.equal(scoreFaceLost, 0);

  // Perfect session
  const scorePerfect = computeQualityScore({
    facePresentRatio: 1.0,
    pulseValidRatio: 1.0,
    breathingValidRatio: 1.0,
    motionRatio: 0.0,
    talkingRatio: 0.0,
  });
  assert.equal(scorePerfect, 100);

  // Penalty for talking and motion
  const scoreDisturbed = computeQualityScore({
    facePresentRatio: 0.9,
    pulseValidRatio: 0.8,
    breathingValidRatio: 0.8,
    motionRatio: 0.3,
    talkingRatio: 0.2,
  });
  assert.ok(scoreDisturbed < scorePerfect);
  assert.ok(scoreDisturbed >= 0 && scoreDisturbed <= 100);
});

test("vitalsMetrics: summarizeBaseline handles empty, short, and clean scenarios", () => {
  // Empty
  const emptySummary = summarizeBaseline([], [], 60000);
  assert.equal(emptySummary.isValid, false);
  assert.equal(emptySummary.pulseSampleCount, 0);
  assert.equal(emptySummary.pulseMean, null);
  assert.equal(emptySummary.qualityScore, 0);
  assert.ok(emptySummary.invalidReason?.includes("No vitals"));

  // Too short (< 45s)
  const shortSamples: VitalsSamplePoint[] = Array.from({ length: 30 }, (_, i) => ({
    timestampUs: (i + 1) * 1_000_000,
    tMs: (i + 1) * 1000,
    pulse: 70,
    pulseConfidence: 60,
    pulseStable: true,
    breathingRate: 15,
    breathingConfidence: 60,
    breathingStable: true,
  }));
  const shortSummary = summarizeBaseline(shortSamples, [{ timestampUs: 1_000_000, code: 0 }], 30000);
  assert.equal(shortSummary.isValid, false);
  assert.ok(shortSummary.invalidReason?.includes("too short"));

  // Valid 60s calibration
  const validSamples: VitalsSamplePoint[] = Array.from({ length: 60 }, (_, i) => ({
    timestampUs: (i + 1) * 1_000_000,
    tMs: (i + 1) * 1000,
    pulse: 65 + (i % 5),
    pulseConfidence: 85,
    pulseStable: true,
    breathingRate: 14 + (i % 2),
    breathingConfidence: 80,
    breathingStable: true,
    hrvRmssd: i >= 40 ? 55 : null, // HRV emerges after warm-up
    hrvConfidence: i >= 40 ? 75 : null,
    hrvStable: i >= 40 ? true : false,
    validationCode: 0,
  }));

  const validationEvents: ValidationEvent[] = [
    { timestampUs: 1_000_000, code: 0 },
    { timestampUs: 30_000_000, code: 0 },
    { timestampUs: 60_000_000, code: 0 },
  ];

  const validSummary = summarizeBaseline(validSamples, validationEvents, 60000);
  assert.equal(validSummary.isValid, true);
  assert.equal(validSummary.invalidReason, null);
  assert.equal(validSummary.pulseSampleCount, 60);
  assert.ok(validSummary.pulseMean !== null && validSummary.pulseMean >= 65);
  assert.ok(validSummary.breathingMean !== null && validSummary.breathingMean >= 14);
  assert.equal(validSummary.hrvSampleCount, 20);
  assert.equal(validSummary.hrvRmssd, 55);
  assert.ok(validSummary.qualityScore >= 80);
});
