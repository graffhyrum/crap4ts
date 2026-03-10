import { test, expect, describe } from "bun:test";
import { parseCli } from "./cli";
import { CrapError } from "./types";

describe("CLI parsing", () => {
  test("parses defaults with no args", () => {
    const config = parseCli(["node", "crap4ts"]);
    expect(config.coveragePath).toBe("./coverage/coverage-final.json");
    expect(config.threshold).toBe(30);
    expect(config.projectThreshold).toBe(5);
    expect(config.output).toBe("table");
    expect(config.sort).toBe("score");
    expect(config.onlyCrappy).toBe(false);
  });

  test("parses coverage path", () => {
    const config = parseCli(["node", "crap4ts", "-c", "my-cov.json"]);
    expect(config.coveragePath).toBe("my-cov.json");
  });

  test("parses format", () => {
    const config = parseCli(["node", "crap4ts", "-f", "lcov"]);
    expect(config.format).toBe("lcov");
  });

  test("throws on invalid format", () => {
    expect(() => parseCli(["node", "crap4ts", "-f", "bad"])).toThrow(CrapError);
  });

  test("throws on invalid output", () => {
    expect(() => parseCli(["node", "crap4ts", "-o", "bad"])).toThrow(CrapError);
  });

  test("throws on invalid sort", () => {
    expect(() => parseCli(["node", "crap4ts", "--sort", "bad"])).toThrow(CrapError);
  });

  test("throws on invalid threshold", () => {
    expect(() => parseCli(["node", "crap4ts", "-t", "abc"])).toThrow(CrapError);
  });

  test("parses positional files", () => {
    const config = parseCli(["node", "crap4ts", "a.ts", "b.ts"]);
    expect(config.files).toEqual(["a.ts", "b.ts"]);
  });

  test("parses only-crappy flag", () => {
    const config = parseCli(["node", "crap4ts", "--only-crappy"]);
    expect(config.onlyCrappy).toBe(true);
  });

  test("--init sets init to true", () => {
    const config = parseCli(["node", "crap4ts", "--init"]);
    expect(config.init).toBe(true);
  });

  test("no --init sets init to false", () => {
    const config = parseCli(["node", "crap4ts"]);
    expect(config.init).toBe(false);
  });
});
