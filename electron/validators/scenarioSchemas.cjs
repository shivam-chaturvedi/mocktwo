const { z } = require("zod");
const { CATEGORIES, DIFFICULTIES } = require("./scenarioEnums.cjs");

const clean = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

const oneLine = (max, min = 0) =>
  z.preprocess(
    (v) => (typeof v === "string" ? clean(v).replace(/\s+/g, " ").trim() : v),
    z.string().min(min).max(max)
  );

const multiLine = (max, min = 0) =>
  z.preprocess(
    (v) => (typeof v === "string" ? clean(v).replace(/\r\n/g, "\n").trim() : v),
    z.string().min(min).max(max)
  );

const list = (max, min) =>
  z.preprocess(
    (v) =>
      Array.isArray(v)
        ? v.map((x) => (typeof x === "string" ? clean(x).replace(/\s+/g, " ").trim() : x)).filter((x) => x !== "")
        : v,
    z.array(oneLine(200, 1)).min(min).max(max)
  );

const ScenarioStudioSchema = z
  .object({
    id: z.string().optional(),
    title: oneLine(100, 3),
    personaId: z.string().min(1).max(100),
    interactionType: z.enum(CATEGORIES),
    difficulty: z.enum(DIFFICULTIES),
    context: multiLine(2000, 10),
    keyChallenges: list(5, 0).default([]),
    learningObjectives: list(5, 1),
    openingLine: oneLine(160).nullable().optional(),
  })
  .strict();

const ScenarioStudioUpdateSchema = z
  .object({
    id: z.string().min(1),
    title: oneLine(100, 3).optional(),
    personaId: z.string().min(1).max(100).optional(),
    interactionType: z.enum(CATEGORIES).optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    context: multiLine(2000, 10).optional(),
    keyChallenges: list(5, 0).optional(),
    learningObjectives: list(5, 1).optional(),
    openingLine: oneLine(160).nullable().optional(),
  })
  .strict();

const ScenarioLegacyCreateSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    personaName: z.string().optional(),
    personaId: z.string().optional(),
    contextSetting: z.string().optional(),
    seniority: z.string().optional(),
    interactionType: z.string().optional(),
    difficulty: z.string().optional(),
    durationMinutes: z.number().optional(),
    summary: z.string().optional(),
    context: z.string().optional(),
    personaMood: z.string().optional(),
    learningObjectives: z.array(z.string()).optional(),
    keyChallenges: z.array(z.string()).optional(),
    recommendedPhrases: z.array(z.string()).optional(),
    personaAvatarUrl: z.string().optional(),
    personaSummary: z.string().optional(),
    openingLine: z.string().nullable().optional(),
    builtinKey: z.string().nullable().optional(),
    source: z.string().optional(),
    submissionStatus: z.string().optional(),
    hidden: z.boolean().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

module.exports = {
  ScenarioStudioSchema,
  ScenarioStudioUpdateSchema,
  ScenarioLegacyCreateSchema,
  clean,
  oneLine,
  multiLine,
  list,
};
