import { referenceFor, type ProjectSummary, type TriageAction } from "./types";

export type ClassifyResult = {
  isFlagged: boolean;
  crappyPercent: number;
  actions: TriageAction[];
};

export function classify(
  summary: ProjectSummary,
  threshold: number,
  every = false,
): ClassifyResult {
  const { isFlagged, crappyPercent } = summary;

  if (!every && !isFlagged) {
    return { isFlagged, crappyPercent, actions: [] };
  }

  const actions: TriageAction[] = [];
  for (const fn of summary.functions) {
    if (!fn.isCrappy) continue;

    const kind: TriageAction["kind"] =
      fn.coverage === null ? "fix-join" : fn.complexity >= threshold ? "split" : "test";
    const reference = referenceFor(kind);

    actions.push({
      kind,
      filePath: fn.filePath,
      startLine: fn.startLine,
      endLine: fn.endLine,
      name: fn.name,
      complexity: fn.complexity,
      coverage: fn.coverage,
      crapScore: fn.crapScore,
      reference,
    });
  }

  actions.sort((a, b) => {
    if (b.crapScore !== a.crapScore) return b.crapScore - a.crapScore;
    if (a.startLine !== b.startLine) return a.startLine - b.startLine;
    if (a.filePath !== b.filePath) return a.filePath < b.filePath ? -1 : 1;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return 0;
  });

  return { isFlagged, crappyPercent, actions };
}
