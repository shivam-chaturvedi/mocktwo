import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  METRIC_MODAL_DEFINITIONS,
  COMPOSURE_MODAL_DATA,
  TIMELINE_MODAL_DATA,
  type MetricType,
} from "../src/data/infoModalContent.ts";
import { tokenizeEquation } from "../src/utils/equationTokenizer.ts";

describe("Info Modals Copy Parity Baseline", () => {
  const metricKeys: MetricType[] = [
    "recovery",
    "pulse",
    "hrv",
    "baevsky",
    "breathing",
    "blinks",
    "speaking",
    "composure",
    "autonomic_balance",
    "expression_calm",
  ];

  it("contains exactly 10 metric modal definitions", () => {
    assert.equal(metricKeys.length, 10);
    for (const key of metricKeys) {
      assert.ok(METRIC_MODAL_DEFINITIONS[key], `Missing key ${key}`);
    }
  });

  it("preserves Composure Explainer modal exact text byte-for-byte", () => {
    assert.equal(COMPOSURE_MODAL_DATA.title, "Understanding Composure");
    assert.equal(
      COMPOSURE_MODAL_DATA.subtitle,
      "How your score is measured, calculated, and interpreted"
    );
    assert.equal(
      COMPOSURE_MODAL_DATA.whatIsSectionTitle,
      "What is Composure Snapshot?"
    );
    assert.ok(
      COMPOSURE_MODAL_DATA.whatIsParagraph.startsWith(
        "Your Composure Snapshot reflects how calmly and steadily"
      )
    );
    assert.equal(
      COMPOSURE_MODAL_DATA.step1Formula,
      "PulseControl = clamp(40, 100, 100 - (PeakPulse - RestingPulse) × 2.2)"
    );
    assert.equal(
      COMPOSURE_MODAL_DATA.step2Formula,
      "RecoveryScore = clamp(40, 100, 100 - max(0, RecoverySeconds - 12) × 2.0)"
    );
    assert.equal(
      COMPOSURE_MODAL_DATA.step3Formula,
      "ComposureScore = round(PulseControl × 0.60 + RecoveryScore × 0.40)"
    );

    // Tiers
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers.length, 4);
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[0].name, "UNSHAKEABLE");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[0].range, "93% – 100%");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[1].name, "COMPOSED");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[1].range, "83% – 92%");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[2].name, "STEADY");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[2].range, "70% – 82%");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[3].name, "BUILDING");
    assert.equal(COMPOSURE_MODAL_DATA.percentagesTiers[3].range, "< 70%");

    // Nervousness levels
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers.length, 4);
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[0].name, "CALM");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[0].range, "≥ 88%");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[1].name, "MILD");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[1].range, "76% – 87%");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[2].name, "MODERATE");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[2].range, "60% – 75%");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[3].name, "HIGH");
    assert.equal(COMPOSURE_MODAL_DATA.nervousnessTiers[3].range, "< 60%");
  });

  it("preserves Pressure Timeline modal exact text byte-for-byte", () => {
    assert.equal(
      TIMELINE_MODAL_DATA.title,
      "Understanding Pressure Timeline"
    );
    assert.equal(
      TIMELINE_MODAL_DATA.subtitle,
      "Continuous cardiovascular response and conversational synchronization"
    );
    assert.equal(
      TIMELINE_MODAL_DATA.whatThisGraphSectionTitle,
      "What This Graph Denotes"
    );
    assert.equal(
      TIMELINE_MODAL_DATA.step1Formula,
      "PulseReading(t) = Rolling12sMean(MicroCapillaryPulseFrequencies) in bpm"
    );
    assert.equal(
      TIMELINE_MODAL_DATA.step4Formula,
      "ConversationalTriggerTime = max(0, PeakTimestamp - 12 seconds)"
    );
  });

  it("all formulas in definitions reconstruct identically after tokenization", () => {
    for (const key of metricKeys) {
      const def = METRIC_MODAL_DEFINITIONS[key];
      const tokens = tokenizeEquation(def.formula);
      const joined = tokens.map((t) => t.text).join("");
      assert.equal(
        joined,
        def.formula,
        `Formula for ${key} did not reconstruct identically`
      );
    }
  });
});
