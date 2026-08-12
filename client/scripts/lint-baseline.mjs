/**
 * Lint baseline gate (ratchet).
 *
 * Runs ESLint over client/ and compares the error count against the number
 * frozen in .ci/lint-baseline.json.
 *
 *   errors >  baseline  → exit 1  (the debt grew)
 *   errors <= baseline  → exit 0  (and it tells you to lower the baseline)
 *
 * On ESLint's own exit code: ESLint exits 1 whenever any error exists, which
 * is true by definition while a baseline is in place. This script therefore
 * decides pass/fail from the parsed report instead of from that exit code.
 * That is not suppression — no rule is disabled and no violation is hidden;
 * the pass criterion is deliberately "debt did not grow" rather than "zero
 * errors". Every violation is still printed, and the count is reported to CI.
 *
 * This gate cannot see a swap (one old error fixed, one new one added — the
 * total is unchanged). That hole is closed by lint-changed.mjs, which requires
 * files touched by a PR to be clean.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.resolve(clientDir, '..', '.ci', 'lint-baseline.json');

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

const result = spawnSync(
  'npx',
  ['eslint', '.', '-f', 'json'],
  { cwd: clientDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

if (result.error) {
  console.error('Failed to run ESLint:', result.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  // ESLint crashed rather than reporting violations — surface its own output.
  console.error('ESLint did not produce a parsable JSON report.');
  console.error(result.stdout.slice(0, 4000));
  console.error(result.stderr.slice(0, 4000));
  process.exit(1);
}

let errors = 0;
let warnings = 0;
const byRule = new Map();

for (const file of report) {
  errors += file.errorCount;
  warnings += file.warningCount;
  for (const message of file.messages) {
    const rule = message.ruleId ?? '(unused-disable-directive)';
    const entry = byRule.get(rule) ?? { errors: 0, warnings: 0 };
    if (message.severity === 2) entry.errors += 1;
    else entry.warnings += 1;
    byRule.set(rule, entry);
  }
}

const ranked = [...byRule.entries()].sort(
  (a, b) => b[1].errors + b[1].warnings - (a[1].errors + a[1].warnings),
);

console.log('ESLint baseline gate');
console.log(`  files linted : ${report.length}`);
console.log(`  errors       : ${errors} (baseline ${baseline.errors})`);
console.log(`  warnings     : ${warnings} (baseline ${baseline.warnings}, not gated)`);
console.log('');
console.log('  by rule:');
for (const [rule, counts] of ranked) {
  console.log(`    ${rule.padEnd(46)} ${String(counts.errors).padStart(3)}e ${String(counts.warnings).padStart(3)}w`);
}
console.log('');

if (errors > baseline.errors) {
  console.error(
    `FAIL: error count grew by ${errors - baseline.errors} (${baseline.errors} → ${errors}).`,
  );
  console.error('Fix the new violations. Do not raise the baseline to make this pass.');
  process.exit(1);
}

if (errors < baseline.errors) {
  console.log(
    `Debt went down by ${baseline.errors - errors} (${baseline.errors} → ${errors}).`,
  );
  console.log(`Lower "errors" to ${errors} in .ci/lint-baseline.json in this same PR.`);
}

console.log('PASS: lint debt did not grow.');
process.exit(0);
