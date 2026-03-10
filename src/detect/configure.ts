import path from "node:path";
import type { FileSystem, RunnerAdapter } from "./types";

type WriteFile = (path: string, content: string) => Promise<unknown>;

const defaultFs: FileSystem = {
  exists: async (p) => Bun.file(p).exists(),
  readText: async (p) => {
    const f = Bun.file(p);
    return (await f.exists()) ? f.text() : null;
  },
};

export async function configureRunner(
  adapter: RunnerAdapter,
  projectRoot: string,
  write: WriteFile = Bun.write,
  fs: FileSystem = defaultFs,
): Promise<void> {
  const dest = path.join(projectRoot, adapter.configFilename());
  if (await fileExists(dest, fs)) return;
  await writeConfigFile(adapter, dest, write);
  printInstructions(adapter);
}

async function fileExists(dest: string, fs: FileSystem): Promise<boolean> {
  const exists = await fs.exists(dest);
  if (exists) console.warn(`Skipping: ${dest} already exists`);
  return exists;
}

async function writeConfigFile(
  adapter: RunnerAdapter,
  dest: string,
  write: WriteFile,
): Promise<void> {
  await write(dest, adapter.generateConfig());
  console.log(`Written: ${dest}`);
}

function printInstructions(adapter: RunnerAdapter): void {
  console.log(`\nNext steps for ${adapter.name}:`);
  for (const instruction of adapter.getSetupInstructions()) {
    console.log(instruction);
  }
}
