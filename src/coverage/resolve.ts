import { type CoverageFormat, type FileCoverage } from "../types";
import { parseIstanbul } from "./istanbul";
import { parseLcov } from "./lcov";
import { parseV8 } from "./v8";

export async function parseCoverage(
  content: string,
  filePath: string,
  format: CoverageFormat | undefined,
  sourceRoot?: string,
): Promise<FileCoverage[]> {
  const resolved = format ?? detectFormat(content, filePath);
  return dispatch(resolved, content, filePath, sourceRoot);
}

const parsers = {
  istanbul: async (content: string, filePath: string) => parseIstanbul(content, filePath),
  lcov: async (content: string) => parseLcov(content),
  v8: (content: string, filePath: string, sourceRoot?: string) =>
    parseV8(content, filePath, { sourceRoot }),
} satisfies Record<
  CoverageFormat,
  (content: string, filePath: string, sourceRoot?: string) => Promise<FileCoverage[]>
>;

async function dispatch(
  format: CoverageFormat,
  content: string,
  filePath: string,
  sourceRoot?: string,
): Promise<FileCoverage[]> {
  return parsers[format](content, filePath, sourceRoot);
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
