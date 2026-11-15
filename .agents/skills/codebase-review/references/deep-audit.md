# Deep Audit — Phases 5–8

This file is loaded only when `--audit` is passed. It covers modularisation evaluation, implementation, hardening, and final reporting.

---

## Phase 5 — Modularisation Evaluation Gate

Before restructuring, run a triple assessment.

### Round 1 — Case FOR Modularisation
Actively look for reasons to restructure: tight coupling, god files (>500 lines), duplicated logic, untestable components, shared mutable state, modules that can't run independently, circular dependencies.

### Round 2 — Case AGAINST Modularisation
Actively look for reasons to leave as-is: codebase is small enough that restructuring adds complexity, code is already modular, cost outweighs benefit, no clear boundaries, project is a prototype.

### Round 3 — Tiebreaker Scoring

| Criterion | Score (1-5) | Evidence |
|-----------|-------------|----------|
| Coupling (1=spaghetti, 5=decoupled) | ? | |
| Testability (1=impossible, 5=testable) | ? | |
| Single Responsibility (1=god objects, 5=clean) | ? | |
| Independent Runnability (1=monolith, 5=independent) | ? | |
| Scale Readiness (1=breaks at 2x, 5=ready) | ? | |
| **Total** | ? | |

- Under 15 → RECOMMEND modularisation
- 15–20 → OPTIONAL — present trade-offs, user decides
- Over 20 → SKIP to Phase 6 (fixes only)

Present all three rounds. User makes the final call.

---

## Phase 6 — Implementation

### Execution Rules
1. **One module per commit.** Never change multiple modules in one commit.
2. **Test before moving on.** Each module passes its own tests first.
3. **Fail-hard architecture:** Validate inputs, raise on unexpected state, log INFO/ERROR, return structured results.
4. **Git discipline:** Feature branch per module (`refactor/module-name`), clear commit messages (`[module-name] verb: description`).

### Module Structure Template
```
module_name/
├── __init__.py (or index.ts)
├── main.py              # Standalone entry point
├── core.py              # Business logic
├── models.py            # Data models / types
├── config.py            # Module config
├── exceptions.py        # Custom exceptions
├── tests/
│   ├── test_core.py
│   ├── test_integration.py
│   └── fixtures/
└── README.md
```

### Per-Module Loop
1. Create skeleton → 2. Migrate code → 3. Write unit tests → 4. Run tests until green → 5. Write integration tests → 6. Run full suite → 7. Self-verify → 8. Commit → 9. Next module

### Self-Verification Checklist
- [ ] Tests pass (unit + integration)
- [ ] No regressions in full suite
- [ ] Module runs independently
- [ ] Bad input fails clearly
- [ ] No hardcoded config values
- [ ] Commit message follows convention

Fix any failure before proceeding. Never accumulate debt across modules.

---

## Phase 7 — Integration & Hardening

### 7.1 — End-to-End Test
Run full pipeline. Test with: valid input, empty input, malformed input, oversized input, missing services. Verify data integrity at every module boundary.

### 7.2 — Error Recovery
Simulate failures: network down, file missing, invalid data at boundary, service timeout. Verify: clear errors, no state corruption, graceful degradation.

### 7.3 — Performance Check
Identify: N+1 queries, unbounded loops, memory leaks, resources held too long, unnecessary blocking operations.

### 7.4 — Regression Verification
Run full test suite one final time. Compare against baseline: any tests that passed before but fail now? Any new warnings? Same output for same input?

---

## Phase 8 — Documentation & Final Report

### 8.1 — Update Documentation
- Root README: what, install, run, test
- Per-module README: standalone usage
- Update/create CLAUDE.md with conventions
- Inline comments where logic is non-obvious

### 8.2 — Generate Report
Use best available output:
- `docx` skill → Word document
- `pdf` skill → PDF
- `show_widget` → architecture diagrams
- GitHub MCP → create issues for remaining debt
- Slack MCP → post summary (with permission)
- Otherwise → Markdown file

### 8.3 — Report Contents
- Executive summary with overall health rating
- Architecture before vs after
- Bugs found and fixed (severity + evidence)
- Modularisation evaluation (triple assessment results)
- Modules created (responsibilities, interfaces)
- Test coverage summary
- Confidence assessment (strong areas vs gaps)
- Remaining technical debt (what was left and why)
- Recommended next steps (prioritised with effort estimates)
