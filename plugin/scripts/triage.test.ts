import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { runTriage } from "./triage";
import { isInsideRepo } from "./types";

const reportPath = join("/proj", ".crap4ts", "report.json");
const gatePath = join("/proj", ".crap4ts", "gate.json");

const config = {
  version: 1,
  coverageCommand: "bun test --coverage",
  crapArgs: ["-c", "coverage/lcov.info", "-f", "lcov"],
  threshold: 30,
  projectThreshold: 5,
};

const report = {
  functions: [
    {
      name: "worst",
      filePath: "f.ts",
      startLine: 1,
      endLine: 50,
      complexity: 10,
      coverage: null,
      crapScore: 110,
      isCrappy: true,
    },
    {
      name: "mild",
      filePath: "e.ts",
      startLine: 10,
      endLine: 20,
      complexity: 5,
      coverage: 0,
      crapScore: 30,
      isCrappy: true,
    },
  ],
  totalFunctions: 2,
  crappyCount: 2,
  crappyPercent: 100,
  isFlagged: true,
};

describe("runTriage", () => {
  test("missing report → exit 2 and message", () => {
    const { result, exit, message } = runTriage([], {
      cwd: "/proj",
      fs: {
        exists: () => false,
        readText: () => "",
      },
    });
    expect(exit).toBe(2);
    expect(message).toBe("report is missing");
    expect(result.action).toBeNull();
  });

  test("prints first action and remaining", () => {
    const { result, exit } = runTriage([], {
      cwd: "/proj",
      fs: {
        exists: (p) => p === reportPath || p === gatePath,
        readText: (p) =>
          p === gatePath ? JSON.stringify(config) : JSON.stringify(report),
      },
    });
    expect(exit).toBe(0);
    expect(result).toEqual({
      version: 1,
      isFlagged: true,
      crappyPercent: 100,
      action: {
        kind: "fix-join",
        filePath: "f.ts",
        startLine: 1,
        endLine: 50,
        name: "worst",
        complexity: 10,
        coverage: null,
        crapScore: 110,
        reference: "join.md",
      },
      remaining: 1,
      report: reportPath,
    });
  });

  test("--every returns actions when isFlagged false", () => {
    const quiet = {
      ...report,
      isFlagged: false,
      crappyPercent: 5,
      crappyCount: 1,
      totalFunctions: 20,
      functions: [report.functions[1]],
    };
    const { result } = runTriage(["--every"], {
      cwd: "/proj",
      fs: {
        exists: (p) => p === reportPath || p === gatePath,
        readText: (p) =>
          p === gatePath ? JSON.stringify(config) : JSON.stringify(quiet),
      },
    });
    expect(result.action).toEqual({
      kind: "test",
      filePath: "e.ts",
      startLine: 10,
      endLine: 20,
      name: "mild",
      complexity: 5,
      coverage: 0,
      crapScore: 30,
      reference: "test.md",
    });
  });

  test("isInsideRepo rejects a path outside the project", () => {
    expect(isInsideRepo("src/a.ts", "/proj")).toBe(true);
    expect(isInsideRepo("../secret", "/proj")).toBe(false);
    expect(isInsideRepo("/etc/passwd", "/proj")).toBe(false);
  });
});
