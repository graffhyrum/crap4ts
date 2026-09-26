# Post-Mortem: setup-pstack + verify-crap4ts

**Date**: 2026-09-26
**Status**: Completed

## Executive Summary

Session ran `/setup-pstack` (medium budget, accepted mapped models) then `/create-verification-skill` for crap4ts. Outcome: wrote `~/.cursor/rules/pstack-models.mdc`, migrated a file-shaped `~/.cursor/rules` into a directory (kept UBS as `ubs.mdc`), and shipped a proven `.cursor/skills/verify-crap4ts/` CLI verification skill with a five-feature map and doctor helper.

## Bead Outcomes

- Closed: none
- Opened: none
- Modified: none (br diff unavailable / no tracker activity)

## What Went Well

1. **Skill fidelity** - Followed setup-pstack and create-verification-skill steps in order (detect → budget → confirm → write; interview → generate → prove). Avoided inventing unavailable model slugs.
2. **Safe rules migration** - Detected `~/.cursor/rules` as a file, converted to a directory, and preserved UBS content as `ubs.mdc` before writing `pstack-models.mdc`.
3. **CLI-grounded verification** - Interviewed the repo as a short-lived CLI (not a fake web harness), used real `test/fixtures/*`, and proved `score-report` end-to-end with surviving artifacts under `.cursor/skills/verify-crap4ts/artifacts/`.
4. **Budget remap honesty** - When defaults (`…-max`, `…-xhigh-fast`) were absent from Task-detectable slugs, mapped to family best effort ≤ target (`claude-opus-5-5-medium`, `gpt-5.6-sol-medium`, `grok-4.7-high`) and required accept before write.

## What Could Improve

1. **AskQuestion unavailable**
   - **Impact**: Budget and role confirm used free text instead of structured UI.
   - **Mitigation**: setup-pstack should document free-text fallback when AskQuestion is missing; keep exact option labels.

2. **Detected Task slugs lag skill defaults**
   - **Impact**: Extra mapping step; every role needed fall-down from max/xhigh to medium/high variants.
   - **Mitigation**: Prefer detected set as source of truth; keep defaults as aspirational and always remap before confirm.

3. **ms suggest noise**
   - **Impact**: Suggested caching/review/architecture skills unrelated to pstack/verify work.
   - **Mitigation**: Treat ms output as weak signal for post-mortem coverage only; do not chase low-relevance suggestions mid-setup.

4. **Doctor path depth**
   - **Impact**: `helpers/doctor.ts` walks four parents to repo root — brittle if skill relocates.
   - **Mitigation**: Prefer `Bun.file`/`import.meta.dir` anchored search for `package.json` with `"name": "@graffhyrum/crap4ts"`, or pass `--cwd`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Budget `medium — high reasoning` | User choice | Effort target `high`; remapped to detected slugs |
| Accept remapped role table as-is | All slugs in detected set | Wrote `pstack-models.mdc` |
| Yes to verification skill | User accepted optional offer | Created and proved `verify-crap4ts` |
| Isolate `--init` in temp projects | Repo already Bun-shaped; would skip/mutate local config | Documented in skill + feature map |
| Convert `rules` file → directory | Skill requires `rules/pstack-models.mdc` | Path works; UBS preserved |

## Lessons Learned

### Applicable Everywhere

- Before writing `~/.cursor/rules/<name>.mdc`, check whether `rules` is a **file or directory**. If a file, migrate content into `rules/<legacy>.mdc` then create the directory — never overwrite blindly.
- Never write a Task `model` slug that is not in the session-detectable set; remap by family and effort ladder, then confirm.
- A generated verification skill is a draft until one mapped feature is driven for real evidence that survives cleanup.
- For CLI tools, “Launch” means install/build readiness + per-drive process isolation — not a long-lived server.

### Specific to This Work

- crap4ts primary surface is `bun src/index.ts`; proof uses fixtures under `test/fixtures/` and exit codes `0`/`1`/`2`.
- `--init` verification must use a disposable temp project, never the crap4ts repo root.
- Default score output is crappy-only: `--all` or JSON `totalFunctions` is required to prove functions were analyzed when `crappyCount` is `0`.

## Remediation

### Remediation Hierarchy (mandatory)

| Tier | Mechanism | Proposal |
|------|-----------|----------|
| 1 Hook | none | No deterministic harness event fits model-budget confirmation |
| 2 Script | optional | Harden `verify-crap4ts/helpers/doctor.ts` root discovery (find package.json upward) |
| 3 Skill/command | **preferred** | Update setup-pstack: free-text AskQuestion fallback; document `rules` file→dir migration. Point users at `/maintain-verification-skill` after map drift |
| 4 Always-loaded | not justified | Covered by skill + cm-rule; do not add AGENTS.md noise |

### Verification

- **Test**: Re-run `/setup-pstack` in a sandbox user home with `rules` as a file; expect directory + preserved content + `pstack-models.mdc`. Run `bun .cursor/skills/verify-crap4ts/helpers/doctor.ts` then score-report recipe; expect `PROOF_OK` artifacts.
- **Bypass mode**: Skills are advisory (bypassable if not loaded). Doctor is opt-in. No hook enforcement.

### Skill Coverage

Skills relevant to this session (ms suggest — weak relevance): caching-patterns, review, improve-codebase-architecture, generate-visual-plan, dinkle-ux
Skills actually loaded: setup-pstack (attached), create-verification-skill (invoked), post-mortem (attached)
Gap: create-verification-skill / setup-pstack / maintain-verification-skill were not in ms top suggestions — index does not surface pstack plugin skills well for this cwd.

### Skill Gaps

- setup-pstack: missing explicit AskQuestion-absent and `~/.cursor/rules` file-vs-dir branches.
- create-verification-skill: worked; keep CLI/TUI recipe path prominent in description so ms can index it.
- maintain-verification-skill: offered but not run — expected after feature drift only.

### Infrastructure Actions (non-rule)

- [ ] Harden `.cursor/skills/verify-crap4ts/helpers/doctor.ts` root resolution (walk up for package.json).
- [ ] Optionally move misplaced `docs/post-mortem-2026-03-09-default-output-filtering.md` into `docs/post-mortems/` (legacy location warning).

## Follow-up Actions

- [ ] Skills to update? setup-pstack edge cases (AskQuestion fallback, rules migration).
- [ ] Scripts to add/modify? Doctor root walk in verify-crap4ts.
- [ ] Hooks to add/modify? none
- [ ] Always-loaded instructions? none (tiers 1–3 sufficient)

```bash
# Dedup check before creating a tracker item:
if ! search_result=$(tracker search "setup-pstack rules directory" 2>/dev/null); then
  echo "tracker search failed; not creating a task" >&2
  exit 1
elif printf '%s\n' "$search_result" | grep -q "."; then
  echo "SIMILAR ITEM EXISTS — skip"
else
  tracker create --title="Harden setup-pstack rules file→dir migration docs" \
    --description="Identified in post-mortem 2026-09-26" \
    --type task --priority p3
fi
```

## Candidate Rules (for cm reflect)

- **Pattern**: "Before writing under ~/.cursor/rules/, check whether rules is a file or directory; migrate file content into rules/<legacy>.mdc first." (source: this post-mortem)
- **Pattern**: "Never pass a Task model slug that is not session-detectable; remap by family and effort ladder, then confirm with the user." (source: this post-mortem)
- **Pattern**: "A project verification skill is not done until one mapped feature is driven and evidence survives cleanup." (source: this post-mortem)

## cm Feedback

[cass: helpful b-muirjrgt-s5lmiu]
[cass: harmful none]

## cm Session Close

```bash
cm mark b-muirjrgt-s5lmiu --helpful --json
```

## Related Threads

- Prior post-mortem: `docs/post-mortems/post-mortem-2026-09-26-ponytail-council-cleanup.md`
- PR open (unrelated to this session): https://github.com/graffhyrum/crap4ts/pull/3
- Specstory: `.specstory/history/2026-09-26_19-31-38Z-pstack-setup-instructions.md`
