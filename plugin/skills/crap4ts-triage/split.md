# Split a complex function

Complexity is at least the threshold.

At full coverage the score equals complexity, so tests cannot clear it.

Edit only `action.name` in `action.filePath`, from `action.startLine` to `action.endLine`. Do not edit other files.

Extract a branch or a loop into its own function.

Nested functions are scored separately.

Then run `bun ${CURSOR_PLUGIN_ROOT}/scripts/gate.ts`. If that gate exits 1, run triage again.

Complexity 30 at full coverage stays crappy under the default threshold.
