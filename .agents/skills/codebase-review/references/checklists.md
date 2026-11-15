# Checklists & Quick Reference

## Anti-Pattern Grep Patterns

### Silent Failures
```bash
# Python
grep -rn "except:" --include="*.py" .
grep -rn "except.*:\s*$" --include="*.py" -A1 . | grep "pass"
# JavaScript/TypeScript
grep -rn "catch\s*(\s*)\s*{" --include="*.ts" --include="*.js" .
grep -rn "\.catch\(\(\)\s*=>" --include="*.ts" --include="*.js" .
grep -rn "\.catch\(e\s*=>\s*{})" --include="*.ts" --include="*.js" .
# Go
grep -rn "_, err :=" --include="*.go" . | grep -v "if err"
```

### Hardcoded Secrets
```bash
grep -rn "password\s*=\s*['\"]" --include="*.py" --include="*.ts" --include="*.js" .
grep -rn "api_key\s*=\s*['\"]" --include="*.py" --include="*.ts" --include="*.js" .
grep -rn "secret\s*=\s*['\"]" --include="*.py" --include="*.ts" --include="*.js" .
grep -rn "PRIVATE_KEY" --include="*.py" --include="*.ts" --include="*.js" --include="*.env" .
```

### Technical Debt & Dead Code
```bash
grep -rn "TODO\|FIXME\|HACK\|XXX\|WORKAROUND\|TEMP\|KLUDGE" .
grep -rn "# noqa\|# type: ignore\|# pylint: disable" --include="*.py" .
grep -rn "// @ts-ignore\|// @ts-expect-error\|// eslint-disable" --include="*.ts" --include="*.js" .
```

### Resource Leaks
```bash
# Python — open() without context manager
grep -rn "= open(" --include="*.py" . | grep -v "with "
# Node — unclosed streams
grep -rn "createReadStream\|createWriteStream\|createConnection" --include="*.ts" --include="*.js" .
```

---

## Static Analysis Tools

| Language | Linting | Types | Security | Deps |
|----------|---------|-------|----------|------|
| Python | `ruff check .` | `mypy .` | `bandit -r .` | `pip audit` |
| TypeScript | `eslint .` | `tsc --noEmit` | `semgrep` | `npm audit` |
| JavaScript | `eslint .` | — | `semgrep` | `npm audit` |
| Go | `go vet ./...` | built-in | `gosec ./...` | `govulncheck ./...` |
| Rust | `cargo clippy` | built-in | — | `cargo audit` |
| Java | `spotbugs` | built-in | `spotbugs` | `mvn dependency-check:check` |
| General | `semgrep --config auto .` | — | `trivy fs .` | — |

### Quick Install
```bash
# Python
pip install ruff mypy bandit pip-audit --break-system-packages
# Node
npm install -g eslint typescript
# General
pip install semgrep --break-system-packages
```

---

## Severity Definitions

**Critical:** Security vulnerabilities, data loss risks, silent failures, race conditions affecting data integrity.

**High/Warning:** Logic bugs, unhandled exceptions on common paths, missing input validation, broken error handling.

**Medium/Info:** Code smells, anti-patterns, poor error messages, missing logging.

**Low:** Style inconsistencies, minor inefficiencies, missing docs, unused imports.

---

## Module Health Checklist

- [ ] Single, clearly stated responsibility
- [ ] Standalone entry point (runs independently)
- [ ] Validates all inputs at entry
- [ ] Raises/throws on unexpected state
- [ ] Unit tests (happy path + edge cases + error cases)
- [ ] Integration tests with neighbours
- [ ] Only public interface exposed
- [ ] README with standalone usage
- [ ] Structured outputs (not raw strings)
- [ ] Logs actions at INFO, failures at ERROR

---

## Git Branch Assessment Template

| Branch | Purpose | Ahead/Behind | Conflicts? | Last Commit | Recommendation | Rationale |
|--------|---------|-------------|------------|-------------|----------------|-----------|
| ... | ... | +N / -N | Yes/No | YYYY-MM-DD | merge/rebase/delete | ... |

---

## End-to-End Test Matrix

| Test Case | Input | Expected | Actual | Pass? |
|-----------|-------|----------|--------|-------|
| Happy path | Valid, complete | Success | | |
| Empty input | Empty/null | Clear error | | |
| Malformed | Invalid format | Validation error | | |
| Oversized | Beyond limits | Graceful rejection | | |
| Missing service | Dep unavailable | Timeout + error | | |
| Partial failure | One stage fails | No corruption | | |
