import { describe, expect, test } from "vitest";
import { invokesGhPrMerge } from "./merge-guard-hook";

describe("invokesGhPrMerge", () => {
  test.each([
    "gh pr merge 1",
    "gh pr merge 1 --squash --admin",
    "bun run test && gh pr merge 1 --squash",
    "gh pr checks 1 --watch && gh pr merge 1",
    "git push; gh pr merge 1",
    "false || gh pr merge 1",
    "gh pr view 1\ngh pr merge 1",
    "cd /repo && GH_TOKEN=x gh pr merge 1",
    "/opt/homebrew/bin/gh pr merge 1",
    "gh pr --repo bruno-c-p/twogether merge 1",
    "gh -R bruno-c-p/twogether pr merge 1",
    "(cd /repo && gh pr merge 1)",
    "echo $(gh pr merge 1)",
    'out="$(gh pr merge 1)"',
    "echo `gh pr merge 1`",
    "bash -c 'gh pr merge 1'",
    'sh -c "bun run lint && gh pr merge 1"',
    'eval "gh pr merge 1"',
  ])("blocks %j", (command) => {
    expect(invokesGhPrMerge(command)).toBe(true);
  });

  test.each([
    "bun run merge-guard 1",
    "bun run merge-guard 1 --dry-run",
    "gh pr view 1 --json mergeStateStatus",
    "gh pr checks 1 --watch --fail-fast",
    "gh pr list --search 'is:merged'",
    "git merge origin/main",
    "git commit -m 'block gh pr merge in the hook'",
    'gh pr create --body "Use bun run merge-guard, never gh pr merge"',
    "cat > notes.md <<'EOF'\ngh pr merge 1\nEOF\ngh pr view 1",
    "gh pr create --body \"$(cat <<'EOF'\nRun `bun run merge-guard <pr>`; gh pr merge is blocked.\nEOF\n)\"",
  ])("allows %j", (command) => {
    expect(invokesGhPrMerge(command)).toBe(false);
  });
});
