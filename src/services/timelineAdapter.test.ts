import test from "node:test";
import assert from "node:assert/strict";
import { buildTimelineSeries, formatTimeSeconds } from "./timelineAdapter.ts";
import type { SessionBiometrics } from "../types/index.ts";

test("formatTimeSeconds formats correctly", () => {
  assert.equal(formatTimeSeconds(0), "0:00");
  assert.equal(formatTimeSeconds(9), "0:09");
  assert.equal(formatTimeSeconds(65), "1:05");
  assert.equal(formatTimeSeconds(125), "2:05");
});

test("handles short sessions (< 12 seconds)", () => {
  const result = buildTimelineSeries(null, 8);
  assert.equal(result.isTooShort, true);
  assert.equal(result.hasBiometrics, false);
  assert.equal(result.points.length, 0);
  assert.match(result.summaryText, /too short/i);
});

test("handles null or unavailable biometrics", () => {
  const result = buildTimelineSeries(null, 45);
  assert.equal(result.hasBiometrics, false);
  assert.equal(result.points.length, 0);

  const unavailableBiometrics: Partial<SessionBiometrics> = {
    pulse: {
      rate: [],
      state: "unavailable",
      confidence: 0,
      windowSeconds: 12,
      rangeBpm: "40–110 bpm",
      baselineValue: 68,
      hasOutOfRange: false,
    },
    cleanMeasuredSeconds: 0,
    totalDurationSeconds: 45,
    signalsAvailableCount: 0,
    isPartialScore: true,
    readinessStatus: "Too short",
    nervousnessLevel: "Calm",
    peakStressMoments: [],
    validationEvents: [],
  };

  const unavailResult = buildTimelineSeries(unavailableBiometrics as SessionBiometrics, 45);
  assert.equal(unavailResult.hasBiometrics, false);
});

test("enforces SDK timing restrictions: pulse starts at 12s, EDA starts at 35s", () => {
  const mockBiometrics: Partial<SessionBiometrics> = {
    pulse: {
      rate: [
        { t: 2, value: 72, confidence: 90, stable: true },
        { t: 14, value: 75, confidence: 92, stable: true },
        { t: 40, value: 80, confidence: 95, stable: true },
      ],
      state: "measured",
      confidence: 90,
      windowSeconds: 12,
      rangeBpm: "40–110 bpm",
      baselineValue: 68,
      hasOutOfRange: false,
    },
    eda: {
      trace: [
        { t: 10, value: 0.2 },
        { t: 40, value: 0.55 },
      ],
      state: "measured",
      startSeconds: 35,
    },
    face: {
      trace: [
        { t: 14, isTalking: true, blinkCount: 1, expressions: {} as any },
        { t: 40, isTalking: false, blinkCount: 2, expressions: {} as any },
      ],
      expressionAverages: {} as any,
      blinkRatePerMin: 18,
      speakingSharePct: 40,
      state: "measured",
    },
    validationEvents: [],
    cleanMeasuredSeconds: 45,
    totalDurationSeconds: 45,
    signalsAvailableCount: 4,
    isPartialScore: false,
    readinessStatus: "Full read",
    nervousnessLevel: "Calm",
    peakStressMoments: [],
  };

  const result = buildTimelineSeries(mockBiometrics as SessionBiometrics, 45, 68);

  assert.equal(result.hasBiometrics, true);
  assert.equal(result.isTooShort, false);
  assert.equal(result.points.length, 46); // 0 to 45 seconds inclusive

  // 0-12s must be warming up
  assert.equal(result.points[0].isWarmingUp, true);
  assert.equal(result.points[0].pulse, null);
  assert.equal(result.points[11].isWarmingUp, true);
  assert.equal(result.points[11].pulse, null);

  // Even though pulse sample existed at t=2, it must not be plotted
  assert.equal(result.points[2].pulse, null);

  // At 14s, pulse is plotted
  assert.equal(result.points[14].pulse, 75);
  assert.equal(result.points[14].isWarmingUp, false);
  assert.equal(result.points[14].speaking, true);

  // EDA before 35s must be null
  assert.equal(result.points[10].eda, null);
  assert.equal(result.points[34].eda, null);

  // EDA at 40s should be 55%
  assert.equal(result.points[40].eda, 55);
  assert.equal(result.points[40].speaking, false);
});

test("handles out-of-range pulse (> 110 bpm or 'outOfRange')", () => {
  const mockBiometrics: Partial<SessionBiometrics> = {
    pulse: {
      rate: [
        { t: 14, value: 72, confidence: 90, stable: true },
        { t: 20, value: "outOfRange", confidence: 85, stable: true },
        { t: 26, value: 118, confidence: 88, stable: true }, // numeric > 110
        { t: 32, value: 78, confidence: 90, stable: true },
      ],
      state: "measured",
      confidence: 85,
      windowSeconds: 12,
      rangeBpm: "40–110 bpm",
      baselineValue: 68,
      hasOutOfRange: true,
    },
    validationEvents: [],
    cleanMeasuredSeconds: 40,
    totalDurationSeconds: 40,
    signalsAvailableCount: 3,
    isPartialScore: true,
    readinessStatus: "Quick read",
    nervousnessLevel: "High",
    peakStressMoments: [],
  };

  const result = buildTimelineSeries(mockBiometrics as SessionBiometrics, 40, 68);

  // Out of range points must NOT plot numbers
  assert.equal(result.points[20].pulse, null);
  assert.equal(result.points[20].outOfRange, true);

  assert.equal(result.points[26].pulse, null);
  assert.equal(result.points[26].outOfRange, true);

  // Normal points must plot
  assert.equal(result.points[14].pulse, 72);
  assert.equal(result.points[14].outOfRange, false);
  assert.equal(result.points[32].pulse, 78);
  assert.equal(result.points[32].outOfRange, false);

  assert.ok(result.outOfRangeBands.length > 0);
});

test("handles excessive motion and flags low confidence", () => {
  const mockBiometrics: Partial<SessionBiometrics> = {
    pulse: {
      rate: [
        { t: 14, value: 70, confidence: 90, stable: true },
        { t: 22, value: 76, confidence: 40, stable: false },
      ],
      state: "measured",
      confidence: 70,
      windowSeconds: 12,
      rangeBpm: "40–110 bpm",
      baselineValue: 68,
      hasOutOfRange: false,
    },
    validationEvents: [
      { timestampSeconds: 22, code: "EXCESSIVE_MOTION", hintText: "Excessive motion detected" },
    ],
    cleanMeasuredSeconds: 30,
    totalDurationSeconds: 30,
    signalsAvailableCount: 3,
    isPartialScore: true,
    readinessStatus: "Quick read",
    nervousnessLevel: "Moderate",
    peakStressMoments: [],
  };

  const result = buildTimelineSeries(mockBiometrics as SessionBiometrics, 30, 68);
  assert.equal(result.points[22].isExcessiveMotion, true);
  assert.equal(result.points[22].stable, false);
  assert.ok(result.motionBands.length > 0);
});

test("identifies peak points with 12s conversational lookback", () => {
  const mockBiometrics: Partial<SessionBiometrics> = {
    pulse: {
      rate: [
        { t: 14, value: 70, confidence: 90, stable: true },
        { t: 18, value: 74, confidence: 90, stable: true },
        { t: 22, value: 88, confidence: 90, stable: true }, // local peak
        { t: 26, value: 76, confidence: 90, stable: true },
        { t: 30, value: 72, confidence: 90, stable: true },
      ],
      state: "measured",
      confidence: 90,
      windowSeconds: 12,
      rangeBpm: "40–110 bpm",
      baselineValue: 68,
      hasOutOfRange: false,
    },
    validationEvents: [],
    cleanMeasuredSeconds: 35,
    totalDurationSeconds: 35,
    signalsAvailableCount: 4,
    isPartialScore: false,
    readinessStatus: "Full read",
    nervousnessLevel: "Moderate",
    peakStressMoments: [],
  };

  const result = buildTimelineSeries(mockBiometrics as SessionBiometrics, 35, 68);
  const peakPoints = result.peakPoints;

  assert.ok(peakPoints.length >= 1);
  const topPeak = peakPoints[0];
  assert.equal(topPeak.t, 22);
  assert.equal(topPeak.pulse, 88);
  assert.equal(topPeak.isPeak, true);
  // Lookback trigger should be max(0, 22 - 12) = 10s
  assert.equal(topPeak.peakTriggerSec, 10);
});

test("produces accessible summary text", () => {
  const result = buildTimelineSeries(null, 10);
  assert.match(result.summaryText, /10s was too short/);
});
