/**
 * check-forbidden-literals.cjs
 *
 * Static code analysis gate (CI).
 * Scans application source files (outside config/seed/tests/fixtures) to ensure
 * forbidden hard-coded literals do not creep back in:
 * - Literals 20 as pagination limit / page size
 * - Hardcoded HTTP timeouts (15000)
 * - Hardcoded persona/scenario count literals
 */

const fs = require("fs");
const path = require("path");

const IGNORED_PATHS = [
  "node_modules",
  "dist",
  "release",
  "tmp-",
  "tests",
  "electron/config",
  "electron/seed",
  "docs",
  ".git",
];

function shouldScanFile(filePath) {
  if (IGNORED_PATHS.some((p) => filePath.includes(p))) return false;
  return /\.(ts|tsx|js|cjs|mjs)$/.test(filePath);
}

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_PATHS.some((p) => entry.name.includes(p))) {
        scanDir(fullPath, fileList);
      }
    } else if (shouldScanFile(fullPath)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const FORBIDDEN_PATTERNS = [
  {
    regex: /limit:\s*20\b/i,
    name: "Hardcoded page limit (limit: 20)",
  },
  {
    regex: /visibleFaceCount.*20\b/,
    name: "Hardcoded visible face count 20",
  },
  {
    regex: /TIMEOUT_MS\s*=\s*15000\b/,
    name: "Hardcoded timeout (TIMEOUT_MS = 15000)",
  },
  {
    regex: /Job Interviews|Sales Pitches & Client Calls|Presentations & Demos|High-Stakes Negotiation|Customer Service & Escalations|Hospitality & Service/,
    name: "Legacy non-canonical category strings (must use canonical InteractionTypes)",
  },
  {
    regex: /explore options|SLA commitments|terms and SLA/i,
    name: "Fabricated canned transcript strings (must never be present in application code)",
  },
  {
    regex: /tactical pause|pre-response reset|acknowledge the core concern/i,
    name: "Fabricated canned coaching strings (must never be present in application code)",
  },
];

function runCheck() {
  const root = process.cwd();
  const files = [...scanDir(path.join(root, "src")), ...scanDir(path.join(root, "electron"))];
  const violations = [];

  for (const file of files) {
    const relPath = path.relative(root, file);
    // Ignore seedConfig and test files
    if (relPath.includes("seedConfig") || relPath.includes("defaultSeedConfig")) continue;

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.regex.test(line)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            text: line.trim(),
            rule: pattern.name,
          });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error("❌ Forbidden literals check failed with violations:");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} - [${v.rule}] ${v.text}`);
    }
    process.exit(1);
  } else {
    console.log("✅ Forbidden literals static check passed: No forbidden literals found in source files.");
  }
}

runCheck();
