import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .trim().split("\n").filter((file) => /\.(?:ts|mjs|js)$/.test(file));
let failed = false;
for (const file of files) {
  const source = await readFile(file, "utf8");
  if (/\t/.test(source) || / +$/m.test(source)) {
    console.error(`${file}: tabs or trailing whitespace are not allowed`);
    failed = true;
  }
  if (/\bany\b/.test(source) && file.endsWith(".ts")) {
    console.error(`${file}: avoid the any type`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`Linted ${files.length} source files.`);
