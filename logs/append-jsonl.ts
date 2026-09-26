import { appendFileSync } from "node:fs";

const file = Bun.argv.includes("--file")
  ? Bun.argv[Bun.argv.indexOf("--file") + 1]
  : "logs/findings.jsonl";

const text = await Bun.stdin.text();
const line = text.trim();
if (line.length === 0) {
  throw new Error("empty jsonl record");
}
JSON.parse(line);
appendFileSync(file ?? "logs/findings.jsonl", `${line}\n`);
