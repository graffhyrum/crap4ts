import { describe, expect, test } from "bun:test";
import { decideStop, parseStopInput } from "./stop";
import type { TriageResult } from "../scripts/types";

const triageWithAction: TriageResult = {
  version: 1,
  isFlagged: true,
  crappyPercent: 10,
  action: {
    kind: "test",
    filePath: "a.ts",
    startLine: 1,
    endLine: 5,
    name: "f",
    complexity: 5,
    coverage: 0,
    crapScore: 30,
    reference: "test.md",
  },
  remaining: 0,
  report: ".crap4ts/report.json",
};

const emptyTriage: TriageResult = {
  version: 1,
  isFlagged: false,
  crappyPercent: 0,
  action: null,
  remaining: 0,
  report: ".crap4ts/report.json",
};

describe("decideStop", () => {
  test("no gate config → {}", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: false,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 1 }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({});
  });

  test("loop_count not 0 → {}", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 1 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 1 }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({});
  });

  test("status not completed → {}", async () => {
    expect(
      await decideStop(
        { status: "aborted", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 1 }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({});
  });

  test("gate exit 0 → {}", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 0 }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({});
  });

  test("gate exit 2 → setup followup", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 2, message: "coverage command is not allowed" }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({
      followup_message:
        "The gate did not score the project. coverage command is not allowed Run the crap4ts-gate skill.",
    });
  });

  test("missing scripts → followup", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: false,
          triageScriptExists: true,
          runGate: async () => ({ exit: 1 }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({
      followup_message: "The crap4ts scripts are missing. Run the crap4ts-bootstrap skill.",
    });
  });

  test("triage action null → followup", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 1 }),
          runTriage: async () => ({ result: emptyTriage, exit: 0 }),
        },
      ),
    ).toEqual({
      followup_message:
        "The project is flagged. Triage named no in-repo function. Stop.",
    });
  });

  test("gate exit 1 with action → followup_message", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 1 }),
          runTriage: async () => ({ result: triageWithAction, exit: 0 }),
        },
      ),
    ).toEqual({
      followup_message:
        "Run the crap4ts-triage skill before any edit.",
    });
  });

  test("padded completed status still runs", () => {
    expect(parseStopInput({ status: "completed ", loop_count: 0 }).status).toBe("completed");
  });

  test("gate exit 2 strips shell text from the message", async () => {
    expect(
      await decideStop(
        { status: "completed", loop_count: 0 },
        {
          gateConfigExists: true,
          gateScriptExists: true,
          triageScriptExists: true,
          runGate: async () => ({ exit: 2, message: "bad; rm -rf /" }),
          runTriage: async () => ({ result: emptyTriage, exit: 0 }),
        },
      ),
    ).toEqual({
      followup_message: "The gate did not score the project. Fix the setup. Run the crap4ts-gate skill.",
    });
  });
});
