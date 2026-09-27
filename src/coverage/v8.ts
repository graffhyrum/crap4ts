import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type } from "arktype";
import path from "path";
import type { FileCoverage, StatementCoverage } from "../types";
import { CrapError } from "../types";
import { V8CoverageSchema, V8FunctionSchema, V8RangeSchema, V8ScriptSchema } from "../schemas";

type V8Range = typeof V8RangeSchema.infer;
type V8Function = typeof V8FunctionSchema.infer;
type V8Script = typeof V8ScriptSchema.infer;

type V8Options = {
  sourceRoot?: string;
  readFile?: (filePath: string) => Promise<string | undefined>;
  warn?: (msg: string) => void;
};

export async function parseV8(
  content: string,
  filePath: string,
  options: V8Options = {},
): Promise<FileCoverage[]> {
  const parsed = V8CoverageSchema(content);
  if (parsed instanceof type.errors)
    throw new CrapError(`Invalid coverage file: ${filePath}\n${parsed.summary}`);
  const sourceRoot = options.sourceRoot ?? process.cwd();
  const readFileFn = options.readFile ?? defaultReadFile(options.warn ?? console.warn);
  return convertScripts(parsed.result, sourceRoot, readFileFn);
}

function defaultReadFile(warn: (msg: string) => void) {
  return async (filePath: string): Promise<string | undefined> => {
    try {
      return await Bun.file(filePath).text();
    } catch {
      warn(`Warning: cannot read source file ${filePath}, skipping`);
      return undefined;
    }
  };
}

async function convertScripts(
  scripts: V8Script[],
  sourceRoot: string,
  readFile: (filePath: string) => Promise<string | undefined>,
): Promise<FileCoverage[]> {
  const results: FileCoverage[] = [];
  for (const script of scripts) {
    const resolved = resolveUrl(script.url, sourceRoot);
    if (!resolved) continue;
    const sourceContent = await readFile(resolved);
    if (!sourceContent) continue;
    if (offsetPastEnd(script.functions, sourceContent.length)) {
      throw new CrapError(`Invalid coverage file: offset past end of ${resolved}`);
    }
    const lineOffsets = buildLineOffsets(sourceContent);
    const statements = extractStatements(script.functions, lineOffsets);
    results.push({ filePath: resolved, statements });
  }
  return results;
}

function resolveUrl(url: string, sourceRoot: string): string | undefined {
  const resolved = pathFromCoverageUrl(url, sourceRoot);
  if (resolved === undefined) return undefined;
  if (!isInsideRoot(resolved, sourceRoot)) return undefined;
  return resolved;
}

function pathFromCoverageUrl(url: string, sourceRoot: string): string | undefined {
  if (url.startsWith("file://")) return fileUrlPath(url);
  if (path.isAbsolute(url)) return url;
  if (url !== "" && !url.includes("://")) return path.resolve(sourceRoot, url);
  return undefined;
}

function fileUrlPath(url: string): string | undefined {
  try {
    return fileURLToPath(url);
  } catch {
    return undefined;
  }
}

function isInsideRoot(filePath: string, sourceRoot: string): boolean {
  const rel = path.relative(
    canonicalize(path.resolve(sourceRoot)),
    canonicalize(path.resolve(filePath)),
  );
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function canonicalize(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return filePath;
  }
}

function offsetPastEnd(functions: V8Function[], sourceLength: number): boolean {
  for (const fn of functions) {
    for (const range of fn.ranges) {
      if (range.endOffset > sourceLength) return true;
    }
  }
  return false;
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
