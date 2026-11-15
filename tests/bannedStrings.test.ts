import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BANNED_PATTERNS = [
  "Elena",
  "Sterling",
  "Laurent",
  "Vance",
  "Mansoor",
  "Von Berg",
  "Jenkins",
  "Math.random",
  "mockData",
  "INITIAL_",
];

function getAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (
      entry.isFile() &&
      /\.(ts|tsx|js|jsx|json|css|html)$/.test(entry.name)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

test("src/ directory contains zero banned strings (no fake names, no Math.random, no mockData, no INITIAL_)", () => {
  const srcDir = path.resolve(process.cwd(), "src");
  const files = getAllFiles(srcDir);
  assert.ok(files.length > 0, "src/ files should be found");

  const violations: { file: string; pattern: string; line: number; snippet: string }[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      for (const pattern of BANNED_PATTERNS) {
        if (lineText.includes(pattern)) {
          violations.push({
            file: path.relative(process.cwd(), file),
            pattern,
            line: i + 1,
            snippet: lineText.trim(),
          });
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found banned strings in src/:\n${violations
      .map((v) => `  ${v.file}:${v.line} [${v.pattern}] -> ${v.snippet}`)
      .join("\n")}`
  );
});
