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

const healthyFiles = {
  "package.json": JSON.stringify({ devDependencies: { unocss: "1" } }),
  "uno.config.ts": "export default { theme: { font: {} } }",
  "src/routes/__root.tsx": 'import "virtual:uno.css";',
  "src/start.ts": "createCsrfMiddleware(); 'private, no-store'",
  "src/ui/button/button.module.css": ".root {}",
  "src/ui/button/button.tsx": "export {}",
  "src/features/budget/actions/save.ts": "export const save = 1;",
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
