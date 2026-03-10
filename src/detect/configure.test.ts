import { describe, expect, mock, test } from "bun:test";
import type { FileSystem, RunnerAdapter } from "./types";
import { configureRunner } from "./configure";

const PROJECT_ROOT = "/tmp/test-configure";
const DEST = `${PROJECT_ROOT}/bunfig.toml`;
const TOML_CONTENT = `[test]\ncoverage = true\ncoverageReporter = ["lcov"]\ncoverageDir = "coverage"\n`;

function makeAdapter(overrides: Partial<RunnerAdapter> = {}): RunnerAdapter {
  return {
    name: "bun",
    detect: async () => true,
    getCoverageConfig: () => ({ path: "./coverage/lcov.info", format: "lcov" as const }),
    generateConfig: () => TOML_CONTENT,
    configFilename: () => "bunfig.toml",
    getSetupInstructions: () => ["Run: bun test", "Then: crap4ts -c coverage/lcov.info -f lcov"],
    ...overrides,
  };
}

describe("configureRunner", () => {
  test("calls write with full dest path and TOML content", async () => {
    const write = mock(async () => undefined);
    const fs: FileSystem = { exists: async () => false, readText: async () => null };

    await configureRunner(makeAdapter(), PROJECT_ROOT, write, fs);

    expect(write).toHaveBeenCalledWith(DEST, TOML_CONTENT);
  });

  test("does not call write when file already exists", async () => {
    const write = mock(async () => undefined);
    const fs: FileSystem = { exists: async () => true, readText: async () => null };

    await configureRunner(makeAdapter(), PROJECT_ROOT, write, fs);

    expect(write).not.toHaveBeenCalled();
  });

  test("logs warning containing 'already exists' when skipping", async () => {
    const write = mock(async () => undefined);
    const fs: FileSystem = { exists: async () => true, readText: async () => null };
    const warnMessages: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => {
      warnMessages.push(msg);
    };

    await configureRunner(makeAdapter(), PROJECT_ROOT, write, fs);

    console.warn = origWarn;
    expect(warnMessages.some((m) => m.includes("already exists"))).toBe(true);
  });

  test("logs 'Written:' on success", async () => {
    const write = mock(async () => undefined);
    const fs: FileSystem = { exists: async () => false, readText: async () => null };
    const logMessages: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => {
      logMessages.push(msg);
    };

    await configureRunner(makeAdapter(), PROJECT_ROOT, write, fs);

    console.log = origLog;
    expect(logMessages.some((m) => m.includes("Written:"))).toBe(true);
  });
});
