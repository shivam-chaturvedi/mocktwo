# codebase-review

A comprehensive codebase audit skill for **Claude Code** and **Claude.ai (Claude Desktop)**. One command to review code quality, documentation accuracy, branch hygiene, security, compliance, and architecture — with stack-specific checks that load automatically based on your project's tech stack.

## What It Does

| Mode | Command | What happens |
|------|---------|-------------|
| **Quick review** | `/codebase-review` | Code review + docs accuracy + branch hygiene |
| **Code only** | `/codebase-review --code` | Bugs, dead code, lint, security, style |
| **Docs only** | `/codebase-review --docs` | Cross-reference README/CLAUDE.md against actual code |
| **Branches only** | `/codebase-review --branches` | Stale/merged branch cleanup |
| **Full audit** | `/codebase-review --audit` | All of the above + modularisation evaluation + restructuring + hardening + final report |
| **With auto-fix** | `/codebase-review --code --fix` | Review + auto-fix safe issues (with confirmation) |
| **Recent changes** | `/codebase-review --code --depth 5` | Review only last 5 commits |

## Stack-Specific Intelligence

The skill auto-detects your tech stack and loads only the relevant checks:

| Stack | What It Checks |
|-------|---------------|
| **Python** | ruff, mypy, bandit, bare excepts, mutable defaults, async issues, deprecated patterns |
| **Node/JS/TS** | eslint, tsc, npm audit, empty catches, swallowed promises, bundle issues |
| **Web Frontend** | a11y, SSR hydration, XSS, env var exposure, performance, SEO |
| **REST/GraphQL API** | Input validation, auth coverage, CORS, rate limiting, N+1 queries, OpenAPI spec |
| **Docker/CI/CD** | Dockerfile security, pipeline pinning, deployment safety, secret management |
| **Database/ORM** | Migration hygiene, SQL injection, connection pools, N+1, missing indexes |
| **Auth/Security** | JWT management, OWASP top 10, secrets in repo, session security |
| **Compliance** | Cookie consent, GDPR, CSP headers, accessibility (WCAG), licence compatibility |
| **ServiceNow** | Update sets, GlideRecord patterns, ACLs, script includes, CMDB health |

## Installation

### Claude.ai (Claude Desktop)

1. Download `codebase-review.skill` from [Releases](../../releases)
2. Go to **Settings → Capabilities** → enable **Code execution and file creation**
3. Go to **Customize → Skills** → click **"+"** → **Upload a skill**
4. Upload the `.skill` file

### Claude Code (Global — all projects)

```bash
mkdir -p ~/.claude/skills
unzip codebase-review.skill -d ~/.claude/skills/
```

### Claude Code (Single project)

```bash
mkdir -p .claude/skills
unzip codebase-review.skill -d .claude/skills/
```

Verify: type `/` in Claude Code — you should see `codebase-review` listed.

## The Prompt

For use in Claude.ai where slash commands aren't available:

```
Review this codebase thoroughly using all available phases (0 through 8).

EXECUTION MODE: Semi-autonomous with two checkpoints.

RUN AUTONOMOUSLY through Phases 0 and 1:
- Phase 0: Map project structure, dependencies, architecture, git branches.
  Include a confidence baseline — score your understanding 1-5 per area.
- Phase 1: Detect tech stack and load relevant reference files.

>>> CHECKPOINT 1: Present findings. Wait for go-ahead.

Then RUN AUTONOMOUSLY through Phases 2-4:
- Phase 2: All static analysis, patterns, logic review, stack-specific checks.
  Every issue needs: file, line, code snippet, confidence level.
- Phase 3: Cross-reference docs against actual code.
- Phase 4: Branch hygiene.

Then run the MODULARISATION EVALUATION GATE (three rounds + scoring).

>>> CHECKPOINT 2: Present issue list + modularisation evaluation. Wait for go-ahead.

Then RUN AUTONOMOUSLY through Phases 5-8 (restructuring, implementation,
hardening, final report).

RULES: Discover and use all available tools. Evidence over assertion.
Fail-hard. No mock data. Skip and continue on errors.
```

## Key Features

- **Evidence-based reporting** — every issue includes file path, line number, code snippet, and confidence level (High/Medium/Low). No hallucinated bugs.
- **Confidence transparency** — self-assesses understanding and flags gaps.
- **Triple modularisation gate** — argues for, against, then scores before restructuring.
- **Error resilience** — skips failed steps, never crashes the entire review.
- **Auto-fix with confirmation** — safe fixes only, one at a time, with approval.
- **Works in both environments** — Claude.ai and Claude Code terminal.

## File Structure

```
codebase-review/
├── SKILL.md                          # Orchestrator (330 lines)
├── scripts/
│   └── detect-stack.sh               # Auto-detect tech stack
└── references/
    ├── checklists.md                  # Grep patterns, tool tables, severity definitions
    ├── deep-audit.md                  # Phases 5-8 (modularisation, implementation, hardening, report)
    ├── report-template.md             # Final report structure
    ├── stack-python.md                # Python-specific checks
    ├── stack-node.md                  # Node/JS/TS-specific checks
    ├── stack-web.md                   # Web frontend checks (React, Next, Vue, Angular)
    ├── stack-api.md                   # REST/GraphQL API checks
    ├── stack-infra.md                 # Docker, CI/CD, Terraform checks
    ├── stack-database.md              # Database, ORM, migration checks
    ├── stack-security.md              # Auth, secrets, OWASP checks
    ├── stack-servicenow.md            # ServiceNow-specific checks
    └── compliance.md                  # Cookie consent, GDPR, CSP, a11y, licensing
```

## Companion Prompts

This repo also includes generic prompts for:
- **[Adding features securely](prompts/add-feature.md)** — paste + describe the feature
- **[Fixing bugs safely](prompts/fix-bug.md)** — paste + describe the bug

## Licence

MIT

## Author

[Cesar GL](https://cesargl.com) | [GitHub](https://github.com/amragl)
