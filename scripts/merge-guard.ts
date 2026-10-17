const usage = "usage: bun run merge-guard <pr> [--dry-run]";

const [pr, ...flags] = process.argv.slice(2);

const dryRun = flags.includes("--dry-run");

if (!pr || !/^\d+$/.test(pr) || flags.some((flag) => flag !== "--dry-run")) {
  console.error(usage);
  process.exit(2);
}

function gh(args: string[]) {
  return Bun.spawnSync(["gh", ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });
}

const view = Bun.spawnSync(
  ["gh", "pr", "view", pr, "--json", "headRefOid", "--jq", ".headRefOid"],
  { stderr: "inherit" },
);

if (!view.success) process.exit(1);

const head = view.stdout.toString().trim();

const checks = gh([
  "pr",
  "checks",
  pr,
  "--watch",
  "--fail-fast",
  "--interval",
  "10",
]);

if (checks.exitCode !== 0) {
  console.error(
    `merge-guard: refusing to merge #${pr}: checks on ${head} are not green (gh pr checks exited ${checks.exitCode})`,
  );
  process.exit(1);
}

if (dryRun) {
  console.log(`merge-guard: #${pr} is green at ${head}, would merge`);
  process.exit(0);
}

// --match-head-commit makes GitHub reject the merge if a new head landed after the checks passed.
const merge = gh(["pr", "merge", pr, "--squash", "--match-head-commit", head]);

process.exit(merge.exitCode);
