import { bunAdapter } from "./runners/bun";
import type { RunnerAdapter } from "./types";

const ADAPTERS: readonly RunnerAdapter[] = [bunAdapter];

export async function detectRunners(projectRoot: string): Promise<RunnerAdapter[]> {
  const results = await Promise.all(ADAPTERS.map((a) => a.detect(projectRoot)));
  return ADAPTERS.filter((_, i) => results[i]);
}
