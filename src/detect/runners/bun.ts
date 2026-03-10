import { readPackageJson, type PackageJson } from "../packageJson";
import type { FileSystem, RunnerAdapter } from "../types";

const bunFs: FileSystem = {
  exists: async (p) => Bun.file(p).exists(),
  readText: async (p) => {
    const f = Bun.file(p);
    return (await f.exists()) ? f.text() : null;
  },
};

export async function detect(root: string, fs: FileSystem = bunFs): Promise<boolean> {
  const results = await Promise.all([
    lockfileExists(root, fs),
    hasBunDep(root, fs),
    hasBunScript(root, fs),
  ]);
  return results.some(Boolean);
}

function lockfileExists(root: string, fs: FileSystem): Promise<boolean> {
  return Promise.all([fs.exists(`${root}/bun.lockb`), fs.exists(`${root}/bun.lock`)]).then((rs) =>
    rs.some(Boolean),
  );
}

async function hasBunDep(root: string, fs: FileSystem): Promise<boolean> {
  const pkg = await readPackageJson(root, fs);
  return isBunInDeps(pkg);
}

function isBunInDeps(pkg: PackageJson | null): boolean {
  if (!pkg) return false;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return "bun" in deps || "@types/bun" in deps;
}

async function hasBunScript(root: string, fs: FileSystem): Promise<boolean> {
  const pkg = await readPackageJson(root, fs);
  return hasBunTestScript(pkg);
}

function hasBunTestScript(pkg: PackageJson | null): boolean {
  if (!pkg) return false;
  return Object.values(pkg.scripts ?? {}).some((v) => v.includes("bun test"));
}

function getCoverageConfig() {
  return { path: "./coverage/lcov.info", format: "lcov" as const };
}

function generateConfig(): string {
  return `[test]\ncoverage = true\ncoverageReporter = ["lcov"]\ncoverageDir = "coverage"\n`;
}

function configFilename(): string {
  return "bunfig.toml";
}

function getSetupInstructions(): string[] {
  return [
    "Run: bun test (coverage config is in bunfig.toml)",
    "Then: crap4ts -c coverage/lcov.info -f lcov",
  ];
}

export const bunAdapter: RunnerAdapter = {
  name: "bun",
  detect: (root) => detect(root, bunFs),
  getCoverageConfig,
  generateConfig,
  configFilename,
  getSetupInstructions,
};
