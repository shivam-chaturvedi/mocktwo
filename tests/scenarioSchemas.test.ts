import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { CATEGORIES as TS_CATEGORIES, DIFFICULTIES as TS_DIFFICULTIES } from "../src/types/index.ts";

const require = createRequire(import.meta.url);
const { CATEGORIES, DIFFICULTIES } = require("../electron/validators/scenarioEnums.cjs");
const {
  ScenarioStudioSchema,
  ScenarioStudioUpdateSchema,
  ScenarioLegacyCreateSchema,
  clean,
} = require("../electron/validators/scenarioSchemas.cjs");

describe("Milestone S2: Scenario Enums & Zod Schemas", () => {
  test("Enum Parity: CommonJS enums match TypeScript const arrays", () => {
    assert.deepEqual(CATEGORIES, Array.from(TS_CATEGORIES));
    assert.deepEqual(DIFFICULTIES, Array.from(TS_DIFFICULTIES));
  });

  test("Sanitizer cleans control characters but preserves newlines and unicode", () => {
    const raw = "Line 1\r\nLine 2\u0000\u0007\tTab";
    const cleaned = clean(raw);
    assert.ok(!cleaned.includes("\u0000"));
    assert.ok(!cleaned.includes("\u0007"));
    assert.ok(cleaned.includes("Line 1"));
    assert.ok(cleaned.includes("Line 2"));
  });

  test("ScenarioStudioSchema: accepts valid payload and strips control chars", () => {
    const valid = {
      title: "  Executive Budget Review \u0000 ",
      personaId: "persona-123",
      interactionType: "Negotiation",
      difficulty: "Advanced",
      context: "A multi-line situation description\r\nthat spans several sentences\nand explains the friction.",
      keyChallenges: ["Challenge 1", "Challenge 2"],
      learningObjectives: ["Objective 1", "Objective 2"],
      openingLine: "Thanks for meeting today."
    };

    const parsed = ScenarioStudioSchema.parse(valid);
    assert.equal(parsed.title, "Executive Budget Review");
    assert.equal(parsed.personaId, "persona-123");
    assert.equal(parsed.interactionType, "Negotiation");
    assert.equal(parsed.difficulty, "Advanced");
    assert.ok(parsed.context.includes("\n"));
    assert.deepEqual(parsed.keyChallenges, ["Challenge 1", "Challenge 2"]);
    assert.deepEqual(parsed.learningObjectives, ["Objective 1", "Objective 2"]);
    assert.equal(parsed.openingLine, "Thanks for meeting today.");
  });

  test("ScenarioStudioSchema: rejects invalid fields and unknown keys", () => {
    // Title too short
    assert.throws(() => {
      ScenarioStudioSchema.parse({
        title: "AB",
        personaId: "p-1",
        interactionType: "Negotiation",
        difficulty: "Advanced",
        context: "Sufficiently long situation narrative context.",
        learningObjectives: ["Goal 1"]
      });
    }, /Title|too_small/i);

    // Empty personaId
    assert.throws(() => {
      ScenarioStudioSchema.parse({
        title: "Valid Title",
        personaId: "",
        interactionType: "Negotiation",
        difficulty: "Advanced",
        context: "Sufficiently long situation narrative context.",
        learningObjectives: ["Goal 1"]
      });
    });

    // Unknown category
    assert.throws(() => {
      ScenarioStudioSchema.parse({
        title: "Valid Title",
        personaId: "p-1",
        interactionType: "NonexistentCategory",
        difficulty: "Advanced",
        context: "Sufficiently long situation narrative context.",
        learningObjectives: ["Goal 1"]
      });
    });

    // Empty learningObjectives
    assert.throws(() => {
      ScenarioStudioSchema.parse({
        title: "Valid Title",
        personaId: "p-1",
        interactionType: "Negotiation",
        difficulty: "Advanced",
        context: "Sufficiently long situation narrative context.",
        learningObjectives: []
      });
    });

    // Too many objectives (> 5)
    assert.throws(() => {
      ScenarioStudioSchema.parse({
        title: "Valid Title",
        personaId: "p-1",
        interactionType: "Negotiation",
        difficulty: "Advanced",
        context: "Sufficiently long situation narrative context.",
        learningObjectives: ["1", "2", "3", "4", "5", "6"]
      });
    });

    // Unknown extra key (strict)
    assert.throws(() => {
      ScenarioStudioSchema.parse({
        title: "Valid Title",
        personaId: "p-1",
        interactionType: "Negotiation",
        difficulty: "Advanced",
        context: "Sufficiently long situation narrative context.",
        learningObjectives: ["Goal 1"],
        unknownProperty: "injected"
      });
    }, /unrecognized_keys/i);
  });

  test("ScenarioStudioUpdateSchema: accepts partial updates with valid id", () => {
    const update = {
      id: "sc-123",
      title: "Updated Title",
      difficulty: "Foundational"
    };
    const parsed = ScenarioStudioUpdateSchema.parse(update);
    assert.equal(parsed.id, "sc-123");
    assert.equal(parsed.title, "Updated Title");
    assert.equal(parsed.difficulty, "Foundational");
  });

  test("ScenarioLegacyCreateSchema: accepts lenient legacy shapes", () => {
    const legacy = {
      title: "Legacy Scenario",
      summary: "Short brief",
      durationMinutes: 3,
      context: "Context string",
      customField: "allowed"
    };
    const parsed = ScenarioLegacyCreateSchema.parse(legacy);
    assert.equal(parsed.title, "Legacy Scenario");
    assert.equal(parsed.customField, "allowed");
  });
});
