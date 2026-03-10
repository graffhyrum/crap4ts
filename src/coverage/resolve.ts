import type { CoverageFormat, FileCoverage } from "../types";
import { parseIstanbul } from "./istanbul";
import { parseLcov } from "./lcov";
import { parseV8 } from "./v8";

export function parseCoverage(
  content: string,
  filePath: string,
  format: CoverageFormat | undefined,
  sourceRoot?: string,
): FileCoverage[] {
  const resolved = format ?? detectFormat(content, filePath);
  return dispatch(resolved, content, filePath, sourceRoot);
}

function dispatch(
  format: CoverageFormat,
  content: string,
  filePath: string,
  sourceRoot?: string,
): FileCoverage[] {
  switch (format) {
    case "istanbul":
      return parseIstanbul(content, filePath);
    case "lcov":
      return parseLcov(content);
    case "v8":
      return parseV8(content, filePath, { sourceRoot });
  }
}

function detectFormat(content: string, filePath: string): CoverageFormat {
  if (filePath.endsWith(".info") || isLcov(content)) return "lcov";
  if (isV8(content)) return "v8";
  return "istanbul";
}

function isLcov(content: string): boolean {
  return content.trimStart().startsWith("SF:") || content.includes("\nSF:");
}

function isV8(content: string): boolean {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("{")) return false;
  return trimmed.includes('"result"') && trimmed.includes('"scriptId"');
}
