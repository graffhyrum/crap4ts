import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { clampText, type BootstrapResult, type GateConfig } from "./types";

export type WhichFn = (command: string) => string | null;

export type FileReader = {
  exists: (path: string) => boolean;
  readText: (path: string) => string;
};

export type CommandRunner = (
  command: string,
  args: string[],
  cwd: string,
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

export type FileWriter = {
  writeText: (path: string, contents: string) => void;
  mkdirp: (path: string) => void;
  copyFile: (from: string, to: string) => void;
};

const INSTALL_MESSAGE = "bun add -d @graffhyrum/crap4ts";

const DEFAULT_GATE: GateConfig = {
  version: 1,
  coverageCommand: "bun test --coverage",
  crapArgs: ["-c", "coverage/lcov.info", "-f", "lcov"],
  threshold: 30,
  projectThreshold: 5,
};

export function hasGithubPackagesToken(npmrc: string): boolean {
  for (const line of npmrc.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;
    if (
      trimmed.includes("npm.pkg.github.com") &&
      /_authToken\s*=/.test(trimmed)
    ) {
      return true;
    }
  }
  return false;
}

export function planBootstrap(input: {
  bunPath: string | null;
  npmrcText: string | null;
  apply: boolean;
}): BootstrapResult {
  if (input.bunPath === null) {
    return {
      version: 1,
      code: "needs-bun",
      message: "bun is not on PATH",
      reference: null,
    };
  }

  if (input.npmrcText === null || !hasGithubPackagesToken(input.npmrcText)) {
    return {
      version: 1,
      code: "needs-token",
      message: "GitHub Packages auth token is missing from npmrc",
      reference: "github-packages.md",
    };
  }

  if (!input.apply) {
    return {
      version: 1,
      code: "ready",
      message: INSTALL_MESSAGE,
      reference: null,
    };
  }

  return {
    version: 1,
    code: "wrote-config",
    message: "installed crap4ts and wrote .crap4ts/gate.json",
    reference: null,
  };
}

export async function runBootstrap(
  argv: string[],
  deps: {
    which: WhichFn;
    reader: FileReader;
    runner: CommandRunner;
    writer: FileWriter;
    cwd: string;
    templatePath: string;
  },
): Promise<{ result: BootstrapResult; exit: 0 | 2 }> {
  const apply = argv.includes("--apply");
  const ci = argv.includes("--ci");
  const npmrcPath = join(homedir(), ".npmrc");

  const bunPath = deps.which("bun");
  let npmrcText: string | null = null;
  if (deps.reader.exists(npmrcPath)) {
    npmrcText = deps.reader.readText(npmrcPath);
  }

  const planned = planBootstrap({ bunPath, npmrcText, apply });

  if (planned.code === "needs-bun" || planned.code === "needs-token") {
    return { result: planned, exit: 2 };
  }

  if (apply && planned.code === "wrote-config") {
    try {
      const install = await deps.runner(
        "bun",
        ["add", "-d", "@graffhyrum/crap4ts"],
        deps.cwd,
      );
      if (install.exitCode !== 0) {
        return {
          result: {
            version: 1,
            code: "needs-runner",
            message: clampText(install.stderr, "bun add failed"),
            reference: null,
          },
          exit: 2,
        };
      }
      const init = await deps.runner("bunx", ["@graffhyrum/crap4ts", "--init"], deps.cwd);
      if (init.exitCode !== 0) {
        return {
          result: {
            version: 1,
            code: "needs-runner",
            message: clampText(init.stderr, "crap4ts --init failed"),
            reference: null,
          },
          exit: 2,
        };
      }
    } catch (err) {
      return {
        result: {
          version: 1,
          code: "needs-runner",
          message: err instanceof Error ? err.message : "runner failed",
          reference: null,
        },
        exit: 2,
      };
    }

    const gateDir = join(deps.cwd, ".crap4ts");
    deps.writer.mkdirp(gateDir);
    deps.writer.writeText(
      join(gateDir, "gate.json"),
      `${JSON.stringify(DEFAULT_GATE, null, 2)}\n`,
    );
  }

  if (ci) {
    const workflowDir = join(deps.cwd, ".github", "workflows");
    deps.writer.mkdirp(workflowDir);
    deps.writer.copyFile(
      deps.templatePath,
      join(workflowDir, "crap4ts.yml"),
    );
  }

  return { result: planned, exit: 0 };
}

const defaultReader: FileReader = {
  exists: (path) => existsSync(path),
  readText: (path) => readFileSync(path, "utf-8"),
};

const defaultWriter: FileWriter = {
  writeText: (path, contents) => writeFileSync(path, contents, "utf-8"),
  mkdirp: (path) => {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  },
  copyFile: (from, to) => {
    const dir = dirname(to);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(from, to);
  },
};

async function defaultRunner(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const argv =
    command === "bunx"
      ? [process.execPath, "x", ...args]
      : command === "bun"
        ? [process.execPath, ...args]
        : [command, ...args];
  const proc = Bun.spawn(argv, {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    cwd,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}

async function main(): Promise<number> {
  try {
    const { result, exit } = await runBootstrap(process.argv.slice(2), {
      which: (cmd) => Bun.which(cmd) ?? (cmd === "bun" ? process.execPath : null),
      reader: defaultReader,
      runner: defaultRunner,
      writer: defaultWriter,
      cwd: process.cwd(),
      templatePath: join(import.meta.dir, "..", "templates", "gate.yml"),
    });
    console.log(JSON.stringify(result));
    return exit;
  } catch (err) {
    const result: BootstrapResult = {
      version: 1,
      code: "needs-runner",
      message: err instanceof Error ? err.message : "bootstrap failed",
      reference: null,
    };
    console.log(JSON.stringify(result));
    return 2;
  }
}

if (import.meta.main) {
  process.exit(await main());
}
