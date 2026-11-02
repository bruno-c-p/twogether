import { z } from "zod";
import { DOMAIN_BASELINE, domainModelRules } from "./fitness-domain";
import { mutationRules } from "./fitness-mutations";
import { GLAZE_VENDORED, styleChecks } from "./fitness-styles";

export type Repo = {
  tracked: (patterns: string[]) => string[];
  read: (file: string) => string;
  exists: (file: string) => boolean;
};

const CACHE_CONTROL = "private, no-store";

const API_BUDGET = ["/api", "budget"].join("/");

const RESURRECTED_CSS = [
  "src/ui.module.css",
  "src/features/budget/styles/list-row.module.css",
];

const BANNED_CSS_DEPS = ["unocss", "shadcn"];

const CACHE_CONTROL_FILES = ["src/start.ts"];

// The checks and their tests necessarily spell out the banned patterns.
const SELF = [
  "scripts/fitness.ts",
  "scripts/fitness-checks.ts",
  "scripts/fitness-checks.test.ts",
];

export const BOUNDARY_BASELINE = "scripts/boundary-baseline.json";

const fallowBaselineSchema = z.record(z.string(), z.unknown());

const boundaryEntriesSchema = z.object({
  boundary_violations: z.array(z.string()),
});

const MEDIA = /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i;

const GRADIENT =
  /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|--page-glow\b/;

const RETIRED_COMMAND_BUS: [RegExp, string][] = [
  [/\bmutateBudget\b/, "still has mutateBudget"],
  [/\bparseBudgetCommand\b/, "still has parseBudgetCommand"],
  [/\bBudgetCommand\b/, "still has BudgetCommand"],
  [/\bCommandResult\b/, "still has CommandResult"],
];

const dependencyMap = z.record(z.string(), z.string()).optional();

const packageJsonSchema = z.object({
  dependencies: dependencyMap,
  devDependencies: dependencyMap,
  peerDependencies: dependencyMap,
});

function sourceFiles(repo: Repo) {
  return repo
    .tracked(["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"])
    .filter((file) => !SELF.includes(file));
}

export function noGithubMedia(repo: Repo) {
  const files = repo.tracked([".github"]).filter((file) => MEDIA.test(file));

  return files.length
    ? [`image/video files under .github/:\n${files.join("\n")}`]
    : [];
}

export function noCssModules(repo: Repo) {
  return repo
    .tracked(["src"])
    .filter((file) => file.endsWith(".module.css"))
    .map(
      (file) =>
        `${file} is a CSS module; style it with Glaze components, recipes and token utilities`,
    );
}

export function noApiRouteFiles(files: string[]) {
  return files.flatMap((file) => {
    if (file.endsWith("api.server.ts")) return [`tracked ${file}`];

    const apiRoute =
      file === "src/routes/api" || file.startsWith("src/routes/api/");

    return apiRoute ? [`tracked API route ${file}`] : [];
  });
}

function isServerFunctionSource(file: string) {
  if (file.endsWith(".functions.ts")) return true;

  return (
    file.includes("/actions/") &&
    file.endsWith(".ts") &&
    !file.endsWith(".test.ts")
  );
}

export function noCommandBusSource(file: string, text: string) {
  const failures: string[] = [];

  if (text.includes(API_BUDGET))
    failures.push(`${file} mentions ${API_BUDGET}`);

  if (text.includes("createAPIFileRoute"))
    failures.push(`${file} mentions createAPIFileRoute`);

  for (const [marker, message] of RETIRED_COMMAND_BUS)
    if (marker.test(text)) failures.push(`${file} ${message}`);

  if (isServerFunctionSource(file) && /action:\s*["']/.test(text))
    failures.push(`${file} still uses an action discriminator in a server fn`);

  return failures;
}

function noBudgetCommandBus(repo: Repo) {
  return [
    ...noApiRouteFiles(repo.tracked([])),
    ...sourceFiles(repo).flatMap((file) =>
      noCommandBusSource(file, repo.read(file)),
    ),
  ];
}

function cacheControlFileFailures(repo: Repo, file: string) {
  if (!repo.exists(file))
    return [`${file} is required for CSRF and Cache-Control middleware`];

  const text = repo.read(file);
  const failures: string[] = [];

  if (!text.includes("createCsrfMiddleware"))
    failures.push(`${file} must keep createCsrfMiddleware`);

  if (!text.includes(CACHE_CONTROL))
    failures.push(`${file} must set Cache-Control: ${CACHE_CONTROL}`);

  return failures;
}

export function cacheControlSource(repo: Repo) {
  return CACHE_CONTROL_FILES.flatMap((file) =>
    cacheControlFileFailures(repo, file),
  );
}

function dependencyNames(repo: Repo) {
  const pkg = packageJsonSchema.parse(JSON.parse(repo.read("package.json")));

  return Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  });
}

function isBannedCssDependency(name: string) {
  return BANNED_CSS_DEPS.includes(name) || name.startsWith("@radix-ui/");
}

export function cssHouseStyle(repo: Repo) {
  const names = dependencyNames(repo);

  const styled = repo
    .tracked(["*.css", "*.svg", "*.tsx", "*.ts", "*.html"])
    .filter((file) => !SELF.includes(file))
    .filter((file) => !GLAZE_VENDORED.some((dir) => file.startsWith(dir)));

  return [
    ...names
      .filter(isBannedCssDependency)
      .map((name) => `package.json must not depend on ${name}`),
    ...(names.includes("tailwindcss")
      ? []
      : ["package.json must depend on tailwindcss"]),
    ...repo
      .tracked(RESURRECTED_CSS)
      .map((file) => `tracked resurrected ${file}`),
    ...styled
      .filter((file) => GRADIENT.test(repo.read(file)))
      .map((file) => `${file} still uses a CSS gradient or --page-glow`),
  ];
}

const GLAZE_ROOT: [string, string][] = [
  ["@/components/glaze/styles.css", "import @/components/glaze/styles.css"],
  ['<body className="glaze">', 'put className="glaze" on <body>'],
  ["<GlazePortalProvider>", "wrap the app in <GlazePortalProvider>"],
];

export function glazeWiring(repo: Repo) {
  const root = repo.read("src/routes/__root.tsx");

  return [
    ...(repo.exists("uno.config.ts") ? ["uno.config.ts is retired"] : []),
    ...GLAZE_ROOT.flatMap(([marker, rule]) =>
      root.includes(marker) ? [] : [`src/routes/__root.tsx must ${rule}`],
    ),
  ];
}

// Route config loads eagerly, so a barrel that re-exports a component drags
// it and its CSS into the main chunk. Components join the feature's -api
// zone as their own modules instead.

// Value re-exports, value imports (an import plus a later `export { X }`
// links the module just the same) and bare imports. Type-only ones are erased.
const VALUE_LINK =
  /^(?:export\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})|import\s+(?!type\s)[^;"]*?)\s+from\s+"([^"]+)"|^import\s+"([^"]+)"/gm;

export function noComponentBarrels(repo: Repo) {
  return repo
    .tracked(["src/features"])
    .filter((file) => /^src\/features\/[^/]+\/index\.ts$/.test(file))
    .flatMap((file) =>
      [...repo.read(file).matchAll(VALUE_LINK)].flatMap((match) => {
        const source = match[1] ?? match[2] ?? "";

        return source.includes("/components/")
          ? [
              `${file} links ${source}; list that module in the feature's -api zone in .fallowrc.json instead`,
            ]
          : [];
      }),
    );
}

// `fallow --save-baseline` grandfathers every finding kind, so a careless
// re-save could hide new dead code behind the boundary ratchet.
export function boundaryBaselineScope(repo: Repo) {
  const baseline = fallowBaselineSchema.parse(
    JSON.parse(repo.read(BOUNDARY_BASELINE)),
  );

  return Object.entries(baseline).flatMap(([kind, entries]) =>
    kind !== "boundary_violations" && Array.isArray(entries) && entries.length
      ? [
          `${BOUNDARY_BASELINE} grandfathers ${entries.length} ${kind}; it may only hold boundary_violations. Fix those findings and drop them from the file.`,
        ]
      : [],
  );
}

export type Git = (args: string[]) => string;

function boundaryEntries(text: string) {
  return boundaryEntriesSchema.parse(JSON.parse(text)).boundary_violations;
}

function succeeds(git: Git, args: string[]) {
  try {
    git(args);

    return true;
  } catch {
    return false;
  }
}

function ratchetBase(git: Git, warn: (message: string) => void) {
  try {
    return git(["merge-base", "HEAD", "origin/main"]);
  } catch {
    warn(
      "baseline ratchet: no merge-base with origin/main (shallow clone?); comparing against the origin/main tip instead",
    );

    return "origin/main";
  }
}

function baselineGrowth(
  repo: Repo,
  git: Git,
  warn: (message: string) => void,
  file: string,
  entries: (text: string) => string[],
  fix: string,
) {
  const base = ratchetBase(git, warn);

  if (!succeeds(git, ["rev-parse", "--verify", "--quiet", `${base}^{commit}`]))
    return [
      `cannot resolve ${base} to check that ${file} only shrinks; run git fetch origin main (CI needs fetch-depth: 0)`,
    ];

  if (!succeeds(git, ["cat-file", "-e", `${base}:${file}`])) {
    warn(
      `baseline ratchet: ${base} has no ${file}; nothing to compare against`,
    );

    return [];
  }

  const left = new Map<string, number>();

  for (const entry of entries(git(["show", `${base}:${file}`])))
    left.set(entry, (left.get(entry) ?? 0) + 1);

  const added = entries(repo.read(file)).filter((entry) => {
    const count = left.get(entry) ?? 0;

    left.set(entry, count - 1);

    return count <= 0;
  });

  if (!added.length) return [];

  return [
    `${file} gained ${added.length} ${added.length === 1 ? "entry" : "entries"} since ${base}; it may only shrink. ${fix}:\n${added.join("\n")}`,
  ];
}

// A re-save absorbs new violations, so the entry count must not exceed the
// one at the branch point. CI checks out full history for this.
export function boundaryBaselineGrowth(
  repo: Repo,
  git: Git,
  warn: (message: string) => void,
) {
  return baselineGrowth(
    repo,
    git,
    warn,
    BOUNDARY_BASELINE,
    boundaryEntries,
    "Fix the new boundary violation instead of re-saving the baseline",
  );
}

export function domainBaselineGrowth(
  repo: Repo,
  git: Git,
  warn: (message: string) => void,
) {
  return baselineGrowth(
    repo,
    git,
    warn,
    DOMAIN_BASELINE,
    (text) => text.split("\n").filter(Boolean),
    "Read the new hit through transactionStatus or z.infer instead of grandfathering it",
  );
}

// A name ban, not a full guard: errorMiddleware alone turns a RequestError
// into an HTTP status, and an inner layer that calls setResponseStatus is the
// shape the bug took. Rethrowing a plain Error below it slips past this.
const HTTP_STATUS_OWNER = "src/server/middleware.ts";

export function httpStatusBoundary(repo: Repo) {
  return repo
    .tracked(["src"])
    .filter(
      (file) =>
        file !== HTTP_STATUS_OWNER &&
        /\bsetResponseStatus\b/.test(repo.read(file)),
    )
    .map(
      (file) =>
        `${file} mentions setResponseStatus; only errorMiddleware in ${HTTP_STATUS_OWNER} may, so throw a RequestError instead`,
    );
}

const RULE_TABLE = /^## Rule table\n([\s\S]*?)^## /m;

// Checks that only gather other checks; the table lists what they gather.
const AGGREGATES = ["sourceChecks", "styleChecks"];

function captures(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].map((match) => match[1] ?? "");
}

// The rule table in AGENTS.md names each enforcer, so a renamed or deleted
// check, or a new one nobody listed, fails here instead of leaving it stale.
export function agentsRuleTable(repo: Repo) {
  const table = RULE_TABLE.exec(repo.read("AGENTS.md"))?.[1];

  if (!table) return ["AGENTS.md must keep its ## Rule table section"];

  const scripts = repo
    .tracked(["scripts"])
    .flatMap((file) =>
      /^scripts\/fitness[^/]*(?<!\.test)\.ts$/.test(file)
        ? repo.read(file)
        : [],
    )
    .join("\n");

  const oxlint = repo.read("oxlint.config.ts");
  const named = new Set(captures(table, /fitness `(\w+)`/g));

  const defined = new Set(captures(scripts, /^(?:export )?function (\w+)\(/gm));

  const run = new Set(captures(scripts, /^\s*\.\.\.(\w+)\(repo(?:,.*)?\),$/gm));

  return [
    ...[...named].flatMap((name) =>
      defined.has(name)
        ? []
        : `AGENTS.md names fitness \`${name}\`, which no scripts/fitness*.ts defines`,
    ),
    ...[...run].flatMap((name) =>
      AGGREGATES.includes(name) || named.has(name)
        ? []
        : `bun run fitness runs ${name}; add its row to the AGENTS.md rule table`,
    ),
    ...captures(table, /oxlint `([\w/-]+)`/g).flatMap((rule) =>
      oxlint.includes(`"${rule}"`)
        ? []
        : `AGENTS.md names oxlint \`${rule}\`, which oxlint.config.ts does not configure`,
    ),
  ];
}

export function sourceChecks(repo: Repo) {
  return [
    ...noGithubMedia(repo),
    ...httpStatusBoundary(repo),
    ...noBudgetCommandBus(repo),
    ...cacheControlSource(repo),
    ...cssHouseStyle(repo),
    ...glazeWiring(repo),
    ...noCssModules(repo),
    ...boundaryBaselineScope(repo),
    ...noComponentBarrels(repo),
    ...styleChecks(repo),
    ...domainModelRules(repo),
    ...mutationRules(repo),
  ];
}

export function headerFailures(header: string) {
  return header === CACHE_CONTROL
    ? []
    : [
        `GET / Cache-Control is ${JSON.stringify(header)}, expected ${CACHE_CONTROL}`,
      ];
}

export type HeaderProbe = {
  fetch: (
    url: string,
  ) => Promise<{ headers: { get: (name: string) => string | null } }>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

function errorText(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

export async function waitForHeader(
  url: string,
  timeoutMs: number,
  probe: HeaderProbe,
) {
  const deadline = probe.now() + timeoutMs;
  let last = "";

  while (probe.now() < deadline) {
    try {
      const response = await probe.fetch(url);

      return response.headers.get("cache-control") ?? "";
    } catch (cause) {
      last = errorText(cause);
      await probe.sleep(200);
    }
  }

  throw new Error(`server at ${url} did not respond: ${last}`);
}

export function headerCheckFailure(cause: unknown, output: string) {
  const detail = errorText(cause);

  return output ? `${detail}\n${output}` : detail;
}
