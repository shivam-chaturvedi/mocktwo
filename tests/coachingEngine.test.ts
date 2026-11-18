import { test, describe } from "node:test";
import assert from "node:assert";
import { generateCoaching } from "../src/utils/coachingEngine.ts";

describe("generateCoaching", () => {
  test("returns null for completely empty session without transcript or vitals", () => {
    const res = generateCoaching({
      transcript: [],
      vitalsSamples: [],
      durationSeconds: 5,
      baseline: null,
    });
    assert.strictEqual(res, null);
  });

  test("generates real pressure moments and skills from real transcript and pulse spike", () => {
    const transcript = [
      { speaker: "Dr. Amara Bennett", text: "How do you plan to handle this crisis?", startMs: 2000, endMs: 5000 },
      { speaker: "You", text: "We have established immediate mitigation protocols.", startMs: 6000, endMs: 9000 },
      { speaker: "Dr. Amara Bennett", text: "That is not enough for our critical commitments.", startMs: 12000, endMs: 15000 },
      { speaker: "You", text: "Let us review the operational escalation matrix.", startMs: 16000, endMs: 20000 },
    ];

    const vitalsSamples = [
      { timestampOffsetMs: 2000, pulseBpm: 68, hrvRmssd: 50, breathingRate: 14, confidence: 90, isClean: true },
      { timestampOffsetMs: 13000, pulseBpm: 84, hrvRmssd: 35, breathingRate: 18, confidence: 92, isClean: true },
      { timestampOffsetMs: 25000, pulseBpm: 72, hrvRmssd: 48, breathingRate: 15, confidence: 90, isClean: true },
    ];

    const coaching = generateCoaching({
      transcript,
      vitalsSamples,
      durationSeconds: 30,
      baseline: { restingPulse: 68, restingHrvRmssd: 52, restingBreathingRate: 14 },
      composureScore: 82,
      avgPulse: 74,
      peakPulse: 84,
      recoverySeconds: 12,
    });

    assert.notStrictEqual(coaching, null);
    assert.strictEqual(coaching?.pressureSkills.length, 5);
    assert.ok(coaching?.pressureMoments.length! >= 1);
    assert.strictEqual(coaching?.composureTier, "Composed");
    assert.ok(coaching?.summarySentence.includes("12 seconds"));

    // Verify evidence is present for all items
    for (const moment of coaching?.pressureMoments || []) {
      assert.ok(moment.evidence && moment.evidence.length > 0, "Pressure moments must have evidence");
    }
    for (const item of coaching?.whereHeldSteady || []) {
      assert.ok(item.evidence && item.evidence.length > 0, "Held steady items must have evidence");
    }
    for (const skill of coaching?.pressureSkills || []) {
      assert.ok(skill.evidence && skill.evidence.length > 0, "Pressure skills must have evidence");
    }
  });

  test("handles session with camera turned off (honest unavailable biometric states)", () => {
    const transcript = [
      { speaker: "Victor Hale", text: "We need an answer right now.", startMs: 1000, endMs: 3000 },
      { speaker: "You", text: "Understood, here is the resolution path.", startMs: 4000, endMs: 7000 },
    ];

    const coaching = generateCoaching({
      transcript,
      vitalsSamples: [], // Zero vitals because camera was off
      durationSeconds: 20,
      baseline: null,
      composureScore: null,
      avgPulse: null,
      peakPulse: null,
      recoverySeconds: null,
    });

    assert.notStrictEqual(coaching, null);
    assert.ok(coaching?.summarySentence.includes("Camera measurements were inactive"));

    // Skills must be score 0 and state unavailable honestly
    for (const skill of coaching?.pressureSkills || []) {
      assert.strictEqual(skill.score, 0, "Skill score must be 0 when camera was off");
      assert.ok(skill.assessment.includes("unavailable") || skill.assessment.includes("unmeasured"), "Assessment must state unavailable");
    }
  });
});
