import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CrapError } from "../types";
import { parseV8 } from "./v8";

const source = "function a() {\n  return 1;\n}\n";

function payload(url: string): string {
  return JSON.stringify({ result: [script(url, "1")] });
}

function script(url: string, scriptId: string) {
  return {
    scriptId,
    url,
    functions: [
      {
        functionName: "a",
        ranges: [{ startOffset: 0, endOffset: 10, count: 2 }],
      },
    ],
  };
}

function payloadWithRange(startOffset: number, endOffset: number, count: number): string {
  return JSON.stringify({
    result: [
      {
        scriptId: "1",
        url: "src/a.ts",
        functions: [
          {
            functionName: "a",
            ranges: [{ startOffset, endOffset, count }],
          },
        ],
      },
    ],
  });
}

describe("V8 parser", () => {
  test("maps a relative url onto source lines", async () => {
    const result = await parseV8(payload("src/a.ts"), "v8.json", {
      sourceRoot: "/repo",
      readFile: async () => source,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.filePath).toBe(path.resolve("/repo", "src/a.ts"));
    expect(result[0]?.statements[0]).toEqual({ startLine: 1, endLine: 1, hits: 2 });
  });

  test("reads a file url and an absolute path inside the source root", async () => {
    const absolute = path.resolve("src/coverage/v8.ts");
    const fileUrl = pathToFileURL(absolute).href;
    const content = JSON.stringify({
      result: [
        script(fileUrl, "1"),
        script(absolute, "2"),
        { scriptId: "3", url: "https://example.com/a.ts", functions: [] },
        { scriptId: "4", url: "", functions: [] },
      ],
    });
    const reads: string[] = [];
    const result = await parseV8(content, "v8.json", {
      sourceRoot: process.cwd(),
      readFile: async (filePath) => {
        reads.push(filePath);
        return source;
      },
    });
    expect(reads).toEqual([fileURLToPath(fileUrl), absolute]);
    expect(result).toHaveLength(2);
  });

  test("does not read a url outside the source root", async () => {
    const outside = path.resolve(process.cwd(), "..", "outside.ts");
    const content = JSON.stringify({
      result: [script(outside, "1"), script("../outside.ts", "2"), script("file:///tmp/a.ts", "3")],
    });
    const reads: string[] = [];
    const result = await parseV8(content, "v8.json", {
      sourceRoot: process.cwd(),
      readFile: async (filePath) => {
        reads.push(filePath);
        return source;
      },
    });
    expect(reads).toEqual([]);
    expect(result).toEqual([]);
  });

  test("throws CrapError when the file is not V8 coverage", async () => {
    await expect(parseV8("not json", "bad.json")).rejects.toThrow(CrapError);
    await expect(parseV8("{}", "bad.json")).rejects.toThrow(CrapError);
    await expect(parseV8(payloadWithRange(10, 0, -5), "bad.json")).rejects.toThrow(CrapError);
    await expect(parseV8(payloadWithRange(1.5, 2, 1), "bad.json")).rejects.toThrow(CrapError);
  });

  test("throws when an offset is past the end of the source", async () => {
    await expect(
      parseV8(payloadWithRange(0, 9999, 1), "bad.json", {
        readFile: async () => "hi\n",
      }),
    ).rejects.toThrow(CrapError);
  });

  test("does not read a symlink whose target is outside the source root", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "crap-v8-"));
    const outside = mkdtempSync(path.join(tmpdir(), "crap-v8-out-"));
    const secret = path.join(outside, "secret.ts");
    writeFileSync(secret, "export const x = 1;\n");
    mkdirSync(root, { recursive: true });
    const link = path.join(root, "link.ts");
    symlinkSync(secret, link);
    const reads: string[] = [];
    try {
      const result = await parseV8(payload(link), "v8.json", {
        sourceRoot: root,
        readFile: async (filePath) => {
          reads.push(filePath);
          return source;
        },
      });
      expect(reads).toEqual([]);
      expect(result).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("warns and skips a source file it cannot read", async () => {
    const warnings: string[] = [];
    const result = await parseV8(payload("missing-file.ts"), "v8.json", {
      warn: (msg) => warnings.push(msg),
    });
    expect(result).toEqual([]);
    expect(warnings[0]).toContain("cannot read source file");
  });
});
