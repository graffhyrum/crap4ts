#!/usr/bin/env bun
import { parseCli } from "./cli";
import { runInit } from "./detect/init";
import { runPipeline } from "./pipeline";
import { CrapError } from "./types";

try {
  const config = parseCli(process.argv);
  const exitCode = config.init ? await runInit(process.cwd()) : await runPipeline(config);
  process.exit(exitCode);
} catch (error) {
  if (error instanceof CrapError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }
  if (isParseArgsError(error)) {
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

function isParseArgsError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("ERR_PARSE_ARGS_")
  );
}
