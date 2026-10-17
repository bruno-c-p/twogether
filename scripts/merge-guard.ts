export type Gh = {
  head(pr: string): string | null;
  run(args: string[]): number;
};

const usage = "usage: bun run merge-guard <pr> [--dry-run]";

export function mergeGuard(argv: string[], gh: Gh): number {
  const [pr, ...flags] = argv;

  if (!pr || !/^\d+$/.test(pr) || flags.some((flag) => flag !== "--dry-run")) {
    console.error(usage);

    return 2;
  }

  const head = gh.head(pr);

  if (!head) return 1;

  const checks = gh.run([
    "pr",
    "checks",
    pr,
    "--watch",
    "--fail-fast",
    "--interval",
    "10",
  ]);

  if (checks !== 0) {
    console.error(
      `merge-guard: refusing to merge #${pr}: checks on ${head} are not green (gh pr checks exited ${checks})`,
    );

    return 1;
  }

  if (flags.includes("--dry-run")) {
    console.log(`merge-guard: #${pr} is green at ${head}, would merge`);

    return 0;
  }

  // --match-head-commit makes GitHub reject the merge if a new head landed after the checks passed.
  return gh.run(["pr", "merge", pr, "--squash", "--match-head-commit", head]);
}

if (import.meta.main) {
  const gh: Gh = {
    head(pr) {
      const view = Bun.spawnSync(
        ["gh", "pr", "view", pr, "--json", "headRefOid", "--jq", ".headRefOid"],
        { stderr: "inherit" },
      );

      return view.success ? view.stdout.toString().trim() : null;
    },
    run(args) {
      const result = Bun.spawnSync(["gh", ...args], {
        stdout: "inherit",
        stderr: "inherit",
      });

      // A signal-killed gh has no exit code; report it as a failure, never as 0.
      return result.success ? 0 : result.exitCode || 1;
    },
  };

  process.exit(mergeGuard(process.argv.slice(2), gh));
}
