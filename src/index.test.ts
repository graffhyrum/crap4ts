import { describe, expect, test } from "bun:test";

describe("CLI process exit", () => {
  test("unknown option exits 2", async () => {
    const proc = Bun.spawn([process.execPath, "src/index.ts", "--nope"], {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited).toBe(2);
    expect(stderr).toContain("Unknown option '--nope'");
    expect(stderr).not.toContain("ERR_PARSE_ARGS_UNKNOWN_OPTION");
  });

  test("missing option value exits 2", async () => {
    const proc = Bun.spawn([process.execPath, "src/index.ts", "-c"], {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited).toBe(2);
    expect(stderr).toContain("argument missing");
  });
});
