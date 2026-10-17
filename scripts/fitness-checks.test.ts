import { describe, expect, test } from "vitest";
import {
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
    'const c = "[--c:var(--mobile-nav-height)]";',
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

  test("a new arbitrary px value fails and names the utility to use", () => {
    expect(
      noNewArbitraryPx(
        repoWith({
          [spacer]: 'const a = <div className="max-bp1000:pb-[77px]" />;',
          "src/a.tsx": 'cx("w-[32px]", "text-[13px]", "[--size:40px]")',
        }),
      ),
    ).toEqual([
      `${spacer}:1 adds arbitrary px value max-bp1000:pb-[77px]; use a theme utility (spacing p-4 = 16px, text-sm, rounded-md, bp* breakpoints) or add a named token to uno.config.ts. Existing values are grandfathered in ${PX_BASELINE}; do not add to it.`,
      `src/a.tsx:1 adds arbitrary px value w-[32px]; use w-8 (spacing is 4px per step). Existing values are grandfathered in ${PX_BASELINE}; do not add to it.`,
      `src/a.tsx:1 adds arbitrary px value text-[13px]; use text-sm. Existing values are grandfathered in ${PX_BASELINE}; do not add to it.`,
      `src/a.tsx:1 adds arbitrary px value [--size:40px]; use a theme utility (spacing p-4 = 16px, text-sm, rounded-md, bp* breakpoints) or add a named token to uno.config.ts. Existing values are grandfathered in ${PX_BASELINE}; do not add to it.`,
    ]);
  });

  test("baselined px values pass only up to their recorded count", () => {
    const repo = repoWith({
      [PX_BASELINE]: "src/a.tsx\th-[8px]\n",
      "src/a.tsx": 'cx("h-[8px] w-[min(10em,100%)]");\ncx("h-[8px]");',
    });

    expect(noNewArbitraryPx(repo)).toEqual([
      expect.stringMatching(
        /^src\/a\.tsx:2 adds arbitrary px value h-\[8px\]; use h-2/,
      ),
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
          'cx("m-0", cond ? "mt-1" : "mt-2");',
        ].join("\n"),
      ),
    ).toEqual([
      "src/a.tsx:1 sets m-0 and mt-2 on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)",
      "src/a.tsx:2 sets py-2 and p-0 on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)",
      "src/a.tsx:3 sets pt-2 and pt-3 on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)",
      "src/a.tsx:4 sets px-0 and p-4 on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)",
    ]);
  });

  test("the nav spacer must derive from the nav height token", () => {
    expect(
      mobileNavToken(
        repoWith({
          ...healthyFiles,
          [spacer]: '<div className="max-bp1000:pb-16" />',
        }),
      ),
    ).toEqual([
      `${spacer} must use pb-mobile-nav: the mobile nav height lives in --mobile-nav-height (src/styles.css) so the nav and what clears it cannot drift`,
    ]);
  });
});
