/**
 * validation.cjs
 *
 * Zod validation schemas for all Persona and Tavus IPC payloads in the main process.
 */

const { z } = require("zod");

const PersonaInputSchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer"),
  title: z.string().max(120).optional().default(""),
  contextSetting: z.string().max(120).optional().default(""),
  seniority: z.string().max(60).optional().default("Peer"),
  language: z.string().max(16).optional().default("en"),
  pressureLevel: z.enum(["Moderate", "High", "Intense"]).optional().default("Moderate"),
  temperamentTraits: z.array(z.string().max(40)).max(15).optional().default([]),
  voice: z.string().max(60).optional().default("Default"),
  backstory: z.string().max(1200).optional().default(""),
  communicationNotes: z.string().max(1000).optional().default(""),
  source: z.string().max(40).optional().default("Mine"),
  avatarUrl: z.string().max(2048).optional(),
  monogram: z.string().max(8).optional(),

  // Tavus fields
  tavusFaceId: z.string().max(100).optional(),
  tavusVoiceId: z.string().max(100).optional(),
  faceName: z.string().max(100).optional(),
  faceImagePath: z.string().max(256).optional(),
  greeting: z.string().max(160).optional().default(""),
  palSettings: z.record(z.any()).optional(),
  hidden: z.boolean().optional().default(false),
});

const PersonaUpdateSchema = z.object({
  id: z.string().min(1, "Persona ID is required").max(100),
  persona: PersonaInputSchema.partial(),
});

const DeletePersonaSchema = z.object({
  id: z.string().min(1, "Persona ID is required").max(100),
  options: z.object({
    deleteTavusPal: z.boolean().optional().default(false),
  }).optional().default({}),
});

module.exports = {
  PersonaInputSchema,
  PersonaUpdateSchema,
  DeletePersonaSchema,
};
