import { join } from "node:path";
import { clampText, isUnsafeText, parseTriageResult, type TriageResult } from "../scripts/types";
export type StopHookInput = {
  status: string;
  loop_count: number;
};
export type StopHookOutput = {
  followup_message?: string;
};
export type StopDeps = {
  gateConfigExists: boolean;
  gateScriptExists: boolean;
  triageScriptExists: boolean;
  runGate: () => Promise<{
    exit: 0 | 1 | 2;
    message?: string;
  }>;
  runTriage: () => Promise<{
    result: TriageResult;
    exit: 0 | 2;
    stderr?: string;
  }>;
};
if (import.meta.main) process.exit(await main(await Bun.stdin.text()));

export async function main(stdinText: string): Promise<number> {
  try {
    const rawInput: unknown = JSON.parse(stdinText);
    const input = parseStopInput(rawInput);
    const pluginRoot = process.env.CURSOR_PLUGIN_ROOT ?? join(import.meta.dir, "..");
    const cwd = process.cwd();
    const gateScript = join(pluginRoot, "scripts", "gate.ts");
    const triageScript = join(pluginRoot, "scripts", "triage.ts");
    const output = await decideStop(input, {
      gateConfigExists: await Bun.file(join(cwd, ".crap4ts", "gate.json")).exists(),
      gateScriptExists: await Bun.file(gateScript).exists(),
      triageScriptExists: await Bun.file(triageScript).exists(),
      runGate: () => runSpawnedGate(gateScript),
      runTriage: () => runSpawnedTriage(triageScript, cwd),
    });
    console.log(JSON.stringify(output));
    return 0;
  } catch {
    console.log(
      JSON.stringify({
        followup_message: "The crap4ts stop hook failed. Run the crap4ts-gate skill.",
      }),
    );
    return 0;
  }
}

export async function runSpawnedGate(scriptPath: string): Promise<{
  exit: 0 | 1 | 2;
  message?: string;
}> {
  const { exitCode, stdout } = await spawnScript(scriptPath);
  return parseGateStop(stdout, exitCode);
}

export async function runSpawnedTriage(
  scriptPath: string,
  cwd: string,
): Promise<{ result: TriageResult; exit: 0 | 2; stderr?: string }> {
  const { exitCode, stdout, stderr } = await spawnScript(scriptPath);
  if (exitCode !== 0) {
    return { result: emptyTriage(), exit: 2, stderr };
  }
  try {
    const rawTriage: unknown = JSON.parse(stdout);
    const result = parseTriageResult(rawTriage, cwd);
    if (result === null) return { result: emptyTriage(), exit: 2 };
    return { result, exit: 0 };
  } catch {
    return { result: emptyTriage(), exit: 2 };
  }
}
export function parseStopInput(raw: unknown): StopHookInput {
  if (typeof raw !== "object" || raw === null) throw new Error("bad stop input");
  const record = raw as Record<string, unknown>;
  if (typeof record.status !== "string" || badStatus(record.status)) {
    throw new Error("bad stop input");
  }
  if (
    typeof record.loop_count !== "number" ||
    !Number.isInteger(record.loop_count) ||
    record.loop_count < 0
  ) {
    throw new Error("bad stop input");
  }
  return {
    status: record.status.replaceAll("\u00a0", " ").trim().toLowerCase(),
    loop_count: record.loop_count,
  };
}
export async function decideStop(input: StopHookInput, deps: StopDeps): Promise<StopHookOutput> {
  if (!deps.gateConfigExists) return {};
  if (input.loop_count !== 0) return {};
  if (input.status !== "completed") return {};
  if (!deps.gateScriptExists || !deps.triageScriptExists) {
    return {
      followup_message: "The crap4ts scripts are missing. Run the crap4ts-bootstrap skill.",
    };
  }
  const gate = await deps.runGate();
  if (gate.exit === 0) return {};
  if (gate.exit === 2) {
    const detail = clampText(gate.message ?? "", "Fix the setup.");
    const shown = isUnsafeText(detail) ? "Fix the setup." : detail;
    return {
      followup_message: `The gate did not score the project. ${shown} Run the crap4ts-gate skill.`,
    };
  }
  const triage = await deps.runTriage();
  if (triage.exit !== 0) {
    const detail = clampText(triage.stderr ?? "", "Triage did not return an action.");
    const shown = isUnsafeText(detail) ? "Triage did not return an action." : detail;
    return {
      followup_message: `The gate flagged the project. ${shown} Run the crap4ts-gate skill.`,
    };
  }
  const action = triage.result.action;
  if (action === null) {
    return {
      followup_message: "The project is flagged. Triage named no in-repo function. Stop.",
    };
  }
  return {
    followup_message: "Run the crap4ts-triage skill before any edit.",
  };
}
async function spawnScript(scriptPath: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = Bun.spawn([process.execPath, "run", scriptPath], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}
function badStatus(status: string): boolean {
  if (status.length > 32) return true;
  return /[\u0000-\u001f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(status);
}
export function parseGateStop(
  stdout: string,
  exitCode: number,
): {
  exit: 0 | 1 | 2;
  message?: string;
} {
  const invalid = { exit: 2 as const, message: "gate did not return JSON" };
  try {
    const raw: unknown = JSON.parse(stdout);
    if (typeof raw !== "object" || raw === null) return invalid;
    const record = raw as Record<string, unknown>;
    if (record.version !== 1) return invalid;
    if (record.exit !== 0 && record.exit !== 1 && record.exit !== 2) return invalid;
    if (typeof record.message !== "string") return invalid;
    if (typeof record.isFlagged !== "boolean") return invalid;
    if (record.exit !== exitCode) {
      return { exit: 2, message: "gate process exit disagrees with the report" };
    }
    if ((record.exit === 0 && record.isFlagged) || (record.exit === 1 && !record.isFlagged)) {
      return { exit: 2, message: "gate report disagrees with its exit code" };
    }
    const message = isUnsafeText(record.message) ? "Fix the setup." : record.message;
    return { exit: record.exit, message };
  } catch {
    return invalid;
  }
}
function emptyTriage(): TriageResult {
  return {
    version: 1,
    isFlagged: false,
    crappyPercent: 0,
    action: null,
    remaining: 0,
    report: "",
  };
}
