# Final Report Template

Use this structure for the Phase 8 final report. Use the best available output tool (docx, pdf, or markdown).

```
# Codebase Review Report — [Project Name]
Date: [date]
Reviewer: Claude (codebase-review skill v3)

## 1. Executive Summary
[2-3 paragraphs: what was reviewed, key findings, overall health rating]
Health: Critical / Needs Work / Healthy / Excellent

## 2. Architecture
### Before [diagram + description]
### After [diagram + description]
### What changed and why

## 3. Issues Found
| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | X | X | 0 |
| Warning  | X | X | X |
| Info     | X | X | X |

### Critical Issues [each: description, location, fix, verification]
### Warning Issues [each: description, location, fix]
### Info Issues [summary table]

## 4. Documentation Accuracy
[X accurate / Y total checked. List of inaccuracies corrected.]

## 5. Branch Hygiene
[Branches cleaned: merged N, deleted N, pruned N remote refs]

## 6. Modularisation Evaluation
[Triple assessment results and decision]

## 7. Modules Created (if applicable)
[Per module: responsibility, interface, test coverage, standalone command]

## 8. Test Coverage
[Unit: count/pass. Integration: count/pass. E2E: matrix results. Gaps.]

## 9. Confidence Assessment
[Where the review is strong vs where gaps remain]

## 10. Remaining Technical Debt
[Itemised: what, why it was left, priority]

## 11. Recommended Next Steps
[Prioritised with effort estimates]
```

Keep it direct. Use file paths and line numbers. Quantify everything. Separate facts from recommendations.
