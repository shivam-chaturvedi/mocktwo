import test from "node:test";
import assert from "node:assert/strict";
import { computeSessionMetrics, type TelemetrySample } from "../src/utils/analyticsScoring.ts";

test("AnalyticsScoring: returns nulls when no clean vitals or baseline exist", () => {
  const resultNoBaseline = computeSessionMetrics([], null);
  assert.strictEqual(resultNoBaseline.composureScore, null);
  assert.strictEqual(resultNoBaseline.avgPulse, null);
  assert.strictEqual(resultNoBaseline.peakPulse, null);
  assert.strictEqual(resultNoBaseline.tier, null);

  const dirtySamples: TelemetrySample[] = [
    { timestampOffsetMs: 1000, pulseBpm: 75, isClean: false },
    { timestampOffsetMs: 2000, pulseBpm: null, isClean: true },
  ];
  const resultDirty = computeSessionMetrics(dirtySamples, { restingPulse: 65 });
  assert.strictEqual(resultDirty.composureScore, null);
});

test("AnalyticsScoring: computes accurate pulse control and recovery metrics", () => {
  const baseline = { restingPulse: 65, restingHrvRmssd: 50 };
  const samples: TelemetrySample[] = [
    { timestampOffsetMs: 0, pulseBpm: 66, isClean: true },
    { timestampOffsetMs: 5000, pulseBpm: 72, isClean: true },
    { timestampOffsetMs: 10000, pulseBpm: 85, isClean: true }, // Peak: 85 (rise = 20)
    { timestampOffsetMs: 15000, pulseBpm: 78, isClean: true },
    { timestampOffsetMs: 20000, pulseBpm: 69, isClean: true }, // Recovered <= 70 (+5 bpm) at +10s
    { timestampOffsetMs: 25000, pulseBpm: 66, isClean: true },
  ];

  const metrics = computeSessionMetrics(samples, baseline);
  assert.strictEqual(metrics.peakPulse, 85);
  assert.strictEqual(metrics.pulseRise, 20);
  assert.strictEqual(metrics.recoverySeconds, 10);
  assert.ok(metrics.composureScore !== null && metrics.composureScore > 50);
  assert.ok(metrics.tier !== null);
});

test("AnalyticsScoring: gates HRV RMSSD until 60 seconds", () => {
  const baseline = { restingPulse: 65 };
  const shortSamples: TelemetrySample[] = [
    { timestampOffsetMs: 10000, pulseBpm: 70, hrvRmssd: 45, breathingRate: null, confidence: 80, isClean: true },
    { timestampOffsetMs: 30000, pulseBpm: 72, hrvRmssd: 48, breathingRate: null, confidence: 80, isClean: true },
  ];
  const shortMetrics = computeSessionMetrics(shortSamples, baseline);
  assert.strictEqual(shortMetrics.avgHrvRmssd, null, "HRV must be null for sessions < 60s");

  const fullSamples: TelemetrySample[] = [
    { timestampOffsetMs: 10000, pulseBpm: 70, hrvRmssd: 45, breathingRate: null, confidence: 80, isClean: true },
    { timestampOffsetMs: 65000, pulseBpm: 68, hrvRmssd: 52, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 70000, pulseBpm: 67, hrvRmssd: 56, breathingRate: null, confidence: 90, isClean: true },
  ];
  const fullMetrics = computeSessionMetrics(fullSamples, baseline);
  assert.strictEqual(fullMetrics.avgHrvRmssd, 54, "HRV must average samples >= 60s");
});

test("AnalyticsScoring: composure score tier thresholds", () => {
  const baseline = { restingPulse: 60 };
  
  // Minimal rise, rapid recovery -> high composure / Calm
  const calmSamples: TelemetrySample[] = [
    { timestampOffsetMs: 0, pulseBpm: 61, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 5000, pulseBpm: 62, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 10000, pulseBpm: 61, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
  ];
  const calmResult = computeSessionMetrics(calmSamples, baseline);
  assert.ok(calmResult.composureScore !== null && calmResult.composureScore >= 88);
  assert.strictEqual(calmResult.nervousness, "Calm");

  // Moderate rise without recovery -> Moderate
  const modSamples: TelemetrySample[] = [
    { timestampOffsetMs: 0, pulseBpm: 60, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 5000, pulseBpm: 78, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 10000, pulseBpm: 82, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 15000, pulseBpm: 84, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
    { timestampOffsetMs: 20000, pulseBpm: 85, hrvRmssd: null, breathingRate: null, confidence: 85, isClean: true },
  ];
  const modResult = computeSessionMetrics(modSamples, baseline);
  assert.ok(modResult.composureScore !== null && modResult.composureScore < 76);
  assert.ok(modResult.nervousness === "Moderate" || modResult.nervousness === "High");
});
