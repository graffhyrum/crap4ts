import { describe, expect, test } from "bun:test";
import { parseGateConfig, parseProjectSummary, parseTriageResult } from "./types";

const fn = {
  name: "a",
  filePath: "src/a.ts",
  startLine: 1,
  endLine: 2,
  complexity: 1,
  coverage: 0,
  crapScore: 2,
  isCrappy: false,
};

describe("parseProjectSummary", () => {
  test("rejects coverage outside 0 to 1", () => {
    expect(
      parseProjectSummary({
        functions: [{ ...fn, coverage: 2 }],
        totalFunctions: 1,
        crappyCount: 0,
        crappyPercent: 0,
        isFlagged: false,
      }),
    ).toBeNull();
  });

  test("rejects a crappy percent above 100", () => {
    expect(
      parseProjectSummary({
        functions: [],
        totalFunctions: 0,
        crappyCount: 0,
        crappyPercent: 101,
        isFlagged: false,
      }),
    ).toBeNull();
  });
});

describe("parseGateConfig", () => {
  test("rejects a project threshold of 100", () => {
    expect(
      parseGateConfig({
        version: 1,
        coverageCommand: "bun test --coverage",
        crapArgs: [],
        threshold: 30,
        projectThreshold: 100,
      }),
    ).toBeNull();
  });
});

describe("parseTriageResult", () => {
  const base = {
    version: 1,
    isFlagged: false,
    crappyPercent: 0,
    remaining: 0,
    report: ".crap4ts/report.json",
  };

  test("rejects a fix-join action whose coverage is a number", () => {
    expect(
      parseTriageResult(
        {
          ...base,
          action: {
            kind: "fix-join",
            reference: "join.md",
            filePath: "plugin/scripts/types.ts",
            name: "a",
            startLine: 1,
            endLine: 2,
            complexity: 1,
            coverage: 0,
            crapScore: 1,
          },
        },
        process.cwd(),
      ),
    ).toBeNull();
  });

  test("rejects a split action whose coverage is null", () => {
    expect(
      parseTriageResult(
        {
          ...base,
          action: {
            kind: "split",
            reference: "split.md",
            filePath: "plugin/scripts/types.ts",
            name: "a",
            startLine: 1,
            endLine: 2,
            complexity: 1,
            coverage: null,
            crapScore: 1,
          },
        },
        process.cwd(),
      ),
    ).toBeNull();
  });

  test("rejects a crappy percent above 100", () => {
    expect(
      parseTriageResult({ ...base, crappyPercent: 101, action: null }, process.cwd()),
    ).toBeNull();
  });

  test("accepts a result with no action", () => {
    expect(parseTriageResult({ ...base, action: null }, process.cwd())).toEqual({
      version: 1,
      isFlagged: false,
      crappyPercent: 0,
      action: null,
      remaining: 0,
      report: ".crap4ts/report.json",
    });
  });
});
