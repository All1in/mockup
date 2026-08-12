/**
 * Lint gate for changed files.
 *
 * Lints only the client/ files a branch actually touches, and fails on any
 * error. The rule it enforces is "do not leave a file dirtier than you found
 * it" — which is what the baseline ratchet alone cannot enforce, because a
 * ratchet on a total count is blind to a swap (fix one old error, add one new
 * one, total unchanged).
 *
 * Base ref comes from BASE_REF (CI sets it to the PR target branch);
 * defaults to origin/momot-main locally — that is the integration branch, not
 * `main`. Diffing against the wrong base silently changes which files count as
 * "changed", so this default has to track wherever PRs actually land.
 *
 * A branch that touches no lintable client file passes trivially — that is
 * correct, not a gap: the baseline gate still runs over the whole project.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(clientDir, '..');
const baseRef = process.env.BASE_REF || 'origin/momot-main';

const LINTABLE = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function git(args) {
  const out = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (out.status !== 0) {
    console.error(`git ${args.join(' ')} failed:\n${out.stderr}`);
    process.exit(1);
  }
  return out.stdout;
}

// Three-dot: changes introduced by this branch, ignoring what landed on the
// base branch meanwhile. Without it, every commit merged into the base branch
// after the branch point would be attributed to this PR.
const changed = git(['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`])
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => file.startsWith('client/'))
  .filter((file) => LINTABLE.has(path.extname(file)))
  // Deleted-then-restored paths and renames can list files that are gone.
  .filter((file) => existsSync(path.join(repoRoot, file)))
  .map((file) => path.relative(clientDir, path.join(repoRoot, file)));

console.log(`Lint gate for changed files (base: ${baseRef})`);

if (changed.length === 0) {
  console.log('  no lintable client files changed — nothing to check.');
  process.exit(0);
}

console.log(`  ${changed.length} file(s):`);
for (const file of changed) console.log(`    ${file}`);
console.log('');

// --max-warnings=-1 keeps warnings visible without failing on them; errors
// still set a non-zero exit code, which is exactly the gate we want here.
const result = spawnSync('npx', ['eslint', '--max-warnings=-1', ...changed], {
  cwd: clientDir,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('');
  console.error('FAIL: files changed by this branch contain ESLint errors.');
  console.error('These are new or touched lines — fix them here rather than adding to the baseline.');
  process.exit(1);
}

console.log('PASS: all changed files are clean.');
process.exit(0);
