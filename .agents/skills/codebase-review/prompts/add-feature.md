# Add Feature — Generic Prompt

Paste this prompt into Claude Code or Claude.ai, then append your feature description at the end.

---

```
You are working on this codebase as a senior engineer. You are about to add a new feature.
Before writing any code, follow this process exactly.

STEP 1 — UNDERSTAND THE CODEBASE FIRST
- Read CLAUDE.md, README, and any architecture docs
- Map the areas of code this feature will touch
- Identify existing patterns: how are similar features built in this project?
- Check the test framework and how tests are currently run
- Check git status: are you on the right branch? Is working tree clean?

STEP 2 — PLAN BEFORE CODING
Write a brief implementation plan covering:
- Which files will be created or modified
- What existing code will be affected (dependencies, imports, interfaces)
- What could break (side effects, regressions, breaking changes)
- How you will test it (unit, integration, manual verification)
- What security considerations apply (input validation, auth, data exposure)

Present the plan. Wait for my approval before writing any code.

STEP 3 — IMPLEMENT WITH DISCIPLINE
- Create a feature branch: feature/<feature-name>
- Follow the existing code style and patterns in this project — do not introduce
  new conventions unless explicitly agreed
- Validate all inputs at entry points
- Handle all errors explicitly — no silent failures, no bare except/empty catch
- No hardcoded secrets, API keys, or credentials
- No mock data, placeholder data, or TODO stubs in production code
- No console.log / print debugging left in production code
- Add appropriate logging (INFO for actions, ERROR for failures)

STEP 4 — SECURE BY DEFAULT
Before considering the feature complete, verify:
- All user inputs are validated and sanitised
- No new endpoints or routes are exposed without appropriate auth
- No sensitive data logged or exposed in error messages
- If web-facing: CORS, CSP, and cookie settings are appropriate
- If API: rate limiting is considered, response doesn't leak internal details
- No new dependencies with known vulnerabilities (run audit)
- Environment variables used for all configuration — nothing hardcoded

STEP 5 — TEST BEFORE COMMITTING
- Write unit tests covering: happy path, edge cases, error cases
- Run the FULL existing test suite — not just the new tests
- Verify no regressions: does everything that passed before still pass?
- If the feature has a UI: verify it renders correctly and handles empty/error states
- If the feature has an API: test with valid, invalid, empty, and oversized input
- Deliberately pass bad input to your new code — does it fail clearly?

STEP 6 — SELF-REVIEW (Triple Check)
Before presenting the work, review your own changes three times:

  Check 1 — Correctness: Does it do what was asked? Does it handle edge cases?
  Check 2 — Safety: Any silent failures? Any unvalidated input? Any leaked data?
  Check 3 — Cleanliness: Any dead code, stale comments, debug logs, or unused imports?

If any check fails, fix it before proceeding.

STEP 7 — COMMIT AND REPORT
- Commit with a clear message: [feature] verb: description
- Present a summary: what was added, what was changed, what was tested
- Flag anything that needs follow-up or that you're uncertain about

RULES THAT APPLY THROUGHOUT:
- Discover and use every available tool, skill, and MCP integration before
  doing things manually
- If you are uncertain about anything, stop and ask — do not guess
- One feature per branch. Do not bundle unrelated changes.
- Evidence over assertion: if you say "tests pass", show the output

---

THE FEATURE TO ADD:

```
