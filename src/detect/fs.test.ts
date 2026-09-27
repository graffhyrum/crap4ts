import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { bunFileSystem } from "./fs";

describe("bunFileSystem", () => {
  test("reads a file and returns its canonical path", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "crap-fs-"));
    const file = path.join(dir, "a.ts");
    try {
      expect(await bunFileSystem.exists(file)).toBe(false);
      expect(await bunFileSystem.readText(file)).toBeNull();
      expect(await bunFileSystem.realPath(file)).toBe(file);
      await Bun.write(file, "export const n = 1;\n");
      expect(await bunFileSystem.exists(file)).toBe(true);
      expect(await bunFileSystem.readText(file)).toBe("export const n = 1;\n");
      expect(await bunFileSystem.realPath(file)).toBe(realpathSync(file));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
