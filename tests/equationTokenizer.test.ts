import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tokenizeEquation, verifyEquationParity } from "../src/utils/equationTokenizer.ts";

const ALL_FORMULAS = [
  // ComposureExplainerModal formulas
  "PulseControl = clamp(40, 100, 100 - (PeakPulse - RestingPulse) × 2.2)",
  "RecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)",
  "ComposureScore = round(PulseControl × 0.60 + RecoveryScore × 0.40)",

  // TimelineExplainerModal formulas
  "PulseReading(t) = Rolling12sMean(MicroCapillaryPulseFrequencies) in bpm",
  "ConversationalTriggerTime = max(0, PeakTimestamp - 12 seconds)",

  // MetricExplainerModal formulas
  "RecoveryLatency = Time(Pulse <= Baseline + 5 bpm) - Time(PeakPulseSpike)\nRecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)",
  "PulseRise = max(0, PeakPulse - CalibratedRestingBaseline)\nPulseControlScore = clamp(40, 100, 100 - PulseRise × 2.2)",
  "RMSSD = sqrt( 1 / (N - 1) × Σ (RR[i+1] - RR[i])² ) in ms\nRequires a continuous 60s window of steady optical telemetry.",
  "SI = AMo / (2 × Mo × MxDMn)\nwhere Mo is mode RR interval, AMo is mode amplitude (%), and MxDMn is interval spread.",
  "BreathingRate = Optical Sinus Cycles per 30s Window (valid range: 5–40 br/min)",
  "BlinkRate = (Debounced Eyelid Closure Rising Edges / DurationMinutes)",
  "SpeakingShare% = (Total User Talk Seconds / Total Session Seconds) × 100",
  "ComposureScore = round( PulseControl × 0.60 + RecoveryScore × 0.40 )\nwhere PulseControl = clamp(40, 100, 100 - PulseRise × 2.2)\nand RecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)",
  "AutonomicScore = clamp(40, 100, round((SessionAvgHRV / BaselineHRV) × 100))\nRequires sessions ≥ 60 seconds with active baseline.",
  "Requires studio direct lighting. When lighting is dim or uncalibrated, telemetry displays as unmeasured ('—') to prevent false estimations.",
];

describe("Equation Tokenizer Copy Parity", () => {
  for (const [index, formula] of ALL_FORMULAS.entries()) {
    it(`formula #${index + 1} reconstructs byte-identically`, () => {
      assert.equal(verifyEquationParity(formula), true);
      const tokens = tokenizeEquation(formula);
      const joined = tokens.map((t) => t.text).join("");
      assert.equal(joined, formula);
    });
  }

  it("identifies known functions correctly", () => {
    const tokens = tokenizeEquation("clamp(40, 100, 100 - max(0, x))");
    const functions = tokens.filter((t) => t.type === "function").map((t) => t.text);
    assert.deepEqual(functions, ["clamp", "max"]);
  });

  it("identifies numbers correctly", () => {
    const tokens = tokenizeEquation("clamp(40, 100, 2.2)");
    const numbers = tokens.filter((t) => t.type === "number").map((t) => t.text);
    assert.deepEqual(numbers, ["40", "100", "2.2"]);
  });
});
