#!/usr/bin/env bun
import { parseCli } from "./cli";
import { runPipeline } from "./pipeline";
import { CrapError } from "./types";

try {
  const config = parseCli(process.argv);
  const exitCode = await runPipeline(config);
  process.exit(exitCode);
} catch (error) {
  if (error instanceof CrapError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }
  throw error;
}
