import { test, expect, describe } from "bun:test";
import { parseCoverage } from "./resolve";
import fs from "fs";
import path from "path";

describe("coverage format detection", () => {
  test("detects istanbul from JSON content", async () => {
    const content = fs.readFileSync(path.resolve("test/fixtures/coverage-istanbul.json"), "utf-8");
    const result = await parseCoverage(content, "coverage-final.json", undefined);
    expect(result).toHaveLength(1);
  });

  test("detects lcov from .info extension", async () => {
    const content = `SF:foo.ts\nDA:1,1\nend_of_record\n`;
    const result = await parseCoverage(content, "coverage.info", undefined);
    expect(result).toHaveLength(1);
  });

  test("detects lcov from content", async () => {
    const content = `SF:foo.ts\nDA:1,1\nend_of_record\n`;
    const result = await parseCoverage(content, "coverage.txt", undefined);
    expect(result).toHaveLength(1);
  });

  test("respects explicit format override", async () => {
    const content = fs.readFileSync(path.resolve("test/fixtures/coverage-istanbul.json"), "utf-8");
    const result = await parseCoverage(content, "data.json", "istanbul");
    expect(result).toHaveLength(1);
  });
});
