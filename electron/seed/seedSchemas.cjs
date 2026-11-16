/**
 * seedSchemas.cjs
 *
 * Strict Zod validation schemas for personas.seed.json and scenarios.seed.json.
 * Validates unique keys, cross-file references, string bounds, and enum invariants.
 */

const { z } = require("zod");
const { CATEGORIES, DIFFICULTIES } = require("../validators/scenarioEnums.cjs");

const slugRegex = /^[a-z0-9_-]{3,100}$/;

const SeedPersonaItemSchema = z.object({
  builtinKey: z.string().regex(slugRegex, "builtinKey must be 3-100 lowercase alphanumeric chars with hyphens/underscores"),
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be <= 80 characters"),
  title: z.string().max(120).default(""),
  contextSetting: z.string().max(120).default(""),
  seniority: z.string().max(60).default("Peer"),
  language: z.string().max(16).default("en"),
  pressureLevel: z.enum(["Moderate", "High", "Intense"]).default("Moderate"),
  temperamentTraits: z.array(z.string().max(40)).max(15).default([]),
  voice: z.string().max(60).default("Default"),
  backstory: z.string().max(1200).default(""),
  communicationNotes: z.string().max(1000).default(""),
  greeting: z.string().max(160).default(""),
  monogram: z.string().max(8).optional(),
  face: z
    .object({
      preferredNames: z.array(z.string().trim().min(1)).optional().default([]),
      gender: z.enum(["female", "male", "non-binary", "any"]).optional(),
    })
    .optional()
    .default({ preferredNames: [] }),
});

const SeedPersonasFileSchema = z
  .object({
    seedVersion: z.number().int().min(1),
    personas: z.array(SeedPersonaItemSchema).min(1, "At least one persona must be defined"),
  })
  .refine(
    (data) => {
      const keys = new Set();
      for (const p of data.personas) {
        if (keys.has(p.builtinKey)) return false;
        keys.add(p.builtinKey);
      }
      return true;
    },
    { message: "Duplicate builtinKey found in personas seed file", path: ["personas"] }
  );

const SeedScenarioItemSchema = z.object({
  builtinKey: z.string().regex(slugRegex, "builtinKey must be 3-100 lowercase alphanumeric chars with hyphens/underscores"),
  personaKey: z.string().regex(slugRegex, "personaKey must reference a valid persona builtinKey"),
  title: z.string().trim().min(3, "Title must be >= 3 characters").max(100, "Title must be <= 100 characters"),
  interactionType: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  context: z.string().trim().min(10, "Situation context must be >= 10 characters").max(2000, "Context must be <= 2000 characters"),
  learningObjectives: z.array(z.string().trim().min(1).max(200)).min(1, "At least 1 learning objective required").max(5),
  keyChallenges: z.array(z.string().trim().min(1).max(200)).max(5).default([]),
  openingLine: z.string().trim().max(160).nullable().optional(),
});

const SeedScenariosFileSchema = z
  .object({
    seedVersion: z.number().int().min(1),
    scenarios: z.array(SeedScenarioItemSchema).min(1, "At least one scenario must be defined"),
  })
  .refine(
    (data) => {
      const keys = new Set();
      for (const s of data.scenarios) {
        if (keys.has(s.builtinKey)) return false;
        keys.add(s.builtinKey);
      }
      return true;
    },
    { message: "Duplicate builtinKey found in scenarios seed file", path: ["scenarios"] }
  );

function validateSeedCrossReferences(personasFile, scenariosFile) {
  const personaKeys = new Set(personasFile.personas.map((p) => p.builtinKey));
  const errors = [];
  for (const s of scenariosFile.scenarios) {
    if (!personaKeys.has(s.personaKey)) {
      errors.push(`Scenario '${s.builtinKey}' references unknown personaKey '${s.personaKey}'`);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateSeedFiles(personasContent, scenariosContent) {
  const personasParsed = SeedPersonasFileSchema.safeParse(personasContent);
  if (!personasParsed.success) {
    return {
      valid: false,
      error: `Invalid personas seed: ${personasParsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const scenariosParsed = SeedScenariosFileSchema.safeParse(scenariosContent);
  if (!scenariosParsed.success) {
    return {
      valid: false,
      error: `Invalid scenarios seed: ${scenariosParsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const xref = validateSeedCrossReferences(personasParsed.data, scenariosParsed.data);
  if (!xref.valid) {
    return {
      valid: false,
      error: `Cross-reference errors: ${xref.errors.join("; ")}`,
    };
  }

  return {
    valid: true,
    personas: personasParsed.data.personas,
    scenarios: scenariosParsed.data.scenarios,
    seedVersion: Math.max(personasParsed.data.seedVersion, scenariosParsed.data.seedVersion),
  };
}

module.exports = {
  SeedPersonaItemSchema,
  SeedPersonasFileSchema,
  SeedScenarioItemSchema,
  SeedScenariosFileSchema,
  validateSeedCrossReferences,
  validateSeedFiles,
};
