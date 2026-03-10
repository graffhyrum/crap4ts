import { test, expect, describe } from "bun:test";
import { parseCoverage } from "./resolve";
import fs from "fs";
import path from "path";

describe("coverage format detection", () => {
  test("detects istanbul from JSON content", () => {
    const content = fs.readFileSync(path.resolve("test/fixtures/coverage-istanbul.json"), "utf-8");
    const result = parseCoverage(content, "coverage-final.json", undefined);
    expect(result).toHaveLength(1);
  });

  test("detects lcov from .info extension", () => {
    const content = `SF:foo.ts\nDA:1,1\nend_of_record\n`;
    const result = parseCoverage(content, "coverage.info", undefined);
    expect(result).toHaveLength(1);
  });

  test("detects lcov from content", () => {
    const content = `SF:foo.ts\nDA:1,1\nend_of_record\n`;
    const result = parseCoverage(content, "coverage.txt", undefined);
    expect(result).toHaveLength(1);
  });

  test("respects explicit format override", () => {
    const content = fs.readFileSync(path.resolve("test/fixtures/coverage-istanbul.json"), "utf-8");
    const result = parseCoverage(content, "data.json", "istanbul");
    expect(result).toHaveLength(1);
  });
});
