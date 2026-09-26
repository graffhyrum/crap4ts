import { describe, expect, test } from "bun:test";
import path from "path";
import type { FileSystem } from "./detect/types";
import { runPipeline } from "./pipeline";
import { CrapError, type Config } from "./types";

function makeFs(files: Record<string, string>): FileSystem {
  return {
    exists: async (p) => Object.hasOwn(files, p),
    readText: async (p) => files[p] ?? null,
  };
}

function config(overrides: Partial<Config> = {}): Config {
  return {
    coveragePath: path.resolve("cov.json"),
    format: "istanbul",
    threshold: 30,
    projectThreshold: 5,
    output: "json",
    outputFile: undefined,
    sort: "score",
    showAll: true,
    onlyCrappyDeprecated: false,
    include: "**/*.ts",
    exclude: "**/node_modules/**",
    files: ["src/a.ts"],
    init: false,
    skipGitignore: true,
    ...overrides,
  };
}

describe("runPipeline filesystem", () => {
  test("reads explicit sources and coverage from the injected filesystem", async () => {
    const sourcePath = path.resolve("src/a.ts");
    const covPath = path.resolve("cov.json");
    const logs: string[] = [];
    const log = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const code = await runPipeline(
        config(),
        makeFs({
          [sourcePath]: "function fromFake() { return 1; }\n",
          [covPath]: "{}",
        }),
      );
      expect(code).toBe(0);
      expect(logs.join("\n")).toContain("fromFake");
    } finally {
      console.log = log;
    }
  });

  test("missing coverage throws CrapError", async () => {
    const sourcePath = path.resolve("src/a.ts");
    await expect(
      runPipeline(config(), makeFs({ [sourcePath]: "function fromFake() { return 1; }\n" })),
    ).rejects.toThrow(CrapError);
  });

  test("a file present on disk is ignored when the injected filesystem says it is absent", async () => {
    const code = await runPipeline(config({ files: ["src/pipeline.ts"] }), makeFs({}));
    expect(code).toBe(2);
  });
});
