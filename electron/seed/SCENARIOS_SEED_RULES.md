# Scenario Seed Rules — `scenarios.seed.json`

This file documents the **exact rules** an agent must follow when adding or editing entries in `electron/seed/scenarios.seed.json`. Violations cause a validation error at startup and show an orange banner in the app.

---

## File Structure

```json
{
  "seedVersion": 1,
  "scenarios": [ /* ScenarioItem[] */ ]
}
```

- `seedVersion` — integer. Must match `seedVersion` in `personas.seed.json`.
- `scenarios` — array of `ScenarioItem` objects. Must have at least 1 entry.

---

## ScenarioItem Required Fields

| Field | Type | Rules |
|---|---|---|
| `builtinKey` | `string` | Unique across all scenarios. Use `snake_case`, prefix `starter_`. e.g. `"starter_guest_billing_dispute"` |
| `personaKey` | `string` | **Must match a `builtinKey` in `personas.seed.json`**. Cross-reference is validated at startup. |
| `title` | `string` | 1–120 chars. Human-readable scenario name. |
| `interactionType` | `string` | ⚠️ **MUST be exactly one of the values below** |
| `difficulty` | `string` | ⚠️ **MUST be exactly one of:** `"Foundational"` \| `"Intermediate"` \| `"Advanced"` |
| `context` | `string` | 100–3000 chars. Full situation brief read by the AI before the conversation. Third-person, scene-setting. |
| `learningObjectives` | `string[]` | 1–8 strings, each max 200 chars. What the learner practises. |
| `keyChallenges` | `string[]` | 1–8 strings, each max 200 chars. Obstacles the learner will face. |
| `openingLine` | `string` | 20–300 chars. The persona's very first spoken line in the simulation. First-person. |

---

## Valid `interactionType` Values

```
"Front Desk"
"Difficult Conversations"
"Hospitality"
"Sales & Pitches"
"Interviews"
"Presentations"
"Negotiation"
"Customer Service"
```

> ⚠️ Any other value (including `"Operations"`, `"HR"`, `"General"`) is invalid and will fail schema validation.

---

## Valid `difficulty` Values

| Value | Meaning |
|---|---|
| `"Foundational"` | Introductory. Straightforward situation. |
| `"Intermediate"` | Requires judgment. Some pushback expected. |
| `"Advanced"` | High stakes. Multiple competing demands. |

---

## Cross-Reference Rule (Critical)

**`personaKey` must exactly match a `builtinKey` in `personas.seed.json`.**

If you add a new scenario referencing a persona, the persona **must already exist** (or be added in the same commit) in `personas.seed.json`.

Example of a valid reference:
```json
// In personas.seed.json
{ "builtinKey": "starter_marcus_brooks", ... }

// In scenarios.seed.json
{ "personaKey": "starter_marcus_brooks", ... }  ✅
{ "personaKey": "starter_marcus_brook", ... }   ❌ (typo → validation error)
```

---

## Optional Fields

| Field | Type | Rules |
|---|---|---|
| `durationMinutes` | `number` | Optional. Estimated conversation length in minutes. |
| `recommendedPhrases` | `string[]` | Optional. 0–10 suggested phrases the learner might use. |
| `personaMood` | `string` | Optional. Free text describing the persona's emotional state at the start. |

---

## Validation Rules (Enforced by Zod Schema)

1. `builtinKey` must be unique across all scenarios.
2. `personaKey` must reference an existing persona `builtinKey`.
3. `interactionType` must be one of the 8 exact values listed above.
4. `difficulty` must be `"Foundational"`, `"Intermediate"`, or `"Advanced"`.
5. `learningObjectives` and `keyChallenges` must each have 1–8 items.
6. `context` must be at least 100 characters — be detailed.

---

## Idempotency

- Scenarios are upserted via `ON CONFLICT(builtin_key) DO NOTHING`.
- Once seeded, a scenario is **never overwritten** unless you use the Developer menu → Reset Database.
- New scenarios added to the JSON are picked up on the next first-run seeding cycle.

---

## Example Minimal Valid Scenario

```json
{
  "builtinKey": "starter_vip_complaint_resolution",
  "personaKey": "starter_marcus_brooks",
  "title": "Resolving a VIP Guest Complaint",
  "interactionType": "Front Desk",
  "difficulty": "Intermediate",
  "context": "A VIP guest has complained that their room was not ready on arrival despite a confirmed early check-in. You are the front desk supervisor. The guest is politely but firmly expressing dissatisfaction. Your task is to acknowledge the failure, offer a genuine apology, and find an immediate practical resolution without over-promising.",
  "learningObjectives": [
    "Acknowledge the failure without deflecting",
    "Offer a concrete immediate resolution",
    "Close the conversation with the guest feeling heard"
  ],
  "keyChallenges": [
    "Resisting the urge to blame housekeeping",
    "Offering realistic alternatives when suites are unavailable",
    "Maintaining warmth under pushback"
  ],
  "openingLine": "I confirmed early check-in three weeks ago. My room isn't ready. What exactly are you going to do about this?"
}
```
