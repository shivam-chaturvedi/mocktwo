# Persona Seed Rules — `personas.seed.json`

This file documents the **exact rules** an agent must follow when adding or editing entries in `electron/seed/personas.seed.json`. Violations cause a validation error at startup and show an orange banner in the app.

---

## File Structure

```json
{
  "seedVersion": 1,
  "personas": [ /* PersonaItem[] */ ]
}
```

- `seedVersion` — integer, increment only when the schema itself changes (not when adding new personas).
- `personas` — array of `PersonaItem` objects. Must have at least 1 entry.

---

## PersonaItem Required Fields

| Field | Type | Rules |
|---|---|---|
| `builtinKey` | `string` | Unique across all personas. Use `snake_case`, prefix `starter_`. e.g. `"starter_jane_doe"` |
| `name` | `string` | Full name, 1–80 chars. No trailing spaces. |
| `title` | `string` | Job title, 1–120 chars. |
| `contextSetting` | `string` | 1–120 chars. e.g. `"Hotel Front Office Operations"` |
| `seniority` | `string` | One of: `"Entry Level"` \| `"Mid Level"` \| `"Senior"` \| `"Department Head"` \| `"Senior Executive"` \| `"Senior Educator"` |
| `language` | `string` | ISO 639-1 code. e.g. `"en"` |
| `pressureLevel` | `string` | ⚠️ **MUST be exactly one of:** `"Moderate"` \| `"High"` \| `"Intense"` — **NO other values allowed** (not `"Low"`, not `"Medium"`) |
| `temperamentTraits` | `string[]` | 1–8 short trait strings, each max 40 chars. e.g. `["Analytical", "Direct"]` |
| `voice` | `string` | Usually `"Default"` unless a specific Tavus voice ID is known |
| `backstory` | `string` | 100–2000 chars. Rich narrative paragraph. No bullet points. |
| `communicationNotes` | `string` | 100–2000 chars. How the persona conducts conversation. |
| `greeting` | `string` | 20–300 chars. Opening line the persona says. First-person. No quotation marks around the value. |
| `monogram` | `string` | 2 uppercase chars from name initials. e.g. `"EV"` for Elena Vance |
| `face` | `object` | See Face Object below |

---

## Face Object

```json
"face": {
  "preferredNames": ["Luna", "Scarlett"],
  "gender": "female",
  "tags": ["professional", "approachable"]
}
```

| Field | Type | Rules |
|---|---|---|
| `preferredNames` | `string[]` | 1–5 Tavus face display names to prefer when binding. Case-sensitive. |
| `gender` | `string` | `"female"` \| `"male"` \| `"neutral"` |
| `tags` | `string[]` | Optional. 0–10 descriptive tags for face selection. |

---

## Validation Rules (Enforced by Zod Schema)

1. **`pressureLevel`** must be `"Moderate"`, `"High"`, or `"Intense"`. Any other value (including `"Low"`, `"Medium"`, `"low"`) causes the error: `Invalid option: expected one of "Moderate"|"High"|"Intense"`.
2. **`builtinKey`** must be unique across all personas in the array. Duplicates cause a cross-reference error.
3. **`temperamentTraits`** must have between 1 and 8 items.
4. **`seniority`** must be one of the exact values listed — no freeform text.
5. All string fields are trimmed — do not rely on leading/trailing whitespace.

---

## Pressure Level Meanings

| Value | Behaviour |
|---|---|
| `"Moderate"` | Firm but fair. Eases off when good answers are given. High turn-taking patience. |
| `"High"` | Demanding and impatient. Interrupts weak or evasive answers. Medium patience. |
| `"Intense"` | Relentless and highly skeptical. Challenges every excuse. Low patience. |

> ⚠️ `"Low"` **does not exist** in the schema. If a persona is intended to be easy, use `"Moderate"`.

---

## Idempotency

- Personas are upserted via `ON CONFLICT(builtin_key) DO NOTHING`.
- Once seeded, a persona is **never overwritten** unless you delete `seed_state` from the database (Developer menu → Reset Database).
- Adding new personas to the JSON and restarting the app will seed them on first run only if `seed_state` allows it.

---

## Example Minimal Valid Persona

```json
{
  "builtinKey": "starter_jane_smith",
  "name": "Jane Smith",
  "title": "Front Desk Supervisor",
  "contextSetting": "Hotel Front Office",
  "seniority": "Mid Level",
  "language": "en",
  "pressureLevel": "Moderate",
  "temperamentTraits": ["Patient", "Organized"],
  "voice": "Default",
  "backstory": "Jane has five years of front desk experience...",
  "communicationNotes": "Jane leads with empathy and de-escalates calmly...",
  "greeting": "Welcome. How can I help you today?",
  "monogram": "JS",
  "face": {
    "preferredNames": ["Claire"],
    "gender": "female",
    "tags": ["professional"]
  }
}
```
