import { describe, expect, test, vi } from "vitest";
import { type Gh, mergeGuard } from "./merge-guard";

const sha = "6808f91afb66b3a84cc9c6c0cdd94f24b3f1772f";

function fakeGh(checksExit: number, head: string | null = sha) {
  const calls: string[][] = [];

  const gh: Gh = {
    head: () => head,
    run(args) {
      calls.push(args);

      return args[1] === "checks" ? checksExit : 0;
    },
  };

  return { gh, merges: () => calls.filter((args) => args[1] === "merge") };
}

describe("mergeGuard", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);

  test.each([1, 8])("refuses without merging when checks exit %i", (code) => {
    const { gh, merges } = fakeGh(code);

    expect(mergeGuard(["110"], gh)).toBe(1);
    expect(merges()).toEqual([]);
  });

  test("squash-merges the checked head once checks are green", () => {
    const { gh, merges } = fakeGh(0);

    expect(mergeGuard(["110"], gh)).toBe(0);
    expect(merges()).toEqual([
      ["pr", "merge", "110", "--squash", "--match-head-commit", sha],
    ]);
  });

  test("dry run reports green without merging", () => {
    const { gh, merges } = fakeGh(0);

    expect(mergeGuard(["110", "--dry-run"], gh)).toBe(0);
    expect(merges()).toEqual([]);
  });

  test("stops when the head cannot be read", () => {
    const { gh, merges } = fakeGh(0, null);

    expect(mergeGuard(["110"], gh)).toBe(1);
    expect(merges()).toEqual([]);
  });

  test.each([[[]], [["abc"]], [["110", "--admin"]]])(
    "rejects bad arguments %j",
    (argv) => {
      const { gh, merges } = fakeGh(0);

      expect(mergeGuard(argv, gh)).toBe(2);
      expect(merges()).toEqual([]);
    },
  );
});
