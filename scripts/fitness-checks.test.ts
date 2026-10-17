import { describe, expect, test } from "vitest";
import {
  BOUNDARY_BASELINE,
  boundaryBaselineGrowth,
  boundaryBaselineScope,
  cacheControlSource,
  componentModuleLayout,
  cssHouseStyle,
  headerCheckFailure,
  headerFailures,
  noApiRouteFiles,
  noCommandBusSource,
  noGithubMedia,
  sourceChecks,
  unoWiring,
  waitForHeader,
  type Git,
  type Repo,
} from "./fitness-checks";
import {
  conflictingBoxUtilities,
  mobileNavToken,
  noNewArbitraryPx,
  PX_BASELINE,
} from "./fitness-styles";

const healthyFiles = {
  "package.json": JSON.stringify({ devDependencies: { unocss: "1" } }),
  "uno.config.ts": "export default { theme: { font: {} } }",
  "src/routes/__root.tsx": 'import "virtual:uno.css";',
  "src/start.ts": "createCsrfMiddleware(); 'private, no-store'",
  "src/ui/button/button.module.css": ".root {}",
  "src/ui/button/button.tsx": "export {}",
  "src/features/budget/actions/save.ts": "export const save = 1;",
  "src/features/budget/components/workspace-navigation.tsx":
    '<nav className="h-mobile-nav" />',
  "src/features/budget/components/workspace-shell.tsx":
    '<div className="max-bp1000:pb-mobile-nav" />',
  "src/components/ui/toaster.tsx":
    '<div className="[--c:var(--mobile-nav-height)]" />',
  [BOUNDARY_BASELINE]: JSON.stringify({
    kind: "dead-code",
    unused_exports: [],
    boundary_violations: ["src/lib/a.ts->src/features/b/c.ts"],
  }),
};

function repoWith(files: Record<string, string>): Repo {
  const paths = Object.keys(files);

  return {
    tracked: (patterns) =>
      patterns.length === 0
        ? paths
        : paths.filter((file) =>
            patterns.some((pattern) =>
              pattern.startsWith("*")
                ? file.endsWith(pattern.slice(1))
                : file === pattern || file.startsWith(`${pattern}/`),
            ),
          ),
    read: (file) => files[file] ?? "",
    exists: (file) => file in files,
  };
}

describe("fitness source checks", () => {
  test("a healthy repository passes every check", () => {
    expect(sourceChecks(repoWith(healthyFiles))).toEqual([]);
  });

  test("flags media under .github", () => {
    expect(
      noGithubMedia(repoWith({ ".github/shot.png": "", ".github/ci.yml": "" })),
    ).toEqual(["image/video files under .github/:\n.github/shot.png"]);
  });

  test("CSS modules must sit in a folder named after them with a component", () => {
    expect(
      componentModuleLayout(
        repoWith({
          "src/a/card.module.css": "",
          "src/b/row/row.module.css": "",
        }),
      ),
    ).toEqual([
      "src/a/card.module.css must live in a folder named card",
      "src/b/row/row.module.css has no sibling row.tsx in row/",
    ]);
  });

  test("API routes and api.server files are not allowed", () => {
    expect(
      noApiRouteFiles([
        "src/routes/api/budget.ts",
        "src/x/api.server.ts",
        "src/ok.ts",
      ]),
    ).toEqual([
      "tracked API route src/routes/api/budget.ts",
      "tracked src/x/api.server.ts",
    ]);
  });

  test("retired command-bus markers and action discriminators fail", () => {
    const failures = noCommandBusSource(
      "src/features/budget/actions/save.ts",
      `fetch("/api/budget"); createAPIFileRoute; mutateBudget(); ({ action: "save" })`,
    );

    expect(failures).toEqual([
      "src/features/budget/actions/save.ts mentions /api/budget",
      "src/features/budget/actions/save.ts mentions createAPIFileRoute",
      "src/features/budget/actions/save.ts still has mutateBudget",
      "src/features/budget/actions/save.ts still uses an action discriminator in a server fn",
    ]);
    expect(noCommandBusSource("src/x.test.ts", `({ action: "save" })`)).toEqual(
      [],
    );
  });

  test("start.ts must keep CSRF and the private Cache-Control", () => {
    expect(cacheControlSource(repoWith({}))).toEqual([
      "src/start.ts is required for CSRF and Cache-Control middleware",
    ]);
    expect(cacheControlSource(repoWith({ "src/start.ts": "" }))).toEqual([
      "src/start.ts must keep createCsrfMiddleware",
      "src/start.ts must set Cache-Control: private, no-store",
    ]);
  });

  test("CSS house style bans utility kits, gradients and resurrected files", () => {
    const failures = cssHouseStyle(
      repoWith({
        "package.json": JSON.stringify({
          dependencies: { tailwindcss: "4", "@radix-ui/react-dialog": "1" },
        }),
        "src/ui.module.css": "",
        "src/a.css": "body { background: linear-gradient(red, blue) }",
      }),
    );

    expect(failures).toEqual([
      "package.json must not depend on tailwindcss",
      "package.json must not depend on @radix-ui/react-dialog",
      "package.json must depend on unocss",
      "tracked resurrected src/ui.module.css",
      "src/a.css still uses a CSS gradient or --page-glow",
    ]);
  });

  test("UnoCSS must be configured with theme.font and imported by the root", () => {
    expect(unoWiring(repoWith({}))).toEqual([
      "uno.config.ts is required for the styling system",
    ]);
    expect(
      unoWiring(repoWith({ "uno.config.ts": "theme: { fontFamily: {} }" })),
    ).toEqual([
      "uno.config.ts must set theme.font; preset-wind4 ignores fontFamily",
      "src/routes/__root.tsx must import virtual:uno.css",
    ]);
  });

  test("the boundary baseline may only grandfather boundary violations", () => {
    const baseline = JSON.stringify({
      kind: "dead-code",
      unused_exports: [{ path: "src/a.ts", export_name: "a" }],
      boundary_violations: ["src/lib/a.ts->src/features/b/c.ts"],
    });

    expect(
      boundaryBaselineScope(repoWith({ [BOUNDARY_BASELINE]: baseline })),
    ).toEqual([
      `${BOUNDARY_BASELINE} grandfathers 1 unused_exports; it may only hold boundary_violations. Fix those findings and drop them from the file.`,
    ]);
  });
});

function baselineWith(entries: string[]) {
  return JSON.stringify({ kind: "dead-code", boundary_violations: entries });
}

function gitWith(answers: Record<string, string>): Git {
  return (args) => {
    const answer = answers[args.join(" ")];

    if (answer === undefined) throw new Error(`git ${args.join(" ")} failed`);

    return answer;
  };
}

describe("boundary baseline ratchet", () => {
  const base = {
    "merge-base HEAD origin/main": "abc123",
    "rev-parse --verify --quiet abc123^{commit}": "abc123",
    [`cat-file -e abc123:${BOUNDARY_BASELINE}`]: "",
    [`show abc123:${BOUNDARY_BASELINE}`]: baselineWith(["a->b", "c->d"]),
  };

  const warnings: string[] = [];
  const warn = (message: string) => warnings.push(message);

  test("a baseline that shrinks or holds passes", () => {
    for (const entries of [["a->b"], ["a->b", "c->d"]])
      expect(
        boundaryBaselineGrowth(
          repoWith({ [BOUNDARY_BASELINE]: baselineWith(entries) }),
          gitWith(base),
          warn,
        ),
      ).toEqual([]);
  });

  test("a re-saved baseline with more entries fails and names them", () => {
    const grown = repoWith({
      [BOUNDARY_BASELINE]: baselineWith(["a->b", "c->d", "e->f"]),
    });

    expect(boundaryBaselineGrowth(grown, gitWith(base), warn)).toEqual([
      `${BOUNDARY_BASELINE} grew from 2 to 3 entries since abc123; it may only shrink. Fix the new boundary violation instead of re-saving the baseline:\ne->f`,
    ]);
  });

  test("without a merge-base it warns and compares against the origin/main tip", () => {
    warnings.length = 0;

    const tip = gitWith({
      "rev-parse --verify --quiet origin/main^{commit}": "abc123",
      [`cat-file -e origin/main:${BOUNDARY_BASELINE}`]: "",
      [`show origin/main:${BOUNDARY_BASELINE}`]: baselineWith(["a->b"]),
    });

    const grown = repoWith({
      [BOUNDARY_BASELINE]: baselineWith(["a->b", "e->f"]),
    });

    expect(boundaryBaselineGrowth(grown, tip, warn)).toHaveLength(1);
    expect(warnings).toEqual([
      "boundary ratchet: no merge-base with origin/main (shallow clone?); comparing against the origin/main tip instead",
    ]);
  });

  test("an unresolvable origin/main fails instead of passing silently", () => {
    expect(
      boundaryBaselineGrowth(
        repoWith({ [BOUNDARY_BASELINE]: baselineWith([]) }),
        gitWith({}),
        warn,
      ),
    ).toEqual([
      `cannot resolve origin/main to check that ${BOUNDARY_BASELINE} only shrinks; run git fetch origin main (CI needs fetch-depth: 0)`,
    ]);
  });
});

describe("fitness header checks", () => {
  test("only private, no-store passes", () => {
    expect(headerFailures("private, no-store")).toEqual([]);
    expect(headerFailures("public")).toEqual([
      'GET / Cache-Control is "public", expected private, no-store',
    ]);
  });

  test("waitForHeader retries until the server answers", async () => {
    let attempts = 0;
    let clock = 0;

    const header = await waitForHeader("http://x/", 1_000, {
      fetch: () => {
        attempts += 1;

        if (attempts < 3) return Promise.reject(new Error("ECONNREFUSED"));

        return Promise.resolve({
          headers: { get: () => "private, no-store" },
        });
      },
      sleep: (ms) => {
        clock += ms;

        return Promise.resolve();
      },
      now: () => clock,
    });

    expect(header).toBe("private, no-store");
    expect(attempts).toBe(3);
  });

  test("waitForHeader gives up with the last error after the deadline", async () => {
    let clock = 0;

    await expect(
      waitForHeader("http://x/", 300, {
        fetch: () => Promise.reject(new Error("ECONNREFUSED")),
        sleep: (ms) => {
          clock += ms;

          return Promise.resolve();
        },
        now: () => clock,
      }),
    ).rejects.toThrow("server at http://x/ did not respond: ECONNREFUSED");
  });

  test("failures include the server output when there is some", () => {
    expect(headerCheckFailure(new Error("timeout"), "")).toBe("timeout");
    expect(headerCheckFailure("boom", "log line")).toBe("boom\nlog line");
  });
});

describe("fitness style checks", () => {
  const spacer = "src/features/budget/components/workspace-shell.tsx";

  const generic =
    "use a theme utility (spacing p-4 = 16px, text-sm, rounded-md, bp* breakpoints) or add a named token to uno.config.ts";

  const grandfathered = `Existing values are grandfathered in ${PX_BASELINE}; do not add to it.`;

  const conflict =
    "on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)";

  test("a new arbitrary px value fails and names the utility to use", () => {
    expect(
      noNewArbitraryPx(
        repoWith({
          [spacer]: 'const a = <div className="max-bp1000:pb-[77px]" />;',
          "src/a.tsx": 'cx("w-[32px]", "text-[13px]", "[--size:40px]")',
          "src/b.tsx": 'cx("w-32px p-13px !-mt-8px")',
        }),
      ),
    ).toEqual([
      `${spacer}:1 adds arbitrary px value max-bp1000:pb-[77px]; ${generic}. ${grandfathered}`,
      `src/a.tsx:1 adds arbitrary px value w-[32px]; use w-8 (spacing is 4px per step). ${grandfathered}`,
      `src/a.tsx:1 adds arbitrary px value text-[13px]; use text-sm. ${grandfathered}`,
      `src/a.tsx:1 adds arbitrary px value [--size:40px]; ${generic}. ${grandfathered}`,
      `src/b.tsx:1 adds arbitrary px value w-32px; use w-8 (spacing is 4px per step). ${grandfathered}`,
      `src/b.tsx:1 adds arbitrary px value p-13px; ${generic}. ${grandfathered}`,
      `src/b.tsx:1 adds arbitrary px value !-mt-8px; use -mt-2 (spacing is 4px per step). ${grandfathered}`,
    ]);
  });

  test("prose that mentions px is not a class", () => {
    expect(
      noNewArbitraryPx(
        repoWith({ "src/a.tsx": 'toast("Valor [10px] inválido, use 12px");' }),
      ),
    ).toEqual([]);
  });

  test("the baseline allows its recorded count and only shrinks", () => {
    const repo = repoWith({
      [PX_BASELINE]:
        "src/a.tsx\th-[8px]\nsrc/a.tsx\th-[8px]\nsrc/gone.tsx\tw-[3px]\n",
      "src/a.tsx": 'cx("h-[8px] w-[min(10em,100%)]");',
    });

    expect(noNewArbitraryPx(repo)).toEqual([
      `${PX_BASELINE} lists src/a.tsx h-[8px] 1 more time(s) than the code uses it; delete those lines so the value cannot come back`,
      `${PX_BASELINE} lists src/gone.tsx w-[3px] 1 more time(s) than the code uses it; delete those lines so the value cannot come back`,
    ]);
  });

  test("a shorthand and a side on one element conflict", () => {
    expect(
      conflictingBoxUtilities(
        "src/a.tsx",
        [
          '<p className="m-0 mt-2" />;',
          '<button className="py-2 p-0" />;',
          '<p className="pt-2 pt-3" />;',
          '<p className="mt-2 mb-4 px-0 py-2 p-4 max-bp620:p-2" />;',
          'cx("p-4", "pt-2");',
          "<p className={`p-4 ${x} pt-2`} />;",
          '<p className="!p-4 pt-2" />;',
          'cx("m-0", cond ? "mt-1" : "mt-2");',
        ].join("\n"),
      ),
    ).toEqual([
      `src/a.tsx:1 sets m-0 and mt-2 ${conflict}`,
      `src/a.tsx:2 sets py-2 and p-0 ${conflict}`,
      `src/a.tsx:3 sets pt-2 and pt-3 ${conflict}`,
      `src/a.tsx:4 sets px-0 and p-4 ${conflict}`,
      `src/a.tsx:5 sets p-4 and pt-2 ${conflict}`,
      `src/a.tsx:6 sets p-4 and pt-2 ${conflict}`,
      `src/a.tsx:7 sets !p-4 and pt-2 ${conflict}`,
      `src/a.tsx:8 sets m-0 and mt-1 ${conflict}`,
      `src/a.tsx:8 sets m-0 and mt-2 ${conflict}`,
    ]);
  });

  test("separate elements and opposite ternary branches do not conflict", () => {
    expect(
      conflictingBoxUtilities(
        "src/a.tsx",
        [
          '<p className="m-0" />; <p className="mt-2" />;',
          'cx(cond ? "p-0" : "pt-2", "max-bp620:p-2");',
          'const shared = "m-0"; const other = "mt-2";',
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  test("the nav spacer must derive from the nav height token in a class", () => {
    const missing = `${spacer} must use pb-mobile-nav in its className: the mobile nav height lives in --mobile-nav-height (src/styles.css) so the nav and what clears it cannot drift`;

    expect(
      mobileNavToken(
        repoWith({
          ...healthyFiles,
          [spacer]: '<div className="max-bp1000:pb-16" />',
        }),
      ),
    ).toEqual([missing]);

    expect(
      mobileNavToken(
        repoWith({
          ...healthyFiles,
          [spacer]: '// pb-mobile-nav\n<div className="max-bp1000:pb-16" />',
        }),
      ),
    ).toEqual([missing]);
  });
});
