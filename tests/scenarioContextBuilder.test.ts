import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildScenarioContext,
  MAX_WORDS,
} = require("../electron/tavus/scenarioContextBuilder.cjs");

describe("Milestone S3: Scenario Context Builder", () => {
  test("All sections present with valid formatting", () => {
    const sc = {
      title: "Executive Escalation",
      interactionType: "Difficult Conversations",
      difficulty: "Advanced",
      context: "Client experienced a severe billing delay and is furious.",
      keyChallenges: ["Threatens to churn", "Demands immediate credit"],
      learningObjectives: ["Acknowledge mistake calmly", "Secure timeline"],
      openingLine: "Explain why this delay occurred."
    };

    const res = buildScenarioContext(sc);
    assert.ok(res.context.includes("# SCENARIO: Executive Escalation"));
    assert.ok(res.context.includes("Category: Difficult Conversations"));
    assert.ok(res.context.includes("Difficulty: Advanced"));
    assert.ok(res.context.includes("## SITUATION"));
    assert.ok(res.context.includes("## HOW YOU CHALLENGE THE USER"));
    assert.ok(res.context.includes("- Threatens to churn"));
    assert.ok(res.context.includes("## WHAT THE USER IS PRACTICING"));
    assert.ok(res.context.includes("- Acknowledge mistake calmly"));
    assert.equal(res.truncated, false);
    assert.equal(res.greeting, "Explain why this delay occurred.");
  });

  test("Handles empty challenges gracefully (omits section)", () => {
    const sc = {
      title: "Simple Practice",
      context: "Just a quick warmup.",
      keyChallenges: [],
      learningObjectives: ["Practice steady breathing"]
    };

    const res = buildScenarioContext(sc);
    assert.ok(!res.context.includes("## HOW YOU CHALLENGE THE USER"));
    assert.ok(res.context.includes("## WHAT THE USER IS PRACTICING"));
    assert.equal(res.greeting, null);
  });

  test("Does not crash on bad JSON in challenges or objectives", () => {
    const sc = {
      title: "Broken JSON Test",
      context: "Valid text",
      keyChallenges: "{not valid json",
      learningObjectives: null
    };

    const res = buildScenarioContext(sc);
    assert.ok(res.context.includes("# SCENARIO: Broken JSON Test"));
    assert.ok(!res.context.includes("## HOW YOU CHALLENGE THE USER"));
    assert.ok(!res.context.includes("## WHAT THE USER IS PRACTICING"));
  });

  test("Handles missing title and special characters", () => {
    const sc = {
      title: "   ",
      context: "Unicode: 🚀 & symbols: <>&\"",
      keyChallenges: ["Challenge & Co."],
      learningObjectives: ["Objective with emoji 🎯"]
    };

    const res = buildScenarioContext(sc);
    assert.ok(res.context.includes("# SCENARIO: Untitled scenario"));
    assert.ok(res.context.includes("Unicode: 🚀 & symbols: <>&\""));
  });

  test("Enforces 750 word cap on long situations and sets truncated", () => {
    // Generate a 3,000 word situation
    const words = Array.from({ length: 3000 }, (_, i) => `word${i}`);
    const longContext = words.join(" ");

    const sc = {
      title: "Mega Long Scenario",
      context: longContext,
      keyChallenges: ["Objection 1", "Objection 2"],
      learningObjectives: ["Goal 1", "Goal 2"]
    };

    const res = buildScenarioContext(sc);
    assert.equal(res.truncated, true);
    assert.ok(res.wordCount <= MAX_WORDS, `wordCount ${res.wordCount} should be <= ${MAX_WORDS}`);
    assert.ok(res.context.includes("## SITUATION"));
    assert.ok(res.context.includes("## HOW YOU CHALLENGE THE USER"));
    assert.ok(res.context.includes("## WHAT THE USER IS PRACTICING"));
  });
});
