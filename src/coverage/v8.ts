import { type } from "arktype";
import fs from "fs";
import path from "path";
import type { FileCoverage, StatementCoverage } from "../types";
import { CrapError } from "../types";
import { V8CoverageSchema } from "../schemas";

type V8Range = { startOffset: number; endOffset: number; count: number };
type V8Function = { functionName: string; ranges: V8Range[] };
type V8Script = { scriptId: string; url: string; functions: V8Function[] };

type V8Options = {
  sourceRoot?: string;
  readFile?: (filePath: string) => string | undefined;
  warn?: (msg: string) => void;
};

export function parseV8(
  content: string,
  filePath: string,
  options: V8Options = {},
): FileCoverage[] {
  const parsed = V8CoverageSchema(content);
  if (parsed instanceof type.errors)
    throw new CrapError(`Invalid coverage file: ${filePath}\n${parsed.summary}`);
  const sourceRoot = options.sourceRoot ?? process.cwd();
  const readFileFn = options.readFile ?? defaultReadFile(options.warn ?? console.warn);
  return convertScripts(parsed.result, sourceRoot, readFileFn);
}

function defaultReadFile(warn: (msg: string) => void) {
  return (filePath: string): string | undefined => {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      warn(`Warning: cannot read source file ${filePath}, skipping`);
      return undefined;
    }
  };
}

function convertScripts(
  scripts: V8Script[],
  sourceRoot: string,
  readFile: (filePath: string) => string | undefined,
): FileCoverage[] {
  const results: FileCoverage[] = [];
  for (const script of scripts) {
    const resolved = resolveUrl(script.url, sourceRoot);
    if (!resolved) continue;
    const sourceContent = readFile(resolved);
    if (!sourceContent) continue;
    const lineOffsets = buildLineOffsets(sourceContent);
    const statements = extractStatements(script.functions, lineOffsets);
    results.push({ filePath: resolved, statements });
  }
  return results;
}

function resolveUrl(url: string, sourceRoot: string): string | undefined {
  if (url.startsWith("file://")) return url.slice(7);
  if (path.isAbsolute(url)) return url;
  if (url && !url.includes("://")) return path.resolve(sourceRoot, url);
  return undefined;
}

function buildLineOffsets(source: string): number[] {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
}

function extractStatements(functions: V8Function[], lineOffsets: number[]): StatementCoverage[] {
  const statements: StatementCoverage[] = [];
  for (const fn of functions) {
    for (const range of fn.ranges) {
      statements.push(rangeToStatement(range, lineOffsets));
    }
  }
  return statements;
}

function rangeToStatement(range: V8Range, lineOffsets: number[]): StatementCoverage {
  return {
    startLine: offsetToLine(range.startOffset, lineOffsets),
    endLine: offsetToLine(range.endOffset, lineOffsets),
    hits: range.count,
  };
}

function offsetToLine(offset: number, lineOffsets: number[]): number {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineOffsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
