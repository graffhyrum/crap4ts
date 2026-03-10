# Post-Mortem: crap4ts Initial Implementation + Expert Review Remediation

**Date**: 2026-03-09
**Status**: Completed

## Executive Summary

Full greenfield implementation of crap4ts — a CRAP score CLI for TypeScript/JavaScript — from a detailed plan, followed by a 3-agent expert review and immediate remediation of all 10 findings. The session produced 17 source files, 11 test files (66 tests), and clean type checking. The implementation-then-review-then-fix cycle completed in a single session.

## Bead Outcomes

- Closed: none
- Opened: none
- Modified: none

(No beads DB initialized for this project.)

## What Went Well

1. **Plan-driven implementation was highly efficient** — The detailed plan with exact file paths, types, and formulas meant zero ambiguity during implementation. Every module was written without backtracking.
2. **Parallel expert agents produced high-quality, non-overlapping findings** — Three agents ran concurrently (88-97s each) and converged on the same top issue (process.exit in library code) while each contributing unique domain-specific insights.
3. **Early type-checking caught the Bun Glob API mismatch** — Running `tsc --noEmit` after the first draft caught the `exclude` property that doesn't exist on `GlobScanOptions`. Fixed in one edit.
4. **Review remediation unblocked 24 new tests** — The `process.exit` → `CrapError` refactor made error paths testable, enabling CLI validation and parser error tests that weren't possible before.
5. **Single constructor naming bug** — Only one test failure in the initial implementation (constructor naming), fixed immediately with a one-line change.

## What Could Improve

1. **`process.exit` was used from the start despite plan saying "abort on first error"**
   - **Impact**: Required refactoring 6 call sites during review remediation. If `CrapError` had been in the plan, the initial implementation would have been correct.
   - **Mitigation**: Plans for CLI tools should specify error propagation strategy explicitly (throw vs exit). Default to throwing in library code.

2. **`IstanbulSchema` was written as dead code from the start**
   - **Impact**: The plan mentioned it but the actual parser used `IstanbulJsonSchema` + per-entry validation. The unused schema was pure waste.
   - **Mitigation**: During implementation, verify each export has at least one import before moving on.

3. **`statementMap` validation gap was in the plan**
   - **Impact**: The plan explicitly said "Do NOT deeply validate every `{start, end}` location" — but then the implementation cast `unknown` to `StatementLocation` without any validation. The plan's instruction was reasonable for trusted tool output, but the `as` cast created a silent failure mode.
   - **Mitigation**: When a plan says "don't deeply validate X", still validate the shape at the boundary — just don't recurse into nested arrays/optional fields.

4. **No `bun-test` skill was loaded despite writing 66 tests**
   - **Impact**: None in this case (tests were straightforward), but the skill could have provided guidance on mock patterns for the seam-injection approach.
   - **Mitigation**: `ms suggest` returned `bun-test` as relevant (0.73 confidence). Could have loaded it proactively.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Implement all modules before any tests | Plan specified complete module architecture; faster to batch | Worked well — only 1 test failure |
| Run 3 expert agents in parallel | Each has distinct domain; no dependencies | Good — 29 unique findings, 3/3 consensus on top issue |
| Implement all 10 review findings immediately | Findings were concrete with clear fixes | Clean — 24 new tests added, all passing |
| Use `CrapError` class instead of Result type | Simpler for CLI tool; plan specified "abort on first error" | Good — clean error propagation, testable with `toThrow` |
| Keep `hasOwnName` `as ts.Node` cast | TS compiler API types don't narrow cleanly with `"name" in node` | Acceptable — the cast is load-bearing but safe given the `ts.isIdentifier` check |

## Lessons Learned

### Applicable Everywhere

- **Plan error handling strategy before writing code** — "process.exit in library code" is the #1 finding in CLI tool reviews. A plan should always specify: throw in libraries, catch at entry point.
- **Expert review → implement cycle is highly effective for greenfield** — The review agents found real issues (validation gap, dead code, DRY violations) that would have persisted indefinitely without the structured review pass.
- **ArkType `Record<string, unknown>` validates nothing useful** — If you're going to cast the values afterward, you might as well validate the actual shape. `unknown` with a downstream `as` cast is worse than no validation because it creates false confidence.

### Specific to This Work

- **TS compiler API: `ts.isIdentifier(node.name as ts.Node)` is the idiomatic pattern** — There's no clean way to narrow `node` to "has an Identifier name" without a cast, because TS AST nodes use structural types that don't discriminate cleanly.
- **Bun's `Glob.scan()` doesn't have an `exclude` option** — Must filter manually with a separate `Glob.match()` call.

## Recommendations

### Rule Changes

- Consider adding to CLAUDE.md distilled rules: **"CLI tools: throw typed errors in library code, catch at entry point only"** — this was the unanimous #1 finding across all three expert agents.

### Skill Coverage

Skills relevant per `ms suggest`: surrealdb-sdk-concepts, documentation, bun-test, surrealdb-sdk-api-reference, karpathy-guidelines

Skills actually loaded: none explicitly (ark skill rules applied via CLAUDE.md ArkType instructions)

Gap: `bun-test` was relevant but not loaded. Would have been useful for mock/seam patterns.

### Skill Gaps

- `bun-test` was not triggered because the user prompt was about implementation, not testing. The skill description mentions "writing or running tests" — it should also trigger when a plan includes a testing strategy section.
- No `typescript-compiler-api` skill exists. The TS compiler API is complex enough that a skill covering AST traversal patterns, `forEachChild` short-circuiting, and `setParentNodes` would prevent common mistakes.

### Automation Opportunities

- A pre-commit hook running `bunx tsc --noEmit` would catch type errors before they reach review.
- The expert-review → implement-suggestions chain could be a single compound skill (`/simplify-review` exists but doesn't include implementation).

## Follow-up Actions

- [ ] Consider creating a `typescript-compiler-api` skill for AST traversal patterns
- [ ] Consider adding error-handling strategy rule to CLAUDE.md

## Candidate Rules (for cm reflect)

- **Pattern**: "CLI tools: throw typed errors in library code, catch only at entry point" (source: this post-mortem, 3/3 expert consensus)
- **Pattern**: "ArkType Record<string, unknown> + downstream as-cast = validation gap. Validate the actual shape or don't validate at all." (source: this post-mortem)

## Related Threads

- Plan mode transcript: `/home/graff/.claude/projects/-home-graff-WebstormProjects-crap4ts/015e1505-88eb-40a2-9dd0-1e2d50d6f0ce.jsonl`
