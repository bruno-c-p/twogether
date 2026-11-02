import { describe, expect, test } from "vitest";
import {
  agentsRuleTable,
  BOUNDARY_BASELINE,
  boundaryBaselineGrowth,
  boundaryBaselineScope,
  domainBaselineGrowth,
  cacheControlSource,
  cssHouseStyle,
  headerCheckFailure,
  headerFailures,
  httpStatusBoundary,
  noApiRouteFiles,
  noComponentBarrels,
  noCssModules,
  noCommandBusSource,
  noGithubMedia,
  sourceChecks,
  glazeWiring,
  waitForHeader,
  type Git,
  type Repo,
} from "./fitness-checks";
import { DOMAIN_BASELINE, domainModelRules } from "./fitness-domain";
import { mutationRules } from "./fitness-mutations";
import { conflictingBoxUtilities, mobileNavToken } from "./fitness-styles";

const healthyFiles = {
  "package.json": JSON.stringify({ dependencies: { tailwindcss: "4" } }),
  "src/routes/__root.tsx":
    'import "@/components/glaze/styles.css?url"; <body className="glaze"><GlazePortalProvider>',
  "src/components/glaze/styles.css":
    ".glass { background: linear-gradient(red, blue) }",
  "src/start.ts": "createCsrfMiddleware(); 'private, no-store'",
  "src/features/budget/actions/save.ts": "export const save = 1;",
  "src/features/budget/components/workspace-navigation.tsx":
    '<nav className="h-(--mobile-nav-height)" />',
  "src/features/budget/components/workspace-shell.tsx":
    '<div className="max-lg:pb-(--mobile-nav-height)" />',
  "src/components/app/toaster.tsx":
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

  test("CSS modules are retired", () => {
    expect(
      noCssModules(
        repoWith({
          "src/a/card/card.module.css": "",
          "src/a/card/card.tsx": "",
        }),
      ),
    ).toEqual([
      "src/a/card/card.module.css is a CSS module; style it with Glaze components, recipes and token utilities",
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

  test("CSS house style bans other kits, app gradients and resurrected files", () => {
    const failures = cssHouseStyle(
      repoWith({
        "package.json": JSON.stringify({
          dependencies: { unocss: "66", "@radix-ui/react-dialog": "1" },
        }),
        "src/ui.module.css": "",
        "src/a.css": "body { background: linear-gradient(red, blue) }",
      }),
    );

    expect(failures).toEqual([
      "package.json must not depend on unocss",
      "package.json must not depend on @radix-ui/react-dialog",
      "package.json must depend on tailwindcss",
      "tracked resurrected src/ui.module.css",
      "src/a.css still uses a CSS gradient or --page-glow",
    ]);
  });

  test("the root wires Glaze and UnoCSS stays retired", () => {
    expect(glazeWiring(repoWith({ "uno.config.ts": "" }))).toEqual([
      "uno.config.ts is retired",
      "src/routes/__root.tsx must import @/components/glaze/styles.css",
      'src/routes/__root.tsx must put className="glaze" on <body>',
      "src/routes/__root.tsx must wrap the app in <GlazePortalProvider>",
    ]);
  });

  test("only errorMiddleware maps a RequestError to an HTTP status", () => {
    expect(
      httpStatusBoundary(
        repoWith({
          "src/server/middleware.ts": "setResponseStatus(cause.status);",
          "src/server/request-error.ts":
            'import { setResponseStatus } from "@tanstack/react-start/server";',
          "src/features/budget/actions/index.ts": "throw new RequestError(m);",
        }),
      ),
    ).toEqual([
      "src/server/request-error.ts mentions setResponseStatus; only errorMiddleware in src/server/middleware.ts may, so throw a RequestError instead",
    ]);
  });

  test("a feature index may not re-export a component", () => {
    expect(
      noComponentBarrels(
        repoWith({
          "src/features/a/index.ts": [
            'export { load } from "@/features/a/workspace";',
            'export type { Slot } from "@/features/a/components/shell";',
            'export {\n  Screen,\n} from "@/features/a/components/screen";',
            'export * from "@/features/a/components/panel";',
            'export * as Rows from "@/features/a/components/rows";',
            'import { Card } from "@/features/a/components/card";',
            'import {\n  Grid,\n} from "@/features/a/components/grid";',
            'import * as Tiles from "@/features/a/components/tiles";',
            'import "@/features/a/components/styles";',
            'import type { CardProps } from "@/features/a/components/card";',
            'import { parse } from "@/features/a/search";',
            "export { Card, Grid, Tiles };",
          ].join("\n"),
          "src/features/a/components/index.ts":
            'export { Row } from "@/features/a/components/row";',
        }),
      ),
    ).toEqual([
      "src/features/a/index.ts links @/features/a/components/screen; list that module in the feature's -api zone in .fallowrc.json instead",
      "src/features/a/index.ts links @/features/a/components/panel; list that module in the feature's -api zone in .fallowrc.json instead",
      "src/features/a/index.ts links @/features/a/components/rows; list that module in the feature's -api zone in .fallowrc.json instead",
      "src/features/a/index.ts links @/features/a/components/card; list that module in the feature's -api zone in .fallowrc.json instead",
      "src/features/a/index.ts links @/features/a/components/grid; list that module in the feature's -api zone in .fallowrc.json instead",
      "src/features/a/index.ts links @/features/a/components/tiles; list that module in the feature's -api zone in .fallowrc.json instead",
      "src/features/a/index.ts links @/features/a/components/styles; list that module in the feature's -api zone in .fallowrc.json instead",
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

describe("AGENTS.md rule table", () => {
  const checks = `export function noGithubMedia(repo: Repo) {}
export function sourceChecks(repo: Repo) {
  return [
    ...noGithubMedia(repo),
    ...sourceFiles(repo).flatMap((file) => file),
  ];
}`;

  const table = (rows: string) =>
    `# Rules\n\n## Rule table\n\n${rows}\n## Setup\n\nfitness \`elsewhere\`\n`;

  const files = (rows: string) => ({
    "AGENTS.md": table(rows),
    "scripts/fitness-checks.ts": checks,
    "scripts/fitness-checks.test.ts": "function testOnly() {}",
    "oxlint.config.ts": '{ "clock/no-direct-clock": "error" }',
  });

  test("a table naming every check and configured rule passes", () => {
    expect(
      agentsRuleTable(
        repoWith(
          files(
            "| media | fitness `noGithubMedia` |\n| clock | oxlint `clock/no-direct-clock` |\n",
          ),
        ),
      ),
    ).toEqual([]);
  });

  test("a renamed check, an unlisted check and an unknown lint rule fail", () => {
    expect(
      agentsRuleTable(
        repoWith(
          files(
            "| media | fitness `noMedia` |\n| test | fitness `testOnly` |\n| clock | oxlint `clock/no-clock` |\n",
          ),
        ),
      ),
    ).toEqual([
      "AGENTS.md names fitness `noMedia`, which no scripts/fitness*.ts defines",
      "AGENTS.md names fitness `testOnly`, which no scripts/fitness*.ts defines",
      "bun run fitness runs noGithubMedia; add its row to the AGENTS.md rule table",
      "AGENTS.md names oxlint `clock/no-clock`, which oxlint.config.ts does not configure",
    ]);
  });

  test("a missing rule table fails", () => {
    expect(agentsRuleTable(repoWith({ "AGENTS.md": "# Rules\n" }))).toEqual([
      "AGENTS.md must keep its ## Rule table section",
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
      `${BOUNDARY_BASELINE} gained 1 entry since abc123; it may only shrink. Fix the new boundary violation instead of re-saving the baseline:\ne->f`,
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
      "baseline ratchet: no merge-base with origin/main (shallow clone?); comparing against the origin/main tip instead",
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

  const conflict =
    "on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)";

  test("a shorthand and a side on one element conflict", () => {
    expect(
      conflictingBoxUtilities(
        "src/a.tsx",
        [
          '<p className="m-0 mt-2" />;',
          '<button className="py-2 p-0" />;',
          '<p className="pt-2 pt-3" />;',
          '<p className="mt-2 mb-4 px-0 py-2 p-4 max-sm:p-2" />;',
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
          'cx(cond ? "p-0" : "pt-2", "max-sm:p-2");',
          'const shared = "m-0"; const other = "mt-2";',
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  test("the nav spacer must derive from the nav height token in a class", () => {
    const missing = `${spacer} must use pb-(--mobile-nav-height) in its className: the mobile nav height lives in --mobile-nav-height (src/styles.css) so the nav and what clears it cannot drift`;

    expect(
      mobileNavToken(
        repoWith({
          ...healthyFiles,
          [spacer]: '<div className="max-lg:pb-16" />',
        }),
      ),
    ).toEqual([missing]);

    expect(
      mobileNavToken(
        repoWith({
          ...healthyFiles,
          [spacer]:
            '// pb-(--mobile-nav-height)\n<div className="max-lg:pb-16" />',
        }),
      ),
    ).toEqual([missing]);
  });
});

describe("domain model rules", () => {
  const types = "src/features/budget/domain/types.ts";
  const row = "src/features/budget/components/row.tsx";
  const grandfathered = `Existing ones are grandfathered in ${DOMAIN_BASELINE}; do not add to it.`;

  test("domain types and status reads inside domain/ or tests pass", () => {
    expect(
      domainModelRules(
        repoWith({
          [types]: "export type Transaction = z.infer<typeof schema>;",
          "src/features/budget/domain/status.ts": "t.split?.paidAt",
          "src/features/budget/components/row.test.tsx": "t.settlementOf",
        }),
      ),
    ).toEqual([]);
  });

  test("a hand-written domain type or a raw status read fails", () => {
    expect(
      domainModelRules(
        repoWith({
          [types]:
            'export interface Note {}\nexport type Tag = { id: string };\nexport type Draft = Omit<T, "a"> & { a: number };\nexport type Extra = z.infer<typeof s> & { extra: string };\nexport type Ok = z.input<typeof s>;\nexport type Wrapped =\n  z.output<typeof s>;',
          [row]: "if (t.settlementOf || t.split?.paidAt || split.paidAt) {}",
        }),
      ),
    ).toEqual([
      `${types} adds interface Note; derive it with z.infer from its schema. ${grandfathered}`,
      `${types} adds type Tag; derive it with z.infer from its schema. ${grandfathered}`,
      `${types} adds type Draft; derive it with z.infer from its schema. ${grandfathered}`,
      `${types} adds type Extra; derive it with z.infer from its schema. ${grandfathered}`,
      ...["settlementOf", "split.paidAt", "split.paidAt"].map(
        (token) =>
          `${row} adds ${token}; read repayment, split, paidAt, userOwes or lock from transactionStatus (domain/status.ts). ${grandfathered}`,
      ),
    ]);
  });

  test("the baseline grandfathers each hit once and may only shrink", () => {
    expect(
      domainModelRules(
        repoWith({
          [row]: "t.settlementOf",
          [DOMAIN_BASELINE]: `${row}\tsettlementOf\n${row}\tsettlementOf\n`,
        }),
      ),
    ).toEqual([
      `${DOMAIN_BASELINE} lists ${row} settlementOf 1 more time(s) than the code uses it; delete those lines`,
    ]);
  });
});

describe("domain baseline ratchet", () => {
  const row = "src/features/budget/components/row.tsx";

  const git = gitWith({
    "merge-base HEAD origin/main": "abc123",
    "rev-parse --verify --quiet abc123^{commit}": "abc123",
    [`cat-file -e abc123:${DOMAIN_BASELINE}`]: "",
    [`show abc123:${DOMAIN_BASELINE}`]: `${row}\tsettlementOf\n`,
  });

  test("a baseline that shrinks or holds passes", () => {
    for (const text of ["", `${row}\tsettlementOf\n`])
      expect(
        domainBaselineGrowth(
          repoWith({ [DOMAIN_BASELINE]: text }),
          git,
          () => undefined,
        ),
      ).toEqual([]);
  });

  test("grandfathering a new hit fails even when the code matches it", () => {
    const grown = `${row}\tsettlementOf\n${row}\tsplit.paidAt\n`;

    const files = {
      [row]: "t.settlementOf; t.split?.paidAt",
      [DOMAIN_BASELINE]: grown,
    };

    expect(domainModelRules(repoWith(files))).toEqual([]);
    expect(domainBaselineGrowth(repoWith(files), git, () => undefined)).toEqual(
      [
        `${DOMAIN_BASELINE} gained 1 entry since abc123; it may only shrink. Read the new hit through transactionStatus or z.infer instead of grandfathering it:\n${row}\tsplit.paidAt`,
      ],
    );
  });

  test("swapping a grandfathered hit or duplicating one fails and names it", () => {
    const other = "src/features/budget/components/other.tsx";

    for (const [text, added] of [
      [`${other}\tsettlementOf\n`, `${other}\tsettlementOf`],
      [`${row}\tsettlementOf\n${row}\tsettlementOf\n`, `${row}\tsettlementOf`],
    ])
      expect(
        domainBaselineGrowth(
          repoWith({ [DOMAIN_BASELINE]: text }),
          git,
          () => undefined,
        ),
      ).toEqual([
        `${DOMAIN_BASELINE} gained 1 entry since abc123; it may only shrink. Read the new hit through transactionStatus or z.infer instead of grandfathering it:\n${added}`,
      ]);
  });
});

describe("mutation wiring", () => {
  const registry = "src/features/budget/actions/mutations.ts";
  const barrel = "src/features/budget/actions/index.ts";

  const statement = (name: string, validator: string, handler: string) =>
    `const ${name} = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .validator(defs.${validator}.parse)
  .handler(serve(defs.${handler}));`;

  const householdEntry = (key: string) => `  ${key}: define("${key}", {
    gate: "household",
    run: (store, actor, input) => store.${key}(actor.user, input),
  }),`;

  const defaultRegistry = `const budgetMutations = {
${["settleSplit", "unsettleSplit", "restoreTransaction"].map(householdEntry).join("\n")}
};`;

  const check = (files: Record<string, string>) =>
    mutationRules(repoWith({ [registry]: defaultRegistry, ...files }));

  test("accepts statements that name one definition", () => {
    expect(
      check({
        [barrel]: statement("settleSplit", "settleSplit", "settleSplit"),
      }),
    ).toEqual([]);
  });

  test("rejects a handler or validator from another definition", () => {
    expect(
      check({
        [barrel]: statement("settleSplit", "unsettleSplit", "unsettleSplit"),
      }),
    ).toEqual([
      `${barrel}: settleSplit must end in .handler(serve(defs.settleSplit))`,
      `${barrel}: settleSplit must validate with defs.settleSplit.parse`,
    ]);
  });

  test("rejects an exported statement", () => {
    expect(
      check({
        [barrel]: `export ${statement("settleSplit", "settleSplit", "settleSplit")}`,
      }),
    ).toEqual([
      `${barrel}: settleSplit is exported; call it through the feature's actions object`,
    ]);
  });

  test("sees through extra createServerFn options", () => {
    expect(
      check({
        [barrel]: statement(
          "settleSplit",
          "settleSplit",
          "unsettleSplit",
        ).replace('{ method: "POST" }', '{ method: "POST", strict: false }'),
      }),
    ).toEqual([
      `${barrel}: settleSplit must end in .handler(serve(defs.settleSplit))`,
    ]);
  });

  test("rejects a statement exported by an export list", () => {
    expect(
      check({
        [barrel]: `${statement("settleSplit", "settleSplit", "settleSplit")}\nexport { settleSplit };`,
      }),
    ).toEqual([
      `${barrel}: settleSplit may only appear as its own entry in the actions object`,
    ]);
  });

  test("rejects an intermediate object that re-keys a statement", () => {
    expect(
      check({
        [barrel]: `${statement("settleSplit", "settleSplit", "settleSplit")}
${statement("unsettleSplit", "unsettleSplit", "unsettleSplit")}
const internal = { settleSplit, unsettleSplit };
export const budgetActions = { settleSplit: internal.unsettleSplit, unsettleSplit } satisfies BudgetActions;`,
      }),
    ).toEqual([
      `${barrel}: every statement must be an entry of one actions object`,
    ]);
  });

  test("rejects an actions object that reaches statements through another object", () => {
    expect(
      check({
        [barrel]: `${statement("restoreTransaction", "restoreTransaction", "restoreTransaction")}
${statement("unsettleSplit", "unsettleSplit", "unsettleSplit")}
const internal = { restoreTransaction, unsettleSplit };
export const budgetActions = {
  restoreTransaction: internal.unsettleSplit,
  unsettleSplit: internal.restoreTransaction,
} satisfies BudgetActions;`,
      }),
    ).toEqual([`${barrel}: the actions object must be an exported const`]);
  });

  test("rejects a statement that is not a top-level const", () => {
    expect(
      check({
        [barrel]: `const settleSplit = (() => {
  ${statement("inner", "inner", "inner")}
  return inner;
})();`,
      }),
    ).toEqual([`${barrel}: a server fn must be a top-level const`]);
  });

  test("rejects a statement whose middleware is not its gate's", () => {
    const settle = statement("settleSplit", "settleSplit", "settleSplit");
    const message = `${barrel}: settleSplit must run .middleware([householdMiddleware]) for its "household" gate`;

    expect(
      check({
        [barrel]: settle.replace("  .middleware([householdMiddleware])\n", ""),
      }),
    ).toEqual([message]);
    expect(
      check({
        [barrel]: settle.replace("householdMiddleware", "authMiddleware"),
      }),
    ).toEqual([message]);
  });

  test("rejects a statement that calls middleware twice", () => {
    expect(
      check({
        [barrel]: statement(
          "settleSplit",
          "settleSplit",
          "settleSplit",
        ).replace(
          ".middleware([householdMiddleware])",
          ".middleware([otherMiddleware])\n  .middleware([householdMiddleware])",
        ),
      }),
    ).toEqual([`${barrel}: settleSplit must call .middleware() once`]);
  });

  test("rejects a barrel statement that is not POST", () => {
    expect(
      check({
        [barrel]: statement(
          "settleSplit",
          "settleSplit",
          "settleSplit",
        ).replace('{ method: "POST" }', ""),
      }),
    ).toEqual([
      `${barrel}: settleSplit must be createServerFn({ method: "POST" })`,
    ]);
  });

  test("rejects a serve() handler outside the barrel", () => {
    const stray = "src/features/budget/actions/archive.ts";

    expect(
      check({
        [barrel]: "",
        [stray]: "const x = createServerFn().handler(serve(defs.archive));",
      }),
    ).toEqual([`${stray}: mutation server fns belong in ${barrel}`]);
  });

  test("rejects an actions entry wired to another statement", () => {
    expect(
      check({
        [barrel]: `${statement("settleSplit", "settleSplit", "settleSplit")}
${statement("unsettleSplit", "unsettleSplit", "unsettleSplit")}
const budgetActions = { settleSplit: unsettleSplit, unsettleSplit } satisfies BudgetActions;
export { budgetActions };`,
      }),
    ).toEqual([
      `${barrel}: unsettleSplit may only appear as its own entry in the actions object`,
      `${barrel}: actions entry settleSplit must be the statement of the same name`,
    ]);
  });

  test("rejects a POST server fn outside the barrel", () => {
    const stray = "src/features/budget/actions/archive.ts";

    expect(
      check({
        [barrel]: "",
        [stray]: 'const x = createServerFn({ strict: false, method: "POST" });',
      }),
    ).toEqual([`${stray}: mutation server fns belong in ${barrel}`]);
  });

  test("rejects a registry entry named or run as another mutation", () => {
    const entry = (
      key: string,
      method: string,
      name = key,
    ) => `const budgetMutations = {
  ${key}: define("${name}", {
    gate: "household",
    schema: s,
    run: (store, actor, input) =>
      store.${method}(actor.user, actor.householdId, input),
  }),
};`;

    expect(check({ [registry]: entry("settleSplit", "settleSplit") })).toEqual(
      [],
    );
    expect(
      check({ [registry]: entry("settleSplit", "unsettleSplit") }),
    ).toEqual([`${registry}: settleSplit must run store.settleSplit`]);
    expect(
      check({
        [registry]: entry("settleSplit", "settleSplit", "unsettleSplit"),
      }),
    ).toEqual([`${registry}: settleSplit must be define("settleSplit", ...)`]);
  });

  test("reads the gate of a mutation without input", () => {
    const household = "src/features/household/actions/mutations.ts";
    const householdBarrel = "src/features/household/actions/index.ts";

    const command = `const householdMutations = {
  createInvite: defineCommand("createInvite", {
    gate: "household",
    run: (store, actor) => store.createInvite(actor.householdId),
  }),
};`;

    const invite = (
      middleware: string,
    ) => `const createInvite = createServerFn({ method: "POST" })
  .middleware([${middleware}])
  .handler(serve(defs.createInvite));`;

    expect(
      mutationRules(
        repoWith({
          [household]: command,
          [householdBarrel]: invite("householdMiddleware"),
        }),
      ),
    ).toEqual([]);
    expect(
      mutationRules(
        repoWith({
          [household]: command,
          [householdBarrel]: invite("authMiddleware"),
        }),
      ),
    ).toEqual([
      `${householdBarrel}: createInvite must run .middleware([householdMiddleware]) for its "household" gate`,
    ]);
  });

  test("checks a mutation without input like any other entry", () => {
    const household = "src/features/household/actions/mutations.ts";
    const householdBarrel = "src/features/household/actions/index.ts";

    const command = (
      name: string,
      method: string,
    ) => `const householdMutations = {
  revokeInvite: defineCommand("${name}", {
    gate: "household",
    run: (store, actor) => store.${method}(actor.householdId),
  }),
};`;

    const revoke = (
      validator: string,
    ) => `const revokeInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])${validator}
  .handler(serve(defs.revokeInvite));`;

    const rules = (registry: string, barrel: string) =>
      mutationRules(
        repoWith({ [household]: registry, [householdBarrel]: barrel }),
      );

    expect(rules(command("revokeInvite", "revokeInvite"), revoke(""))).toEqual(
      [],
    );
    expect(
      rules(
        command("revokeInvite", "revokeInvite"),
        revoke("\n  .validator(defs.revokeInvite.parse)"),
      ),
    ).toEqual([
      `${householdBarrel}: revokeInvite takes no input; drop its .validator()`,
    ]);
    expect(rules(command("createInvite", "createInvite"), revoke(""))).toEqual([
      `${household}: revokeInvite must be defineCommand("revokeInvite", ...)`,
      `${household}: revokeInvite must run store.revokeInvite`,
    ]);
  });

  test("leaves features without a registry alone", () => {
    expect(
      mutationRules(
        repoWith({
          "src/features/auth/actions/set-name.ts":
            'export const setName = createServerFn({ method: "POST" })',
        }),
      ),
    ).toEqual([]);
  });
});
