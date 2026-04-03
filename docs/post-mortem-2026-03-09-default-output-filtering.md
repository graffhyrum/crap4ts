# Post-Mortem: Default Output Filtering Refactor

**Date**: 2026-03-09
**Status**: Completed

## Executive Summary

Refactored crap4ts default CLI output to show only actionable problems (crappy functions) instead of all functions. Added `--all` flag for full output, deprecated `--only-crappy` (now the default). The session used plan-stress-test (5 iterations to convergence) before implementation, followed by simplify-review. 91 tests pass, 0 type errors. 8 files modified.

## Bead Outcomes

- Closed: none
- Opened: none
- Modified: none

## What Went Well

1. **Plan stress-test caught real issues early** - 5 iterations surfaced 2 Red, 15 Yellow, 10 Green findings before any code was written. Key catches: summary stats computed from filtered list (would have broken `crappyPercent`), JSON contract ambiguity, `parseCli` purity violation, empty-table UX gap.
2. **Implementation was clean after planning** - Zero compilation errors and all tests passed on first run after implementation. The thorough planning eliminated the usual fix-compile-fix cycle.
3. **Expert review found only minor gaps** - No Reds at review time. The stress-test had already caught the structural issues.

## What Could Improve

1. **Stress-test took 5 iterations / ~5 minutes of agent time**
   - **Impact**: High latency before implementation could begin. Some findings were marginal (e.g., Y13 "score.test.ts might need updating" — it didn't).
   - **Mitigation**: Consider `max:3` for well-scoped refactors. Reserve `max:5` for architectural changes.

2. **Plan had internal "Wait —" self-correction visible in output**
   - **Impact**: The plan file briefly contained stream-of-consciousness reasoning ("Wait — actually, looking at this more carefully...") before being rewritten. This is noise in a deliverable artifact.
   - **Mitigation**: Draft reasoning internally, write only conclusions to the plan file.

3. **Dual-meaning of `ProjectSummary.functions` not documented**
   - **Impact**: `functions` means "full list" inside `summarize()` but "displayed subset" after pipeline spread. Future callers could be surprised.
   - **Mitigation**: Add a type-level comment or consider a `displayedFunctions` field if this pattern spreads.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Filter by `isCrappy` only (not `coverage === null`) | Low-complexity uncovered functions have low CRAP scores and aren't actionable. Including them floods output. | Correct — avoids noise while high-complexity uncovered functions are already marked crappy |
| Keep `--only-crappy` as deprecated no-op | Breaking CI scripts that use the flag would be hostile | Clean deprecation path with stderr warning |
| Move deprecation warning to pipeline | Keep `parseCli` side-effect-free (pure function) | Testable without console.warn mocking in CLI tests |
| Spread summary instead of mutating | Avoid breaking `summarize()` contract | Stats always reflect full project; display subset is orthogonal |

## Lessons Learned

### Applicable Everywhere
- **Plan stress-test convergence is a strong quality signal** — when the reviewer finds 0 new issues, the plan is genuinely ready. The declining Red/Yellow counts (1R+5Y → 1R+4Y → 0R+3Y → 0R+3Y → converged) provide visible confidence.
- **Filtering should happen after summarization** — when computing aggregate stats from a dataset, always compute from the full set, then filter for display. This avoids the classic "100% crappy" bug when showing only bad items.

### Specific to This Work
- **crap4ts default should surface only actionable items** — the tool's value is in highlighting problems, not in being a comprehensive function lister. The `--all` flag serves the audit use case.

## Recommendations

### Rule Changes
- None needed. Existing rules (stepdown, pure functions, test hygiene) guided the work well.

### Skill Coverage
Skills relevant: none from ms matched this domain (crap4ts is a niche CLI tool).
Skills loaded: planning, review, simplify — all contributed.
Gap: none significant.

### Automation Opportunities
- The plan-stress-test → implement → simplify-review pipeline (`/review-and-implement` after `/plan-stress-test`) could be a single chained skill for high-confidence refactors.

## Follow-up Actions

- [ ] Consider adding a type comment to `ProjectSummary.functions` documenting the dual semantics
- [ ] Remove `--only-crappy` deprecation shim in a future major version

## Candidate Rules (for cm reflect)

- **Pattern**: "Filter display after computing aggregate stats — never summarize from a filtered subset" (source: this post-mortem)
