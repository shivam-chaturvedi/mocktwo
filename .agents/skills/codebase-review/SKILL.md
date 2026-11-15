---
name: codebase-review
description: Comprehensive codebase audit, bug hunting, modularisation, and refactoring agent. Use this skill whenever the user asks to review a codebase, audit code quality, find bugs, refactor code into modules, improve code architecture, check git branch hygiene, harden a system, or make a project more robust and maintainable. Also trigger when the user says things like "review my code", "check for bugs", "clean up this repo", "refactor this project", "audit this codebase", "make this more modular", "check my branches", "code health check", or any variation of wanting a thorough, systematic assessment of an existing codebase. This skill works in both Claude Code (terminal) and Claude Code in Claude Desktop — it adapts its tool discovery to whichever environment it runs in.
---

# Codebase Review & Refactoring Agent v3

A senior agentic engineer conducting a full codebase audit. Goal: battle-tested, modular, independently-runnable system with zero silent failures.

## Arguments: $ARGUMENTS

Scan `$ARGUMENTS` for flags:
- `--code` — code review only
- `--docs` — documentation/knowledge base accuracy only
- `--branches` — branch hygiene only
- `--full` — scan entire codebase (not just changed files)
- `--changed` — review only files changed since last tag (default for `--code`)
- `--depth <n>` — review last N commits (default: changes since last tag or 10 commits)
- `--fix` — auto-apply safe fixes (with confirmation before each)
- `--audit` — full deep audit with modularisation evaluation and restructuring (Phases 0–6)

If no flags are passed, run `--code --docs --branches` (all three lightweight checks).
If `--audit` is passed, run the full 7-phase pipeline regardless of other flags.

---

## BEFORE YOU START — Tool & Skill Discovery

Discover your environment before writing a single line of analysis:

1. **Skills**: Check `<available_skills>` in context. If `docx`, `pdf`, `xlsx` etc. are listed, you are in Claude Desktop. Read any relevant skill before using it.
2. **MCP tools**: Run `tool_search` (if available) for "github", "drive", "slack", "jira". In Claude Code, check MCP server config. Use whatever is connected.
3. **CLI tools**: Verify what is installed (`which ruff eslint mypy bandit tsc 2>/dev/null`). Install what you need as you go.
4. **Subagents**: In Claude Code terminal, spawn subagents for parallel work. In Claude Desktop, work sequentially.

Principle: **discover first, then leverage.** Never assume you lack a tool without checking.

## ERROR RESILIENCE

If any step encounters an error (not a git repo, tool missing, permission denied), **skip that section, note the error in the output, and continue.** Never fail the entire review because one step had an error.

---

## PHASE 0 — RECONNAISSANCE

Do this first. Change nothing. Understand everything.

### 0.1 — Scope Detection

Determine what to review:
- If `--full` or `--audit`: scan the entire codebase
- If `--depth <n>`: changed files from last N commits
- If `--changed` or default `--code`: files from `git diff HEAD` and commits since last tag. If no changes found, fall back to last 10 commits.
- If `--audit`: always full scan regardless of other flags

### 0.2 — Environment & Dependency Mapping

- Map directory tree (`find . -type f | head -300` or `view` on project root)
- Identify language(s), framework(s), package manager(s)
- Read README, CLAUDE.md, MEMORY.md, Makefile, docker-compose.yml, config files
- List dependencies and their versions
- Identify test framework and how tests are run
- Note deployment method (Docker, serverless, CI/CD)

### 0.3 — Architecture Map (--audit only)

- Document system architecture: entry points, data flow, external integrations
- Identify tightly coupled vs loosely coupled components
- Flag circular dependencies
- Map test coverage
- Produce architecture diagram (use `show_widget` or Mermaid if available)

### 0.4 — Confidence Baseline

Self-assess understanding before proceeding:

| Area | Confidence (1-5) | Gaps |
|------|-------------------|------|
| Project purpose | ? | What is unclear? |
| Architecture | ? | What couldn't you trace? |
| Entry points | ? | Any ambiguous? |
| Data flow | ? | Any black boxes? |
| Test coverage | ? | Could you determine it? |

Score below 3 = investigate further or flag as risk. Include in deliverable.

### PHASE 0 DELIVERABLE

Present: project map, dependency list, confidence baseline, risk assessment. For `--audit`: add architecture diagram and branch status. **Wait for confirmation before proceeding.**

---

## PHASE 1 — TECH STACK ANALYSIS

Detect the tech stack and load the relevant reference files. This turns a generic review into one tailored to the project.

### 1.1 — Detect and Load

Based on detected stack, read ONLY the relevant reference files from `references/`:

| Detected | Load reference file |
|----------|-------------------|
| Python | `references/stack-python.md` |
| Node / JS / TS | `references/stack-node.md` |
| Web frontend (React, Next, Vue, Angular) | `references/stack-web.md` |
| REST or GraphQL API | `references/stack-api.md` |
| Docker, CI/CD, Terraform | `references/stack-infra.md` |
| Database / ORM | `references/stack-database.md` |
| Auth system (JWT, OAuth, sessions) | `references/stack-security.md` |
| ServiceNow | `references/stack-servicenow.md` |
| Web-facing app (any) | `references/compliance.md` |

Load multiple files if multiple stacks detected. Do NOT load files for stacks not present.

### 1.2 — Triple-Verify Selection

After loading, verify your selection:
1. Re-read package manager files and framework configs
2. Confirm each loaded reference is genuinely relevant
3. Check for missed stacks (Dockerfile present but infra not loaded? Auth present but security not loaded?)

If any discrepancy, load the missing reference and note the correction.

### 1.3 — Check Project-Specific Standards

- `.editorconfig`, `.prettierrc`, `.eslintrc`, `ruff.toml` — consistent with actual code?
- `CONTRIBUTING.md`, `CLAUDE.md`, `AGENTS.md` — exist? Accurate?
- Pre-commit hooks (`.pre-commit-config.yaml`, `.husky/`) — set up and running?

### PHASE 1 DELIVERABLE

Stack inventory, extended check list, tools to run in Phase 2, identified gaps.

---

## PHASE 2 — BUG HUNT & ISSUE CATALOGUE (`--code` or `--audit`)

Run all standard checks PLUS every stack-specific check from loaded reference files.

### 2.1 — Static Analysis

Run available linters and type checkers. See `references/checklists.md` for tool table and installation commands.

### 2.2 — Pattern-Based Bug Hunting

For each file in scope, check for:

**Bugs & correctness:** Logic errors, off-by-one, null/undefined access, missing error handling, swallowed exceptions, race conditions, async issues, OWASP top 10.

**Stale & dead code:** Unused imports/variables/functions, commented-out code, stale TODO/FIXME/HACK/XXX, unreachable code paths.

**Code quality:** Functions too long or doing too much, duplicated logic, inconsistent naming/style, missing type annotations, hardcoded values that should be config.

**Dependencies:** Unused deps in package.json/requirements.txt/pyproject.toml, known deprecation warnings, known vulnerabilities (`npm audit`, `pip audit`, `trivy`).

See `references/checklists.md` for grep patterns.

### 2.3 — Evidence-Based Reporting

Every issue MUST include:
- **File path and line number(s)**
- **Code snippet** — the actual code
- **Why it's a problem** — concrete, not generic
- **Suggested fix** — specific
- **Confidence** — High (tool confirmed) / Medium (pattern + logic) / Low (suspicion)

Issues without evidence: flag as "Suspected — needs verification".

### 2.4 — Auto-Fix (`--fix` flag)

If `--fix` is passed, for each auto-fixable issue (unused imports, dead variables, stale TODOs):
1. Show the proposed fix
2. Ask for confirmation before applying
3. Apply the fix

**Never auto-fix:** logic changes, security issues, or anything that changes behaviour.

### PHASE 2 DELIVERABLE

```
## Code Review — [scope description]

### Critical (fix now)
- [file:line] description [confidence: High/Medium/Low]

### Warning (should fix)
- [file:line] description [confidence: High/Medium/Low]

### Info (consider fixing)
- [file:line] description [confidence: High/Medium/Low]

### Clean
Files with no issues: [count]
```

---

## PHASE 3 — DOCUMENTATION ACCURACY (`--docs` or `--audit`)

Cross-reference project documentation against actual codebase.

### 3.1 — What to Check

Read CLAUDE.md, MEMORY.md, README.md, and any architecture docs. For each claim, verify:

- **File paths mentioned** — do they still exist?
- **Tech stack versions** — do they match package.json / pyproject.toml / Dockerfile?
- **API routes listed** — do they match actual route definitions?
- **Commands/scripts mentioned** — do they still work?
- **Config details** (ports, env vars, DB names) — are they current?
- **Architecture descriptions** — do they reflect the actual code?

### 3.2 — Completeness

- Major files/modules not mentioned that should be?
- New patterns or conventions that emerged since docs were written?
- Recent features or changes not reflected?

### 3.3 — Auto-Fix (`--fix` flag)

For each inaccuracy: show current vs actual, propose correction, ask confirmation, apply.

### PHASE 3 DELIVERABLE

```
## Documentation Review

### Inaccurate (needs update)
- [file] description — expected: X, actual: Y

### Outdated (may need update)
- [file] description

### Missing (consider adding)
- description

### Status: [X accurate / Y total entries checked]
```

---

## PHASE 4 — BRANCH HYGIENE (`--branches` or `--audit`)

### 4.1 — Classification

```bash
git fetch --prune origin 2>/dev/null
git branch -a
```

Classify every branch:
- **Merged**: `git branch --merged main` (or master) — safe to delete
- **Stale**: no commits in last 30 days
- **Orphaned remote-tracking**: `git remote prune origin --dry-run`
- **Active**: recent commits, not merged

For each non-merged branch: purpose, ahead/behind main, merge conflicts, recommendation (merge/rebase/delete) with rationale.

### 4.2 — Auto-Fix (`--fix` flag)

For merged branches: list and ask confirmation, delete with `git branch -d` (safe delete only).
For prunable remote refs: `git remote prune origin` after confirmation.
**Never auto-delete:** unmerged branches or current branch.

### PHASE 4 DELIVERABLE

```
## Branch Hygiene

### Merged (safe to delete)
- branch-name (merged N days ago)

### Stale (no activity >30 days)
- branch-name (last commit: YYYY-MM-DD, behind main by N commits)

### Active
- branch-name (last commit: YYYY-MM-DD)
```

---

## PHASES 5–8: DEEP AUDIT (`--audit` only)

These phases only run when `--audit` is explicitly passed. They are the heavy-duty restructuring pipeline. Read `references/deep-audit.md` for full instructions covering:

- **Phase 5 — Modularisation Evaluation Gate**: Triple assessment (argue for, argue against, score 1-5 on five criteria). Under 15 = recommend, 15-20 = optional, over 20 = skip.
- **Phase 6 — Implementation**: One module per commit, test before moving on, self-verification checklist, fail-hard architecture.
- **Phase 7 — Integration & Hardening**: End-to-end testing, failure simulation, performance check, regression verification.
- **Phase 8 — Final Report**: Professional document using best available output tool (docx/pdf/md). Architecture before vs after, bugs found, modules created, test coverage, remaining debt, next steps.

---

## SUMMARY (always produced)

After all checks complete:

```
## Review Summary

| Area         | Critical | Warning | Info | Auto-fixed |
|--------------|----------|---------|------|------------|
| Code         | X        | X       | X    | X          |
| Documentation| X        | X       | X    | X          |
| Branches     | X        | X       | X    | X          |

Confidence: [overall 1-5 with gaps noted]
[Auto-fixed N issues] (if --fix was used)
```

---

## OPERATING PRINCIPLES

- **No mock data** in production code. Tests use fixtures.
- **Fail hard, fail loud.** Silent failures are Critical bugs.
- **Evidence over assertion.** Every bug claim needs file path, line, and code snippet.
- **Confidence transparency.** Flag uncertain findings as Low confidence.
- **Discover tools first.** Check for skills, MCP, CLI tools before doing things manually.
- **Skip and continue.** If a step fails, note it and move on.
- **Ask, don't assume.** If intent is ambiguous, clarify before implementing.

---

## ADAPTIVE BEHAVIOUR

**Claude Code (Terminal):** Full shell access, subagents for parallel work, `git worktrees`, MCP servers, direct filesystem.

**Claude Desktop (claude.ai):** `bash_tool`, `view`, `str_replace`, `tool_search`, `show_widget`, `present_files`, `<available_skills>`.

**Scaling:** Small (<20 files) = combine phases. Medium (20-100) = full flow, focus on hot paths. Large (100+) = prioritise by risk, suggest multiple sessions.
