import { z } from "zod";

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

const BANNED_CSS_DEPS = ["tailwindcss", "shadcn"];

const CACHE_CONTROL_FILES = ["src/start.ts"];

// The checks and their tests necessarily spell out the banned patterns.
const SELF = [
  "scripts/fitness.ts",
  "scripts/fitness-checks.ts",
  "scripts/fitness-checks.test.ts",
];

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

function moduleLayoutFailure(repo: Repo, file: string) {
  const parts = file.split("/");
  const stem = (parts.at(-1) ?? "").replace(/\.module\.css$/, "");
  const folder = parts.at(-2) ?? "";

  if (folder !== stem) return `${file} must live in a folder named ${stem}`;

  const sibling = [...parts.slice(0, -1), `${stem}.tsx`].join("/");

  return repo.exists(sibling)
    ? undefined
    : `${file} has no sibling ${stem}.tsx in ${folder}/`;
}

export function componentModuleLayout(repo: Repo) {
  return repo
    .tracked(["src"])
    .filter((file) => file.endsWith(".module.css"))
    .flatMap((file) => moduleLayoutFailure(repo, file) ?? []);
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
    .filter((file) => !SELF.includes(file));

  return [
    ...names
      .filter(isBannedCssDependency)
      .map((name) => `package.json must not depend on ${name}`),
    ...(names.includes("unocss") ? [] : ["package.json must depend on unocss"]),
    ...repo
      .tracked(RESURRECTED_CSS)
      .map((file) => `tracked resurrected ${file}`),
    ...styled
      .filter((file) => GRADIENT.test(repo.read(file)))
      .map((file) => `${file} still uses a CSS gradient or --page-glow`),
  ];
}

export function unoWiring(repo: Repo) {
  if (!repo.exists("uno.config.ts"))
    return ["uno.config.ts is required for the styling system"];

  const failures: string[] = [];

  if (/\bfontFamily\s*:/.test(repo.read("uno.config.ts")))
    failures.push(
      "uno.config.ts must set theme.font; preset-wind4 ignores fontFamily",
    );

  if (!repo.read("src/routes/__root.tsx").includes("virtual:uno.css"))
    failures.push("src/routes/__root.tsx must import virtual:uno.css");

  return failures;
}

export function sourceChecks(repo: Repo) {
  return [
    ...noGithubMedia(repo),
    ...noBudgetCommandBus(repo),
    ...cacheControlSource(repo),
    ...cssHouseStyle(repo),
    ...unoWiring(repo),
    ...componentModuleLayout(repo),
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
