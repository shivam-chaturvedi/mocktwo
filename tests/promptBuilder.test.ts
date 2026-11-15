import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildSystemPrompt,
  sanitizeString,
  PRESSURE_MAPPINGS,
} = require("../electron/tavus/promptBuilder.cjs");

describe("Milestone M3: promptBuilder Subsystem", () => {
  test("Sanitization collapses whitespace, strips control chars, and caps length", () => {
    const raw = "  Hello \x00\x07 world \n\t from \x1B mocktwo!   ";
    const sanitized = sanitizeString(raw, 20);
    assert.equal(sanitized, "Hello world from moc");
    assert.ok(sanitized.length <= 20);
  });

  test("Builds correct system prompt with all sections and pressure mapping for 'Moderate'", () => {
    const persona = {
      name: "Marcus Vance",
      title: "Chief Financial Officer",
      contextSetting: "Executive Boardroom",
      seniority: "Senior Executive",
      pressureLevel: "Moderate",
      temperamentTraits: ["Analytical", "Skeptical"],
      backstory: "Has 20 years of audit experience.",
      communicationNotes: "Demands precise unit economics.",
    };

    const res = buildSystemPrompt(persona);
    assert.equal(res.error, null);
    assert.ok(res.wordCount > 50 && res.wordCount < 500);
    assert.equal(res.warnings.length, 0);

    // Section headers
    assert.ok(res.prompt.includes("# IDENTITY AND ROLE"));
    assert.ok(res.prompt.includes("# PERSONALITY AND STYLE"));
    assert.ok(res.prompt.includes("# CORE BEHAVIORS"));
    assert.ok(res.prompt.includes("# RESPONSE STYLE"));
    assert.ok(res.prompt.includes("# GUARDRAILS"));

    // Content checks
    assert.ok(res.prompt.includes("You are Marcus Vance, Chief Financial Officer. Setting: Executive Boardroom. Seniority: Senior Executive."));
    assert.ok(res.prompt.includes("Background: Has 20 years of audit experience."));
    assert.ok(res.prompt.includes(PRESSURE_MAPPINGS.Moderate.sentence));
    assert.ok(res.prompt.includes("Demands precise unit economics."));

    // Flow config
    assert.equal(res.flowConfig.turnTakingPatience, "high");
    assert.equal(res.flowConfig.palInterruptibility, "high");
  });

  test("Maps 'High' and 'Intense' pressure levels to correct sentences and flow patience/interruptibility", () => {
    const highRes = buildSystemPrompt({ pressureLevel: "High" });
    assert.ok(highRes.prompt.includes(PRESSURE_MAPPINGS.High.sentence));
    assert.equal(highRes.flowConfig.turnTakingPatience, "medium");
    assert.equal(highRes.flowConfig.palInterruptibility, "medium");

    const intenseRes = buildSystemPrompt({ pressureLevel: "Intense" });
    assert.ok(intenseRes.prompt.includes(PRESSURE_MAPPINGS.Intense.sentence));
    assert.equal(intenseRes.flowConfig.turnTakingPatience, "low");
    assert.equal(intenseRes.flowConfig.palInterruptibility, "low");
  });

  test("Omits backstory and behavior note lines cleanly when empty", () => {
    const minimal = buildSystemPrompt({
      name: "Alex",
      title: "Coach",
      contextSetting: "Office",
      seniority: "Peer",
    });

    assert.ok(!minimal.prompt.includes("Background:"));
    assert.ok(minimal.prompt.includes("# CORE BEHAVIORS"));
    assert.ok(minimal.prompt.includes("Escalate when the person is vague"));
  });

  test("Emits soft warning above 500 words and hard error above 700 words", () => {
    // Generate long text
    const longChunk = "word ".repeat(300);
    const over500 = buildSystemPrompt({
      backstory: longChunk,
      communicationNotes: "word ".repeat(150),
    });
    assert.ok(over500.wordCount > 500);
    assert.ok(over500.warnings.length > 0);
    assert.match(over500.warnings[0], /over 500 words/);
    assert.equal(over500.error, null);

    // For over 700 words
    const over700 = buildSystemPrompt({
      backstory: "word ".repeat(500),
      communicationNotes: "word ".repeat(300),
    });
    assert.ok(over700.wordCount > 700);
    assert.ok(over700.error);
    assert.match(over700.error, /exceeds hard limit of 700 words/);
  });
});
