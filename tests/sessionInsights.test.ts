import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeSessionInsights,
  computeSpeechMetrics,
  DOCUMENTED_FILLER_WORDS,
} from "../src/utils/sessionInsights.ts";

describe("sessionInsights Engine", () => {
  test("computes accurate speech metrics including filler words, response latency, and WPM", () => {
    const transcript = [
      { speaker: "Dr. Amara Bennett", text: "How do you plan to handle this crisis?", startMs: 1000, endMs: 4000 },
      { speaker: "You", text: "Um, actually we have, like, basically resolved the root cause.", startMs: 5500, endMs: 9500 },
      { speaker: "Dr. Amara Bennett", text: "Are you certain?", startMs: 11000, endMs: 12500 },
      { speaker: "You", text: "Yes, our operational mitigation is verified.", startMs: 13500, endMs: 16500 },
    ];

    const metrics = computeSpeechMetrics(transcript, 20);

    // 1. Filler words: "um", "actually", "like", "basically" -> 4 filler words
    assert.strictEqual(metrics.fillerWordCount, 4);
    assert.strictEqual(metrics.fillerWordsFound["um"], 1);
    assert.strictEqual(metrics.fillerWordsFound["actually"], 1);
    assert.strictEqual(metrics.fillerWordsFound["like"], 1);
    assert.strictEqual(metrics.fillerWordsFound["basically"], 1);

    // 2. Response latency:
    // Turn 1 -> Turn 2: 5500 - 4000 = 1500ms
    // Turn 3 -> Turn 4: 13500 - 12500 = 1000ms
    // Average: (1500 + 1000) / 2 = 1250ms
    assert.strictEqual(metrics.avgResponseLatencyMs, 1250);

    // 3. User speaking time: (9500 - 5500) + (16500 - 13500) = 4000 + 3000 = 7000ms
    // Talk time ratio: 7000 / 20000 = 0.35
    assert.strictEqual(metrics.talkTimeRatio, 0.35);

    // 4. Words per minute: 15 words in 7 seconds = (15 / 7) * 60 = ~129 WPM
    assert.ok(metrics.wordsPerMinute >= 100 && metrics.wordsPerMinute <= 160);
    assert.strictEqual(metrics.longestMonologueSeconds, 4);
    assert.strictEqual(metrics.overlapsCount, 0);
  });

  test("computes empirical vitals deltas, coverage ratios, and gates HRV to 60s", () => {
    const vitalsSamples = [
      { timestampOffsetMs: 5000, pulseBpm: 68, hrvRmssd: 55, breathingRate: 14, isClean: true },
      { timestampOffsetMs: 15000, pulseBpm: 84, hrvRmssd: 38, breathingRate: 18, isClean: true },
      { timestampOffsetMs: 25000, pulseBpm: 72, hrvRmssd: 48, breathingRate: 15, isClean: true },
    ];

    // Session duration: 30s (< 60s, so HRV RMSSD is gated to null)
    const insights30s = computeSessionInsights({
      transcript: [],
      vitalsSamples,
      durationSeconds: 30,
      baseline: { restingPulse: 68, restingHrvRmssd: 52, restingBreathingRate: 14 },
    });

    assert.strictEqual(insights30s.vitals.pulseMin, 68);
    assert.strictEqual(insights30s.vitals.pulsePeak, 84);
    assert.strictEqual(insights30s.vitals.pulseRiseBpm, 16);
    assert.strictEqual(insights30s.vitals.hrvRmssd, null, "HRV must be null for sessions < 60s");

    // Session duration: 65s (>= 60s, so HRV RMSSD is exposed)
    const insights65s = computeSessionInsights({
      transcript: [],
      vitalsSamples,
      durationSeconds: 65,
      baseline: { restingPulse: 68, restingHrvRmssd: 52, restingBreathingRate: 14 },
    });
    assert.ok(insights65s.vitals.hrvRmssd !== null, "HRV must be available for sessions >= 60s");
  });

  test("enforces evidence-required invariant on every coaching item", () => {
    const transcript = [
      { speaker: "Dr. Amara Bennett", text: "The contract renewal terms are unacceptable.", startMs: 2000, endMs: 5000 },
      { speaker: "You", text: "Let us review the operational escalation matrix.", startMs: 7000, endMs: 11000 },
    ];

    const vitalsSamples = [
      { timestampOffsetMs: 2000, pulseBpm: 68, isClean: true },
      { timestampOffsetMs: 6000, pulseBpm: 86, isClean: true },
    ];

    const insights = computeSessionInsights({
      transcript,
      vitalsSamples,
      durationSeconds: 20,
      baseline: { restingPulse: 68 },
      recoverySeconds: 14,
    });

    const coaching = insights.coaching;
    assert.notStrictEqual(coaching, null);

    // Rule: Every item MUST have evidence and evidence.length > 0
    for (const m of coaching?.pressureMoments || []) {
      assert.ok(m.evidence && m.evidence.length > 0, `Moment at ${m.timestampSeconds}s must have evidence`);
    }
    for (const h of coaching?.whereHeldSteady || []) {
      assert.ok(h.evidence && h.evidence.length > 0, `Held steady item "${h.title}" must have evidence`);
    }
    for (const s of coaching?.whereShowedStrain || []) {
      assert.ok(s.evidence && s.evidence.length > 0, `Strain item "${s.title}" must have evidence`);
    }
    for (const c of coaching?.counterpartHandling || []) {
      assert.ok(c.evidence && c.evidence.length > 0, `Counterpart handling "${c.area}" must have evidence`);
    }
    for (const sk of coaching?.pressureSkills || []) {
      assert.ok(sk.evidence && sk.evidence.length > 0, `Pressure skill "${sk.name}" must have evidence`);
    }
    for (const d of coaching?.drills || []) {
      assert.ok(d.evidence && d.evidence.length > 0, `Practice drill "${d.title}" must have evidence`);
    }
  });

  test("handles camera turned off (honest zero scores & unmeasured assessments)", () => {
    const transcript = [
      { speaker: "Victor Hale", text: "We need an answer right now.", startMs: 1000, endMs: 3000 },
      { speaker: "You", text: "Understood, here is our answer.", startMs: 4000, endMs: 6000 },
    ];

    const insights = computeSessionInsights({
      transcript,
      vitalsSamples: [],
      durationSeconds: 15,
      videoOffSeconds: 15,
      baseline: null,
    });

    assert.strictEqual(insights.vitals.pulseMean, null);
    assert.strictEqual(insights.vitals.pulsePeak, null);
    assert.strictEqual(insights.vitals.coverageRatio, 0);

    for (const skill of insights.coaching?.pressureSkills || []) {
      assert.strictEqual(skill.score, 0);
      assert.ok(skill.assessment.includes("unavailable") || skill.assessment.includes("unmeasured"));
    }
  });
});
