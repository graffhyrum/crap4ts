import fs from "fs";
import path from "path";
import { Glob } from "bun";
import type { Config, FileCoverage, FunctionCrap, FunctionInfo, ProjectSummary, SortField } from "./types";
import { CrapError } from "./types";
import { analyzeComplexity } from "./complexity/analyze";
import { parseCoverage } from "./coverage/resolve";
import { matchFunctions } from "./mapping/match";
import { summarize } from "./crap/score";
import { renderTable } from "./report/table";
import { renderJson } from "./report/json";
import { renderHtml } from "./report/html";

export async function runPipeline(config: Config): Promise<number> {
  const sourceFiles = await resolveSourceFiles(config);
  if (sourceFiles.length === 0) {
    console.error("No source files found.");
    return 2;
  }
  const functions = analyzeAllFiles(sourceFiles);
  const coverage = readAndParseCoverage(config);
  const matched = matchFunctions(functions, coverage, config.threshold);
  const sorted = sortFunctions(matched, config.sort);
  const filtered = config.onlyCrappy ? sorted.filter((f) => f.isCrappy) : sorted;
  const summary = summarize(filtered, config.projectThreshold);
  const output = renderOutput(summary, config);
  writeOutput(output, config);
  return summary.isFlagged ? 1 : 0;
}

async function resolveSourceFiles(config: Config): Promise<string[]> {
  if (config.files.length > 0) return resolveExplicitFiles(config.files);
  return resolveGlobFiles(config.include, config.exclude);
}

function resolveExplicitFiles(files: string[]): string[] {
  return files.map((f) => path.resolve(f)).filter((f) => fs.existsSync(f));
}

async function resolveGlobFiles(
  include: string,
  exclude: string
): Promise<string[]> {
  const includeGlob = new Glob(include);
  const excludeGlob = new Glob(exclude);
  const results: string[] = [];
  for await (const file of includeGlob.scan({ cwd: "." })) {
    if (!excludeGlob.match(file)) results.push(path.resolve(file));
  }
  return results;
}

function analyzeAllFiles(files: string[]): FunctionInfo[] {
  const results: FunctionInfo[] = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    results.push(...analyzeComplexity(content, filePath));
  }
  return results;
}

function readAndParseCoverage(config: Config): FileCoverage[] {
  const covPath = path.resolve(config.coveragePath);
  if (!fs.existsSync(covPath))
    throw new CrapError(`Coverage file not found: ${covPath}`);
  const content = fs.readFileSync(covPath, "utf-8");
  return parseCoverage(content, covPath, config.format);
}

function sortFunctions(
  functions: FunctionCrap[],
  sort: SortField
): FunctionCrap[] {
  const sorted = [...functions];
  sorted.sort(comparator(sort));
  return sorted;
}

function comparator(sort: SortField): (a: FunctionCrap, b: FunctionCrap) => number {
  switch (sort) {
    case "score":
      return (a, b) => b.crapScore - a.crapScore;
    case "name":
      return (a, b) => a.name.localeCompare(b.name);
    case "complexity":
      return (a, b) => b.complexity - a.complexity;
    case "coverage":
      return (a, b) => (a.coverage ?? -1) - (b.coverage ?? -1);
  }
}

function renderOutput(summary: ProjectSummary, config: Config): string {
  switch (config.output) {
    case "table":
      return renderTable(summary);
    case "json":
      return renderJson(summary);
    case "html":
      return renderHtml(summary);
  }
}

function writeOutput(output: string, config: Config): void {
  const dest = config.outputFile ?? defaultOutputFile(config);
  if (dest) {
    fs.writeFileSync(dest, output, "utf-8");
    console.log(`Report written to ${dest}`);
  } else {
    console.log(output);
  }
}

function defaultOutputFile(config: Config): string | undefined {
  if (config.output === "html") return "crap-report.html";
  return undefined;
}
