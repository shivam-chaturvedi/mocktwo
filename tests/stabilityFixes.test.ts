import test from "node:test";
import assert from "node:assert/strict";
import { calculateComposureScore } from "../src/services/biometrics.ts";
import { EmptyAuthService } from "../src/services/api/emptyAdapters.ts";
import { formatContextSetting } from "../src/types/index.ts";

test("Stability: calculateComposureScore returns valid composure tiers and scores across boundary cases", () => {
  // Case 1: Minimum bounds
  const minScore = calculateComposureScore({
    pulseRiseVsBaseline: 60,
    peakPulse: 140,
    recoverySecondsApprox: 90,
    hrvVsBaseline: -30,
    edaArousalVsBaseline: 1.0,
    expressionTensionShare: 1.0,
    signalsAvailableCount: 5,
  });
  assert.ok(minScore.score >= 0 && minScore.score <= 100);
  assert.strictEqual(minScore.tier, "Building");
  assert.strictEqual(minScore.isPartial, false);

  // Case 2: Maximum bounds (calm)
  const calmScore = calculateComposureScore({
    pulseRiseVsBaseline: 0,
    peakPulse: 68,
    recoverySecondsApprox: 8,
    hrvVsBaseline: 5,
    edaArousalVsBaseline: 0,
    expressionTensionShare: 0,
    signalsAvailableCount: 5,
  });
  assert.ok(calmScore.score >= 88);
  assert.strictEqual(calmScore.tier, "Unshakeable");
  assert.strictEqual(calmScore.nervousness, "Calm");

  // Case 3: Partial signals count < 5
  const partialScore = calculateComposureScore({
    pulseRiseVsBaseline: 10,
    peakPulse: 78,
    signalsAvailableCount: 3,
  });
  assert.strictEqual(partialScore.isPartial, true);
});

test("Stability: EmptyAuthService.signIn rejects immediately with unavailable offline error", async () => {
  const auth = new EmptyAuthService();
  assert.strictEqual(auth.isAuthenticated(), false);
  const currentUser = await auth.getCurrentUser();
  assert.strictEqual(currentUser, null);

  await assert.rejects(
    async () => {
      await auth.signIn("test@company.com");
    },
    {
      message: /Authentication service is unavailable offline/,
    }
  );
});

test("Stability: formatContextSetting sanitizes prefixes cleanly without recursion or duplication", () => {
  assert.strictEqual(formatContextSetting(""), "");
  assert.strictEqual(formatContextSetting("Office 402"), "Office 402");
  assert.strictEqual(formatContextSetting("Meeting Room A"), "Meeting Room A");
  assert.strictEqual(formatContextSetting("Room Room 101"), "Room 101");
});

test("Stability: Monotonic timer elapsed clamping invariant", () => {
  const TOTAL_SESSION_SECONDS = 60;
  const start = 1000;
  
  // Normal elapsed
  const nowNormal = 15000;
  const elapsedNormal = Math.min(TOTAL_SESSION_SECONDS, Math.floor((nowNormal - start) / 1000));
  assert.strictEqual(elapsedNormal, 14);

  // Exceeded session limit
  const nowExceeded = 80000;
  const elapsedExceeded = Math.min(TOTAL_SESSION_SECONDS, Math.floor((nowExceeded - start) / 1000));
  assert.strictEqual(elapsedExceeded, TOTAL_SESSION_SECONDS);
});

test("Stability: Progress statistics math handles empty arrays without NaN", () => {
  const completedRecordings: { durationSeconds: number; composureScore?: number; recoveryTimeSeconds?: number; averageHeartRate?: number }[] = [];
  
  // Averages
  const scored = completedRecordings.filter((r) => r.composureScore != null && !isNaN(r.composureScore));
  const avgComposure = scored.length === 0 ? 0 : Math.round(scored.reduce((acc, r) => acc + (r.composureScore || 0), 0) / scored.length);
  assert.strictEqual(isNaN(avgComposure), false);
  assert.strictEqual(avgComposure, 0);

  const totalSecs = completedRecordings.reduce((acc, r) => acc + (r.durationSeconds || 0), 0);
  const totalPracticeMinutes = Math.round(totalSecs / 60);
  assert.strictEqual(isNaN(totalPracticeMinutes), false);
  assert.strictEqual(totalPracticeMinutes, 0);
});
