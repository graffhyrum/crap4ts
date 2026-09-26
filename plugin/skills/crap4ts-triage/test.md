# Add a covering test

Complexity is below the threshold and coverage is low.

Add a test that executes a statement inside `action.filePath` from `action.startLine` to `action.endLine`.

Put the test in a test file. Do not edit that function.

Then run `bun ${CURSOR_PLUGIN_ROOT}/scripts/gate.ts`. If that gate exits 1, run triage again.

A hit count above 1 does not help.

Complexity 5 at 0% coverage scores 30.

Any coverage above 0 clears it under the default threshold.
