FINAL PLAN v2: Scenario Builder + SQLite persistence (mocktwo)
STATUS: APPROVED. Overwrite PLAN-scenario-builder.md with this text at S0 and commit it. Branch feature/scenario-builder already exists. Execute S0 to S5. Stop at every CHECKPOINT and report in about 5 lines before continuing. If this plan contradicts the real code, STOP and report; do not improvise.

RULES
- Cite file:line for repo claims and the docs URL for Tavus claims in your reports. No live Tavus calls are needed in this task.
- Additive migrations only. Existing user data must survive. Back up with db.backup (WAL-safe), never with a plain file copy.
- Gates after every milestone: tsc -b, npx oxlint src, npm test (all existing tests must still pass; do not hard-code test counts).
- Do not change Quick Practice's own "Describe" tab or createAdHoc behavior.

0. CORRECTIONS TO THE DRAFT PLAN (these override it)
1. No new `situation` column. The existing `context` column already stores the situation narrative. The UI says "Situation"; it is stored in `context`.
2. `source` stays 'Mine' | 'Library' (existing filters depend on it). A builtin scenario = source 'Library' + builtin_key set. Do not introduce 'user'/'builtin'.
3. `duration_minutes` is NOT NULL with no default and SQLite cannot add one without a table rebuild. The worker always writes 3. Do NOT rebuild the table.
4. Stop writing personas.scenarios_count (the persona upsert near dbWorker.cjs:473 writes item.scenariosCount || 0 and would clobber it). Compute it on read with a subquery. No count triggers.
5. IPC payloads use the existing PracticeScenario camelCase names (interactionType, keyChallenges, learningObjectives, context, personaId, openingLine). Denormalized persona fields are derived from the persona row in the worker, never trusted from the renderer, and are propagated when the persona is edited.
6. Persona lookup and INSERT happen in ONE worker transaction.
7. Studio uses a NEW strict channel. The legacy create channel stays for other callers (Duplicate to Mine, Quick Practice).
8. buildScenarioContext must not crash on bad JSON, must enforce its word cap, and takes no unused persona parameter.
9. No fake "~3m" duration anywhere (see 6.7).
10. The 160-character opening line and 750-word context cap are OUR design limits, not Tavus limits. In the final report, record what openapi.yaml actually says (types, maxLength) for conversational_context and custom_greeting.

1. VERIFIED BASELINE (re-check cheaply at S0)
- DB: ~/Library/Application Support/mocktwo/mocktwo.db (app.getPath('userData')). WAL, foreign_keys=ON, synchronous=NORMAL. schema_migrations at v2 (v1 baseline, v2 Tavus columns + tavus_catalog_cache).
- Tables: schema_migrations, permissions, profiles, baselines, personas, scenarios, recordings, vitals_samples, recording_notes, settings, tavus_catalog_cache. personas and scenarios are empty today.
- scenarios today: id PK; title; persona_id FK personas(id) ON DELETE SET NULL; persona_name; context_setting; seniority; interaction_type; difficulty; duration_minutes NOT NULL; summary NOT NULL; context NOT NULL; persona_mood; learning_objectives (JSON, NOT NULL); key_challenges (JSON, NOT NULL); recommended_phrases (JSON, NOT NULL); persona_avatar_url; persona_summary; source; submission_status; created_at; updated_at. Indexes: idx_scenarios_persona, idx_scenarios_category.
- recordings.scenario_id and persona_id are FK ON DELETE SET NULL, and recordings keep a scenario_title copy, so hard-deleting a user scenario is safe.
- Bugs to fix: (a) Studio Step 1 shows an empty grid and Next is not disabled, so save crashes on an undefined persona (StudioSheet.tsx about 840-900 and 366-394); (b) there is no scenarios:update handler, and adapter updateScenario re-INSERTs and fails with a UNIQUE error (sqliteAdapters.ts about 184); (c) keyChallenges and recommendedPhrases are hardcoded in the save handler, and there is no opening line.

2. MIGRATION V3 (dbWorker.cjs, one transaction, record version 3)
Before running, when pending: db.backup() to userData/backups/mocktwo-v2-<timestamp>.db, keep the last 3.
ALTER TABLE scenarios ADD COLUMN opening_line TEXT;
ALTER TABLE scenarios ADD COLUMN builtin_key TEXT;
ALTER TABLE scenarios ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_scenarios_builtin_key ON scenarios(builtin_key) WHERE builtin_key IS NOT NULL;
CREATE INDEX idx_scenarios_hidden ON scenarios(hidden);
CREATE TRIGGER trg_personas_restrict_delete BEFORE DELETE ON personas
WHEN EXISTS (SELECT 1 FROM scenarios WHERE persona_id = OLD.id AND hidden = 0)
BEGIN SELECT RAISE(ABORT, 'RESTRICT_PERSONA_HAS_SCENARIOS'); END;
Rely on schema_migrations for idempotency (ALTER has no IF NOT EXISTS). Rollback = restore the backup. Legacy columns stay: duration_minutes (always 3), summary, recommended_phrases (always []), submission_status.

3. DATA CONTRACT (UI field -> stored)
- Selected persona -> persona_id (real FK).
- Scenario Title -> title (3 to 100 chars).
- Category -> interaction_type (enum from the real code).
- Difficulty -> difficulty (enum from the real code).
- Situation -> context (10 to 2000 chars, line breaks kept).
- Challenges -> key_challenges JSON (0 to 5 items, up to 200 chars each).
- Objectives -> learning_objectives JSON (1 to 5 items, up to 200 chars each).
- Opening line -> opening_line (up to 160 chars, optional). Later used as custom_greeting; precedence: scenario.opening_line, else persona.greeting, else none.
Derived by the worker: id = `sc-mine-${randomUUID()}`; source 'Mine'; duration_minutes 3; summary = first 140 chars of context cut at a word boundary; recommended_phrases '[]'; persona_name, context_setting, seniority, persona_avatar_url copied from the persona row; persona_mood = temperament traits joined with " & " (safe JSON parse); persona_summary = `${title}, ${context_setting}`; created_at/updated_at ISO; hidden 0.

4. BACKEND
4.1 Validators (main process; renderer validation is UX only)
- electron/validators/scenarioEnums.cjs: CATEGORIES and DIFFICULTIES copied from the real TS enums (src/types/index.ts about lines 11-27). If TS has only a type union, export a const array there and derive the type from it. Add a test that fails if the two lists differ.
- electron/validators/scenarioSchemas.cjs:
  const clean = s => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const oneLine = (max, min = 0) => z.preprocess(v => typeof v === "string" ? clean(v).replace(/\s+/g, " ").trim() : v, z.string().min(min).max(max));
  const multiLine = (max, min = 0) => z.preprocess(v => typeof v === "string" ? clean(v).replace(/\r\n/g, "\n").trim() : v, z.string().min(min).max(max));
  const list = (max, min) => z.preprocess(v => Array.isArray(v) ? v.map(x => typeof x === "string" ? clean(x).replace(/\s+/g, " ").trim() : x).filter(x => x !== "") : v, z.array(oneLine(200, 1)).min(min).max(max));
  ScenarioStudioSchema = z.object({ title: oneLine(100, 3), personaId: z.string().min(1).max(100), interactionType: z.enum(CATEGORIES), difficulty: z.enum(DIFFICULTIES), context: multiLine(2000, 10), keyChallenges: list(5, 0).default([]), learningObjectives: list(5, 1), openingLine: oneLine(160).nullable().optional() }).strict();
  ScenarioStudioUpdateSchema = ScenarioStudioSchema.partial().strict().
  Keep a lenient legacy schema for the old create channel, matching today's PracticeScenario shape.
4.2 Channels (main.cjs validates with zod, keeps isValidSender, returns scrubbed results; preload exposes them)
- storage:save-scenario (NEW, Studio): worker transaction = SELECT the persona (must exist and hidden=0, else {ok:false, code:'persona_not_found'}), derive section 3 fields, INSERT, return the mapped PracticeScenario.
- storage:update-scenario (NEW, fixes the UNIQUE bug): UPDATE ... WHERE id=?; re-derive persona copies if personaId changes; set updated_at.
- storage:create-scenario (legacy): unchanged behavior; make sure it still works with the new columns. Audit every caller first (Duplicate to Mine, Quick Practice createAdHoc, adapters, tests) and list them in the S0 report.
- storage:delete-scenario: user scenarios (source 'Mine') are hard-deleted in a transaction; builtin scenarios (source 'Library') get hidden=1.
- scenarios:list excludes hidden=1 by default. Update rowToScenario to include openingLine, builtinKey, hidden.
- Adapter (src/services/api/sqliteAdapters.ts): add saveStudioScenario; fix updateScenario to call update-scenario. Add the new optional fields to PracticeScenario in src/types/index.ts.
4.3 Persona side effects
- personas:list/get return scenarios_count = (SELECT COUNT(*) FROM scenarios WHERE persona_id = p.id AND hidden = 0). Stop writing the stored column.
- When a persona is updated, in the SAME transaction: UPDATE scenarios SET persona_name, context_setting, seniority, persona_avatar_url, persona_mood, persona_summary for that persona_id (do not bump scenarios.updated_at).
4.4 Persona delete
- The delete handler first checks for non-hidden scenarios. If any: return {ok:false, code:'has_scenarios', count, titles (up to 5)} and the UI shows "Delete these scenarios first: ...". The trigger is only a backstop for hard deletes. Verify whether the app soft-deletes personas (hidden); the pre-check must run either way.

5. buildScenarioContext (electron/tavus/scenarioContextBuilder.cjs; pure; input is the camelCase PracticeScenario; session-start code will call it later, not part of this task)
const MAX_WORDS = 750;
const asList = v => { try { const a = Array.isArray(v) ? v : JSON.parse(v || "[]"); return a.filter(x => typeof x === "string").map(x => x.trim()).filter(Boolean); } catch { return []; } };
const countWords = s => s.trim().split(/\s+/).filter(Boolean).length;
function buildScenarioContext(scenario) {
  const title = String(scenario?.title ?? "").trim() || "Untitled scenario";
  const challenges = asList(scenario?.keyChallenges).slice(0, 5);
  const objectives = asList(scenario?.learningObjectives).slice(0, 5);
  const header = [`# SCENARIO: ${title}`, `Category: ${scenario?.interactionType || "General"}`, `Difficulty: ${scenario?.difficulty || "Intermediate"}`].join("\n");
  const tail = [];
  if (challenges.length) tail.push(`## HOW YOU CHALLENGE THE USER\nRaise these naturally during the conversation:\n${challenges.map(c => `- ${c}`).join("\n")}`);
  if (objectives.length) tail.push(`## WHAT THE USER IS PRACTICING\n${objectives.map(o => `- ${o}`).join("\n")}\nTest these thoroughly. Do not concede until the user shows them clearly.`);
  const budget = Math.max(0, MAX_WORDS - countWords([header, ...tail].join("\n\n")) - 4);
  const sitWords = String(scenario?.context ?? "").trim().split(/\s+/).filter(Boolean);
  const truncated = sitWords.length > budget;
  const situation = (truncated ? sitWords.slice(0, budget) : sitWords).join(" ");
  const context = [header, situation ? `## SITUATION\n${situation}` : null, ...tail].filter(Boolean).join("\n\n");
  return { context, wordCount: countWords(context), truncated, greeting: scenario?.openingLine?.trim() || null };
}
Export it. Tests: all sections present; empty challenges; bad JSON; missing title; special characters; a 3,000-word situation stays at 750 words or fewer and sets truncated.

6. UI (src/components/common/StudioSheet.tsx and callers)
6.1 Tabs: "Scenario Builder" and "Persona Editor" only. Remove "Describe (AI)" completely: the tab button, the whole "Describe the Situation" block (textarea, template chips, Dictate, attach material, Generate Scenario), and the state promptText, attachedDoc, isGenerating, generationError, generatedDraft, isDictating, templates, plus handleGenerateScenario/generateDraft usage. Then delete orphaned code (service, IPC, types, tests) ONLY if grep proves nothing else uses it (Quick Practice must not break); otherwise leave it and report. openStudio becomes (initialTab?: "scenario" | "persona"), default "scenario"; fix every caller that passes "guest" (for example CommandPalette.tsx about line 50) and the "New scenario" entry points.
6.2 Stepper labels: Persona, Details, Context & Goals, Review. Buttons: "Back", "Next: Details →", "Next: Context & Goals →", "Next: Review →", and "Save" on the last step (never "Save to Mine").
6.3 Step 1 "Select Persona": two-column grid of personas (hidden ones excluded). Each card shows avatar or monogram, name, title, seniority, pressure level, and an informational sync chip (Draft/Ready/Failed). Unsynced personas can still be selected. Selected card has an accent border and a checkmark. Next is disabled (disabled + aria-disabled, opacity 0.45, not-allowed cursor) until manualPersonaId matches a real persona. With 0 personas show an empty state: "No personas yet" / "Every scenario needs a counterpart to practice against. Create your first persona to get started." and a button "Create Persona in Editor" that switches to the Persona Editor tab. Optional if under about 30 lines: after saving that persona, return to Scenario Builder with it preselected. Never read personas[0] without a guard.
6.4 Step 2 "Details": Scenario Title * (placeholder "E.g., Challenging Engineering Timeline Pushback", counter n / 100, Next disabled until 3 or more characters), Category, Difficulty (default Intermediate). Remove Duration and Situation Narrative from this step.
6.5 Step 3 "Context & Goals" (replaces "Key Objectives"; nothing pre-filled; delete the two default objectives):
  a) "What is the situation?" * Helper: "Describe what has happened and the mood when the conversation begins." Placeholder: "E.g., A long-term client received a renewal invoice with a surprise 20% surcharge. They are frustrated and have asked for an urgent call." Counter n / 2000, minimum 10.
  b) "How will the counterpart challenge you?" (optional, up to 5 items; "+ Add challenge"). Helper: "Objections, demands or traps they will press on." Placeholder: "E.g., Threatens to cancel the contract unless a credit is issued today."
  c) "What are you trying to achieve?" * (1 to 5 items; "+ Add objective"). Helper: "Concrete behaviors you want to practice in this conversation." Placeholder: "E.g., Acknowledge the error without making excuses." Four suggestion chips that ADD an item when clicked, disabled if already added or at 5: "Acknowledge the issue without being defensive", "Offer a concrete next step with a timeline", "Ask a clarifying question before proposing a solution", "Keep a steady pace and breathe before answering".
  d) "Counterpart's opening line" (optional, n / 160). Helper: "Spoken by the counterpart when the session starts. Keep it short." Placeholder: "E.g., I have emailed you twice. Can you explain this invoice?"
  Next: Review is disabled until the situation has 10 or more characters and at least one non-empty objective. Trim and drop empty list items before saving.
6.6 Step 4 "Review": summary card with persona (avatar, name, title, setting), category and difficulty pills, title, situation, challenges, objectives, and opening line, each block with an "Edit" link that jumps to the right step. "Save" shows "Saving scenario..." with a spinner and is protected by an isSaving mutex. On success: toast, close the Studio (existing behavior), and the scenario appears in Scenarios > Mine without a reload. On failure: inline error, keep the form data. Guard assignedPersona so it can never be undefined.
6.7 Duration cleanup: remove Duration from Studio state, validation and saving. Audit every other use (ScenariosScreen.tsx about 621, TodayScreen.tsx about 578, BriefingSheet.tsx about 808, and any session timer or LiveSimulation use). If a use is purely decorative (a "~3m" chip), remove it. If it drives behavior, keep it reading the constant 3 and list it in the report. Check that the Briefing/inspector views handle recommended_phrases = [] gracefully (hide the section).
6.8 Search the repo until these strings no longer appear in user-visible UI, tests or docs: "Manual Builder", "Describe (AI)", "Save to Mine", "Key Objectives".

7. FILE LIST
Create: electron/validators/scenarioEnums.cjs, electron/validators/scenarioSchemas.cjs, electron/tavus/scenarioContextBuilder.cjs, tests/scenarioStorage.test.ts, tests/scenarioSchemas.test.ts, tests/scenarioContextBuilder.test.ts.
Edit: electron/storage/dbWorker.cjs, electron/main.cjs, electron/preload.cjs, src/types/index.ts, src/services/api/sqliteAdapters.ts, src/context/AppContext.tsx, src/components/common/StudioSheet.tsx, src/components/common/CommandPalette.tsx, src/screens/ScenariosScreen.tsx, src/screens/TodayScreen.tsx, src/components/common/BriefingSheet.tsx (plus any other caller you find).
Do not touch: QuickPracticeModal.tsx behavior.

8. TESTS (node:test)
- Migration V3 on a V2-shaped fixture WITH rows, not only an empty database: no data loss, new columns exist, idempotent re-run, backup file created, builtin_key uniqueness, hidden defaults to 0.
- Save: row written with persona_id and every field, derived columns correct, duration 3, summary at a word boundary; a missing or hidden persona is rejected; double save creates two rows; unknown keys and bad enums are rejected; control characters are stripped and newlines kept in context.
- Update works (no UNIQUE error), re-derives persona copies, and sets updated_at.
- Persona edit propagates to its scenarios; scenarios_count is derived correctly, and a persona upsert cannot corrupt it.
- Persona delete with scenarios returns has_scenarios with titles; a hidden scenario does not block deletion; the trigger blocks a raw hard delete.
- Legacy create channel and Duplicate to Mine still work. Enum list equals the TS constants. Context builder cases from section 5. UI state logic tests where practical.

9. VERIFICATION
Gates: tsc -b, npx oxlint src, npm test, all green. Run the app and walk this click path (or state clearly that you could not): open Studio with 0 personas (2 tabs; empty state; Next disabled; the button switches to Persona Editor) -> create persona "Marcus Vance" (appears in Step 1) -> select it, Next -> Details (title required) -> Context & Goals (fill all four fields, use a chip, Next) -> Review (Edit link works) -> Save. Then confirm in SQLite: the scenarios row has persona_id, opening_line, context, key_challenges, learning_objectives; the persona's scenarios_count reads 1; the scenario appears in Scenarios > Mine immediately. Finally try deleting Marcus Vance and confirm the friendly has_scenarios message.

10. MILESTONES
S0 Baseline: re-verify section 1, audit all scenario create/update callers, overwrite the plan file, run gates.
S1 Migration V3 + backup + worker handlers + persona side effects + tests. CHECKPOINT.
S2 Validators + IPC + preload + adapter + types + tests. CHECKPOINT.
S3 buildScenarioContext + tests.
S4 Studio UI: remove Describe, renames, Steps 1 to 4, duration cleanup, callers. CHECKPOINT (screenshots or a click-path report).
S5 Final gates, string greps (6.8), click path, final report.

FINAL REPORT
Per-file diff summary; caller-audit results; what was removed vs kept (Describe code, duration uses); actual openapi.yaml findings for conversational_context and custom_greeting; test results; any deviations from this plan and why; and next steps (seed 5 builtin scenarios and 1 persona, start conversations with Tavus).
