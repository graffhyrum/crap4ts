import { join } from "node:path";
import { classify } from "./classify";
import type { GateConfig, ProjectSummary, TriageResult } from "./types";
import { isInsideRepo, parseGateConfig, parseProjectSummary } from "./types";

export type TriageFs = {
  exists: (path: string) => boolean | Promise<boolean>;
  readText: (path: string) => string | Promise<string>;
};

export async function runTriage(
  argv: string[],
  deps: { cwd: string; fs: TriageFs },
): Promise<{ result: TriageResult; exit: 0 | 2; message: string | null }> {
  const every = argv.includes("--every");
  const reportPath = join(deps.cwd, ".crap4ts", "report.json");
  const configPath = join(deps.cwd, ".crap4ts", "gate.json");

  const empty = (
    message: string,
  ): { result: TriageResult; exit: 2; message: string } => ({
    result: {
      version: 1,
      isFlagged: false,
      crappyPercent: 0,
      action: null,
      remaining: 0,
      report: reportPath,
    },
    exit: 2,
    message,
  });

  if (!(await deps.fs.exists(reportPath))) {
    return empty("report is missing");
  }

  if (!(await deps.fs.exists(configPath))) {
    return empty("gate config is missing");
  }

  let summary: ProjectSummary | null;
  try {
    summary = parseProjectSummary(JSON.parse(await deps.fs.readText(reportPath)));
  } catch {
    return empty("report is invalid");
  }
  if (summary === null) return empty("report is invalid");

  let config: GateConfig | null;
  try {
    config = parseGateConfig(JSON.parse(await deps.fs.readText(configPath)));
  } catch {
    return empty("gate config is invalid");
  }
  if (config === null) return empty("gate config is invalid");
  if (summary.isFlagged !== summary.crappyPercent > config.projectThreshold) {
    return empty("report is invalid");
  }

  const classified = classify(summary, config.threshold, every);
  const actions = classified.actions.filter((action) =>
    isInsideRepo(action.filePath, deps.cwd),
  );

  const action = actions[0] ?? null;
  const remaining = Math.max(0, actions.length - (action ? 1 : 0));

  return {
    result: {
      version: 1,
      isFlagged: classified.isFlagged,
      crappyPercent: classified.crappyPercent,
      action,
      remaining,
      report: reportPath,
    },
    exit: 0,
    message: null,
  };
}

const defaultFs: TriageFs = {
  exists: (path) => Bun.file(path).exists(),
  readText: (path) => Bun.file(path).text(),
};

async function main(): Promise<number> {
  try {
    const { result, exit, message } = await runTriage(process.argv.slice(2), {
      cwd: process.cwd(),
      fs: defaultFs,
    });
    if (message !== null) {
      console.error(message);
    }
    console.log(JSON.stringify(result));
    return exit;
  } catch (err) {
    console.error(err instanceof Error ? err.message : "triage failed");
    console.log(
      JSON.stringify({
        version: 1,
        isFlagged: false,
        crappyPercent: 0,
        action: null,
        remaining: 0,
        report: join(process.cwd(), ".crap4ts", "report.json"),
      } satisfies TriageResult),
    );
    return 2;
  }
}

if (import.meta.main) {
  process.exit(await main());
}
