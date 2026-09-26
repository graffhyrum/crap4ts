# Post-Mortem: ponytail-audit → council-review → commit-organize

**Date**: 2026-09-26
**Status**: Completed

## Executive Summary

Session audited crap4ts for over-engineering (`/ponytail-audit`), then ran `/council-review` on that feedback (7 experts, 4 rounds). High-confidence cuts landed (dead API, fail-fast init, V8 explicit-only, `--only-crappy` removal); product surfaces (HTML, FileSystem, arktype, V8 keep-vs-test) stayed deferred. Changes were organized into conventional commits with changesets (major). Agent docs deleted in cleanup were restored on request.

## Bead Outcomes

- Closed: none
- Opened: none
- Modified: none (tracker CLI `br diff` unavailable)

## What Went Well

1. **Council gate on ponytail cuts** — Experts retracted HTML/FileSystem deletes and rejected naive arktype drop before damage. Product README constraints beat raw line-count YAGNI.
2. **Atomic fail-fast fixes** — Istanbul array narrow, init write → `CrapError`, V8 auto-detect removal with actionable `-f v8` hint, exhaustive `CrapError` switches — all tested (102 pass).
3. **Commit organize with major changeset** — Breaking `--only-crappy` and V8 auto-detect change correctly shipped as `refactor!` + major bump, separate from toolchain chore.
4. **Parallel expert spawn** — Round 1 launched seven councils together; cut wall-clock vs serial review.

## What Could Improve

1. **Ponytail ranked documented features as deletes**
   - **Impact**: Top cuts (V8, HTML) conflicted with README; council had to retract.
   - **Mitigation**: Ponytail-audit should tag README/CLI-documented surfaces as `product:` not `delete:` unless usage telemetry says unused.

2. **Agent docs deleted without confirmation**
   - **Impact**: `docs/` interview-pack / distillation / post-mortem removed in council round; user restored + re-committed.
   - **Mitigation**: Treat `docs/` knowledge artifacts as keep-by-default; only delete when user confirms. Ponytail "repo hygiene" ≠ product docs.

3. **Robert Martin stuck at 8/10 until dead field removed**
   - **Impact**: Extra round for `onlyCrappyDeprecated` after other experts already ≥9.
   - **Mitigation**: When one expert blocks convergence on a clear dead-API item with unanimous prior accept, implement earlier in Round 1.

4. **ms suggest skills mismatched session**
   - **Impact**: Suggested codebase-design / claude-api / browser-automation — low relevance vs ponytail/council/commit-organize actually used.
   - **Mitigation**: Skill index needs stronger keywords for quality:council-review and ponytail-audit.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep arktype | Boundary morphs + error tests; shallow guards regress | Kept |
| Keep FileSystem seam | AGENTS.md mandate; unify I/O instead of delete | Deferred unify |
| Keep HTML / V8 formats | README product surface | Deferred V8 tests |
| Drop V8 auto-detect | README said `-f v8`; security (path reads) | Done + regression test |
| Remove `--only-crappy` | Dead deprecation shim; default is crappy-only | Major release |
| Restore agent docs | User request after council deleted them | Restored + committed |

## Lessons Learned

### Applicable Everywhere

- Audit findings that delete README/CLI-documented features need a **product tag** and human confirm — not auto-implement.
- Council-review of an audit (not only of code) catches overstated YAGNI before commits.
- Knowledge files under `docs/` are not the same as dead code; confirm before delete.
- Breaking CLI flag removal belongs in a **major** changeset, separate from chore toolchain bumps.

### Specific to This Work

- `AutoDetectableFormat = Exclude<CoverageFormat, "v8">` encodes explicit-only V8 in types.
- Init write must throw `CrapError` and use `Promise.all` (not `allSettled`) so failures exit 2.
- Istanbul `Record<string, unknown>` accepts arrays — need `.narrow()` against `Array.isArray`.

## Remediation

### Remediation Hierarchy (mandatory)

| Tier | Proposal | Notes |
|------|----------|-------|
| 1 Hook | none | N/A |
| 2 Script | none | N/A |
| 3 Skill | Update `ponytail-audit` / `ponytail-review`: documented CLI/README surfaces → `product:` tag, not `delete:` | Additive skill text |
| 3 Skill | Update `council-review`: when reviewing audit lists, require product-surface check before high-confidence delete | Additive |
| 4 Always-loaded | none | Skill updates suffice |

### Verification

- **Skill update test**: Run `/ponytail-audit` on a README-documented feature; expect `product:` not top-ranked `delete:`.
- **Bypass mode**: Skill text only — bypassable if skill not attached; acceptable for advisory audits.

### Skill Coverage

Skills relevant (ms suggest): codebase-design, setup-ts-deep-modules, dinkle-wander (weak match)
Skills actually loaded/used: ponytail-audit, council-review, commit-organize, post-mortem
Gap: quality:council-review and ponytail-audit not surfaced by `ms suggest` despite being the session core

### Skill Gaps

- `ponytail-audit` needs product-surface / README check in Hunt section
- `ms` index under-weights quality/* and ponytail skills for this repo fingerprint

### Infrastructure Actions (non-rule)

- [ ] Deferred product: V8 fixture + tests **or** remove V8 from README/CLI
- [ ] Deferred: unify `pipeline.ts` / `v8.ts` I/O onto `FileSystem` / Bun (AGENTS.md)
- [ ] Deferred: flatten `RunnerAdapter` (one runner)
- [ ] Migrate legacy flat `docs/post-mortem-*.md` → `docs/post-mortems/` before next `--distill`

## Follow-up Actions

- [ ] Skills: add product-surface guard to ponytail-audit / ponytail-review
- [ ] Skills: council-review audit-list framing — retract documented deletes unless product confirms
- [ ] Scripts: none
- [ ] Always-loaded instructions: none (tiers 1–3 sufficient)
- [ ] Product: decide V8 test-or-delete
- [ ] Move `docs/post-mortem-2026-03-09-default-output-filtering.md` into `docs/post-mortems/`

## Candidate Rules (for cm reflect)

- **Pattern**: "Do not auto-delete README/CLI-documented features from a complexity audit without product confirmation" (source: this post-mortem)
- **Pattern**: "Do not delete docs/ knowledge artifacts as dead code without explicit user confirmation" (source: this post-mortem)

## cm Feedback

[cass: helpful b-ms2mz4cj-b0zy0d] — defer-only-on-explicit-request; relevant to deferred FileSystem/V8/adapter items
[cass: harmful none]

## cm Session Close

```bash
cm mark b-ms2mz4cj-b0zy0d --helpful --json
```

## Related Threads

- Prior flat post-mortem: `docs/post-mortem-2026-03-09-default-output-filtering.md` (legacy location)
- Council findings log: `logs/findings.jsonl` (quality:council-review)
- Commits: `ea79943` toolchain, `c1eaaaa` docs delete, `6453254` refactor!, `ac3c1bd` docs restore
