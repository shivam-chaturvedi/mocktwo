# Fix Bug — Generic Prompt

Paste this prompt into Claude Code or Claude.ai, then append your bug description at the end.

---

```
You are working on this codebase as a senior engineer. A bug has been reported.
Before changing any code, follow this process exactly.

STEP 1 — UNDERSTAND BEFORE TOUCHING
- Read CLAUDE.md, README, and any architecture docs
- Check git status: are you on the right branch? Is working tree clean?
- Identify the area of code where the bug is likely to live
- Read the relevant code thoroughly — understand what it's supposed to do
  before deciding what's wrong

STEP 2 — REPRODUCE THE BUG
- Reproduce the bug with a concrete test case or execution path
- If you cannot reproduce it, say so — do not guess at a fix for a bug
  you haven't confirmed exists
- Document the reproduction steps: input, expected output, actual output
- Identify the root cause, not just the symptom
- Check: is this a single bug or a pattern? Search for the same mistake
  elsewhere in the codebase using grep/search

Present your findings: reproduction steps, root cause, and which files
are affected. Wait for my confirmation before writing any fix.

STEP 3 — ASSESS BLAST RADIUS
Before writing the fix, determine:
- What other code depends on the broken code? (callers, importers, consumers)
- Could the fix change behaviour that other parts of the system rely on?
- Are there other places in the codebase with the same bug pattern?
- Is this bug also present in other branches?

If the blast radius is larger than expected, flag it and wait for guidance.

STEP 4 — FIX WITH DISCIPLINE
- Create a fix branch: fix/<bug-description>
- Fix the root cause, not the symptom
- Fix ONLY the bug — do not refactor, improve, or clean up unrelated code
  in the same change. Scope discipline prevents hidden regressions.
- Follow the existing code style and patterns in this project
- Handle the error case explicitly — if the bug was a missing validation,
  add the validation. If it was a silent failure, make it loud.
- If the same bug pattern exists elsewhere, fix all instances and note
  each one in your commit message

STEP 5 — PROVE THE FIX
- Write a test that fails WITHOUT the fix and passes WITH the fix
  (this is the single most important step — it proves the bug is dead
  and prevents it from returning)
- Run the FULL existing test suite — not just the new test
- Verify no regressions: does everything that passed before still pass?
- Re-run the original reproduction steps — is the bug gone?
- Test adjacent functionality: does the fix break anything nearby?
- Deliberately try to trigger the bug again with variations of the
  original input — is it truly fixed or just masked?

STEP 6 — SELF-REVIEW (Triple Check)
Before presenting the work, review your own changes three times:

  Check 1 — Root cause addressed? Is this fixing the actual problem or
  just patching the symptom? Will this bug come back in a different form?

  Check 2 — No collateral damage? Are all existing tests still passing?
  Did the fix change any public interface, return type, or behaviour that
  other code depends on?

  Check 3 — Minimal and clean? Is the diff as small as possible? No
  unrelated changes, no dead code, no debug logs, no commented-out code?

If any check fails, fix it before proceeding.

STEP 7 — COMMIT AND REPORT
- Commit with a clear message: [fix] area: description of what was wrong and why
- Present a summary covering:
  - What the bug was (root cause, not just symptom)
  - How it was reproduced
  - What the fix does
  - What tests were added to prevent regression
  - Whether the same pattern was found and fixed elsewhere
  - Any remaining concerns or follow-up needed

RULES THAT APPLY THROUGHOUT:
- Discover and use every available tool, skill, and MCP integration before
  doing things manually
- If you cannot reproduce the bug, do not guess at a fix — ask for more
  information
- Never fix a bug you haven't confirmed exists
- One bug per branch. Do not bundle unrelated fixes.
- Evidence over assertion: if you say "tests pass", show the output
- If the investigation reveals the bug is actually a design flaw requiring
  a larger change, stop and report this rather than implementing a workaround

---

THE BUG:

```
