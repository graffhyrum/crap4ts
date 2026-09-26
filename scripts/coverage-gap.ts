const proc = Bun.spawn(["bun", "test", "--coverage"], {
	stdout: "pipe",
	stderr: "pipe",
});
const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
const exitCode = await proc.exited;
const text = `${stdout}\n${stderr}`;

const row =
	/^\s*(.+?)\s+\|\s+(\d+\.\d+)\s+\|\s+(\d+\.\d+)\s+\|/gm;
const failing: string[] = [];
let allFiles = "";

for (const match of text.matchAll(row)) {
	const file = match[1].trim();
	const funcs = Number(match[2]);
	const lines = Number(match[3]);
	if (file === "File" || file.startsWith("-")) continue;
	if (file === "All files") {
		allFiles = `all funcs=${funcs.toFixed(2)} lines=${lines.toFixed(2)}`;
		continue;
	}
	if (funcs < 95 || lines < 95) {
		failing.push(
			`${file} funcs=${funcs.toFixed(2)} lines=${lines.toFixed(2)}`,
		);
	}
}

console.log(allFiles);
console.log(`failing_files=${failing.length}`);
for (const line of failing) console.log(line);
console.log(`test_exit=${exitCode}`);
process.exit(failing.length === 0 && exitCode === 0 ? 0 : 1);
