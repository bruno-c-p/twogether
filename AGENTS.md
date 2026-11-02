# Working rules

Start with the rule table. Each row names the rule, what enforces it, what a
failure prints, and the section below that holds the full rule; when the two
differ, the section wins. **prose** means nothing checks the rule: you are
the enforcer. `bun run fitness` (`agentsRuleTable`) fails when the table
names a `fitness <name>` or `oxlint <rule>` that does not exist, or leaves
out a check that fitness runs. Write the prefix before every name; a name
without one is not checked.

## Rule table

### Setup, checks and pull requests

| Rule                                                                                               | Enforcer                                                                      | Failure looks like                                                                      | Details                 |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| Run `bun run setup` in every worktree; never copy the main checkout's `.env.local`                 | `bun run setup` (`scripts/setup-worktree.ts`)                                 | `setup: … holds live Clerk keys` / `sets … to something other than a local SQLite path` | Worktree setup          |
| Validate every change in a real browser (320px to desktop, light and dark)                         | **prose** (`verify-twogether` skill is the tool)                              | —                                                                                       | Validation              |
| Run the full check list before finishing                                                           | CI `Verify` job (`.github/workflows/ci-cd.yml`) runs each one                 | red `Verify`; merge-guard then refuses                                                  | Validation              |
| Prettier formatting                                                                                | `bun run format:check`                                                        | `[warn] Code style issues found … Run Prettier with --write to fix.`                    | Validation              |
| No whitespace errors in the diff                                                                   | `git diff --check`                                                            | `<file>:<line>: trailing whitespace.`                                                   | Validation              |
| Report what was tested, the check results, and blockers; never claim more                          | **prose**                                                                     | —                                                                                       | Validation              |
| Isolated test data; no publish or deploy without authorization                                     | **prose**                                                                     | —                                                                                       | Validation              |
| Fix lint findings; never disable a rule or add a cast to silence one                               | `bun run lint` (oxlint); not disabling is **prose**                           | `× <plugin>(<rule>): …`                                                                 | Lint, Doctor and Fallow |
| Glaze lint reports nothing on app code                                                             | `bun run lint:glaze` (Glaze's ESLint plugin, `glaze.eslint.config.mjs`)       | `glaze/<rule>  <what to use instead>`                                                   | Glaze                   |
| Glaze registry files are vendored; update with `shadcn add --overwrite`, then reapply `PATCHES.md` | **prose**                                                                     | —                                                                                       | Glaze                   |
| A type assertion carries a `SAFETY:` comment stating the invariant                                 | oxlint `anti-slop/require-safety-comment-for-type-assertion`                  | `anti-slop(require-safety-comment-for-type-assertion)`                                  | Lint, Doctor and Fallow |
| Update the vendored anti-slop only through `install-anti-slop`; record `UPSTREAM.md`               | **prose**                                                                     | —                                                                                       | Lint, Doctor and Fallow |
| React Doctor has zero findings                                                                     | `bun run doctor` (`--blocking warning`)                                       | non-zero exit listing the diagnostics                                                   | Lint, Doctor and Fallow |
| Fallow has zero findings                                                                           | `bun run fallow`                                                              | `Failed: dead-code (1 issues): …`                                                       | Lint, Doctor and Fallow |
| Suppress a Doctor or Fallow finding only as a proven false positive, reason beside it              | **prose**                                                                     | —                                                                                       | Lint, Doctor and Fallow |
| Run `fallow audit` before a commit or push                                                         | Claude Code hook `.claude/hooks/fallow-gate.sh`; other agents **prose**       | commit or push blocked with verdict `fail`                                              | Fallow local gate       |
| Merge only with `bun run merge-guard <pr>`, never `gh pr merge`                                    | Claude Code hook `scripts/merge-guard-hook.ts`; other agents **prose**        | ``Raw `gh pr merge` is blocked: …``                                                     | Pull requests           |
| Answer every bot review thread with a fix or a concrete reason before CODE-READY                   | **prose**                                                                     | —                                                                                       | Pull requests           |
| The rule table names real enforcers and lists every fitness check                                  | fitness `agentsRuleTable`                                                     | ``AGENTS.md names fitness `…`, which no scripts/fitness*.ts defines``                   | Rule table              |
| No screenshots or videos under `.github/`                                                          | fitness `noGithubMedia`                                                       | `image/video files under .github/:`                                                     | Pull requests           |
| E2E uses a free port in 3400-3499 and a throwaway SQLite file, never a running server              | `e2e/playwright.config.ts` (`freePort`, `mkdtempSync`, `reuseExistingServer`) | `No free e2e port in 3400-3499`                                                         | E2E                     |
| Seed `uniqueEmail` with stable values only                                                         | **prose**                                                                     | — (each new email burns a Clerk user slot)                                              | E2E                     |
| Locate with `getByRole`/`getByLabel`; no bare tag locators or picks after `getByText`              | oxlint `e2e/no-ambiguous-locator`                                             | ``locator('span')` matches every copy a breakpoint renders…``                           | E2E                     |
| A copy hidden for a breakpoint is `display: none`                                                  | **prose**                                                                     | —                                                                                       | E2E                     |

### React state and data

| Rule                                                                                          | Enforcer                                                                          | Failure looks like                                             | Details                |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------- |
| No `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useInsertionEffect` in app code | oxlint `no-restricted-imports`, oxlint `no-restricted-properties`                 | `Local component state is banned: …` / `Effects are banned: …` | State without useState |
| Put state in React Query, React Hook Form, nuqs or Base UI as listed                          | **prose**                                                                         | —                                                              | State without useState |
| URL index parsers read out-of-range values as absent                                          | `transaction-list.test.tsx` (`?page=0`) pins `pageParam`; new parsers **prose**   | test failure                                                   | State without useState |
| Gate navigation on `queryClient.query()`, never `prefetchQuery`                               | `use-workspace-search.test.tsx` pins `setMonth`; new call sites **prose**         | `a month that fails to load keeps the current month` fails     | React Query            |
| Wrap `mutation.reset()` so an in-flight run keeps pending and error                           | `use-mutation.test.tsx` pins `useMutation`; new wrappers **prose**                | `reset during a run keeps it pending…` fails                   | React Query            |
| An optimistic update paints what the server writes                                            | `bun run test` (`optimistic.server.test.ts`); tsc `satisfies Scenarios` needs one | `optimistic updates agree with the server` fails / tsc error   | React Query            |
| Workspace data lives under `workspaceQueryKey`, one entry per month                           | **prose**                                                                         | —                                                              | React Query            |

### Styling (Glaze)

| Rule                                                                                            | Enforcer                                    | Failure looks like                                                         | Details |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| No CSS modules; style with Glaze components, recipes and token utilities                        | fitness `noCssModules`                      | `… is a CSS module; style it with Glaze components, …`                     | Glaze   |
| Build UI from Glaze components first and follow its skill                                       | **prose** (`.claude/skills/glaze/SKILL.md`) | —                                                                          | Glaze   |
| Glaze token roles only: no hex, raw px, `dark:` or inline style; one primary button per group   | `bun run lint:glaze`                        | `glaze/no-arbitrary-value` / `glaze/unknown-class` / `glaze/one-primary`   | Glaze   |
| No padding/margin shorthand next to one of its sides on one element                             | fitness `noConflictingBoxUtilities`         | `… sets m-0 and mt-2 on one element; …`                                    | Glaze   |
| No other conflicting utilities on one element (two `left-[...]`)                                | **prose**                                   | —                                                                          | Glaze   |
| Clear the phone nav with `--mobile-nav-height`                                                  | fitness `mobileNavToken`                    | `… must use h-(--mobile-nav-height) in its className: …`                   | Glaze   |
| Glaze is wired in the root (`styles.css`, `glaze` body, portal); no `uno.config.ts`             | fitness `glazeWiring`                       | `src/routes/__root.tsx must put className="glaze" on <body>`               | Glaze   |
| Tailwind v4 through Glaze; no UnoCSS, `shadcn` package, `@radix-ui`, or gradients outside Glaze | fitness `cssHouseStyle`                     | `package.json must not depend on unocss` / `… still uses a CSS gradient …` | Glaze   |
| `src/styles.css` holds app-wide custom properties and global rules outside Glaze's scope only   | **prose**                                   | —                                                                          | Glaze   |

### Code structure and domain

| Rule                                                                              | Enforcer                                                                                                                       | Failure looks like                                                       | Details                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------- |
| Read the time only through `@/lib/clock`                                          | oxlint `clock/no-direct-clock` (misses `globalThis.Date` and aliases)                                                          | `Read the clock through @/lib/clock: …`                                  | Clock                             |
| Pass the reader's time zone, never the process zone                               | **prose**                                                                                                                      | —                                                                        | Clock                             |
| Import source through `@/`, never `./` or `../`                                   | oxlint `no-restricted-imports`                                                                                                 | `Use the @/ alias (src/) instead of relative imports.`                   | Imports and boundaries            |
| Imports at the top; leave public URLs, CSS `url()` and package imports alone      | **prose**                                                                                                                      | —                                                                        | Imports and boundaries            |
| Reach a feature only through its `<name>-api` zone; the zone graph holds          | `bun run fallow` (`boundaries` in `.fallowrc.json`)                                                                            | `boundary-violation:<file>:<line>:<file> -> <target> (<zone> -> <zone>)` | Imports and boundaries            |
| No component in a feature `index.ts`                                              | fitness `noComponentBarrels`                                                                                                   | `… links …; list that module in the feature's -api zone …`               | Imports and boundaries            |
| `domain/` imports no React, TanStack, server modules or `node:*`                  | oxlint `no-restricted-imports`                                                                                                 | `domain/ is pure: …`                                                     | Imports and boundaries            |
| Only server-side files import `*.server` or `@/server/**`                         | oxlint `no-restricted-imports`                                                                                                 | `Only server code (…) may import server modules. …`                      | Imports and boundaries            |
| `scripts/boundary-baseline.json` only shrinks and holds only boundary violations  | fitness `boundaryBaselineGrowth`, fitness `boundaryBaselineScope`, `bun run fallow` stale                                      | `… gained 1 entry since …; it may only shrink.`                          | Imports and boundaries            |
| Only `errorMiddleware` sets an HTTP status; throw a `RequestError`                | fitness `httpStatusBoundary`                                                                                                   | `… mentions setResponseStatus; only errorMiddleware …`                   | `scripts/fitness-checks.ts`       |
| `src/start.ts` keeps CSRF and `Cache-Control: private, no-store`                  | fitness `cacheControlSource`; CI `bun run fitness -- --headers` on the build                                                   | `… must keep createCsrfMiddleware` / `GET / Cache-Control is ""…`        | `scripts/fitness-checks.ts`       |
| No `/api/budget` routes, `api.server.ts` or the retired command bus               | fitness `noBudgetCommandBus`                                                                                                   | `… still has mutateBudget` / `tracked API route …`                       | `scripts/fitness-checks.ts`       |
| Amounts are `Cents` from `centsSchema` or the `decimal.ts` helpers, never a cast  | tsc (branded type); a cast needs `SAFETY:`, so never casting is **prose**                                                      | `Type 'number' is not assignable to type 'Cents'`                        | Money is Cents                    |
| A domain type is exactly `z.infer`/`z.input`/`z.output` of its schema             | fitness `domainModelRules`, fitness `domainBaselineGrowth`                                                                     | `… adds interface X; derive it with z.infer from its schema. …`          | One definition per domain concept |
| Read settlement through `transactionStatus`, not `settlementOf` or `split.paidAt` | fitness `domainModelRules`                                                                                                     | `… adds settlementOf; read repayment, … from transactionStatus …`        | One definition per domain concept |
| A mutation input type is `<Name>Input`, `z.infer` of its schema                   | **prose**                                                                                                                      | —                                                                        | One definition per domain concept |
| The four legacy-row answers change together                                       | `bun run test` (`legacy-rows.test.ts`, `legacy-rows.server.test.ts`, dialog test)                                              | test failure                                                             | One definition per domain concept |
| Every registry entry has its server fn, client handle, break-ui fake and MCP tool | `bun run typecheck` names each missing surface (`budgetActions: BudgetActions`, `satisfies Fakes<…>`, `satisfies BudgetTools`) | `Property 'x' is missing in type …`                                      | One definition per mutation       |
| Registry and actions barrel keep their shape (names, gate, top-level `const`)     | fitness `mutationRules`                                                                                                        | `… mutation server fns belong in …/actions/index.ts`                     | One definition per mutation       |
| Outside a feature, read the registry through `@/features/budget/registry`         | **prose**                                                                                                                      | —                                                                        | One definition per mutation       |
| Client-only optimistic data is the third updater parameter, never on the wire     | **prose**                                                                                                                      | —                                                                        | One definition per mutation       |

## Worktree setup

- Run `bun run setup` once in every new worktree, and again whenever
  dependencies change. It installs dependencies from the frozen lockfile,
  links `.env.local` to the dev env, installs Playwright Chromium, and
  validates the client env. Rerunning it is safe.
- The dev env is `~/.config/twogether/dev.env` (under `$XDG_CONFIG_HOME`
  when set), outside every checkout. It holds the Clerk development keys
  and no Turso variables. Set `TWOGETHER_DEV_ENV` to use another file, but
  never the main checkout's `.env.local`: `vercel env pull` writes
  production credentials there.
- Setup refuses an env file with live Clerk keys (`sk_live_`, `pk_live_`)
  or a remote database URL, and refuses to replace a regular `.env.local`.
  Fix what its message names. Never copy the main checkout's `.env.local`
  into a worktree: it holds production Turso credentials.

## Validation

Every change, regardless of size or type (code, UI, styles, copy,
configuration, dependencies, or documentation), is validated in the running
app before the task is finished. Do not skip this because the change looks
simple or low-impact.

- Start the app with Bun and run the affected flow end to end in a real
  browser, with the `verify-twogether` skill
  (`.claude/skills/verify-twogether/`). For changes with no direct UI effect,
  do at least a basic load-and-navigate test and also validate the specific
  behavior of the change.
- Check the visual result and responsiveness on desktop, tablet, and phone,
  including 320px-wide screens, for clipping, overlaps, and unintended
  horizontal scrolling. Inspect light and
  dark themes when there is UI.
- Exercise the controls and states the flow needs: filters, month/person
  switching, forms, empty states, filled data, persistence after reloading,
  and value hiding.
- Inspect console errors and failed requests. Fix problems the change
  introduced and repeat the validation of the fixed flow.
- Run `bun run typecheck`, `bun run lint`, `bun run lint:glaze`,
  `bun run format:check`, `bun run fitness`, `bun run doctor`, `bun run fallow`, `bun run test`,
  `bun run build`, `bun run e2e`, and `git diff --check`.
- Automated tests, code analysis, and build do not replace in-browser
  validation. Do not declare the task complete based only on those checks.
- Use isolated test data; preserve real data and unrelated work. Do not
  publish or deploy without authorization.
- If access, authentication, or tools prevent some validation, report the
  concrete blocker and what is left to verify. Do not present the change as
  fully validated; ask only for the information or action needed to finish
  the verification.
- In the final response, briefly record what was tested in the app, the
  results of the automated checks, and any real limitations.

## Lint, Doctor and Fallow

- `lint` runs oxlint (config in `oxlint.config.ts`) with the vendored
  anti-slop rules in `tools/oxlint/anti-slop/`. Fix findings instead of
  disabling rules or adding casts; a type assertion needs a `SAFETY:` comment
  that states the invariant. Update the vendored copy only through its
  `install-anti-slop` skill and record the commit in `UPSTREAM.md`.
- `lint:glaze` runs Glaze's ESLint rules (`glaze.eslint.config.mjs`) on app
  code. Fix every finding the way its message names; never add a disable
  comment. oxlint, Prettier, Doctor and fallow skip the vendored Glaze files,
  which Glaze's own rules check.
- `doctor` (React Doctor, `doctor.config.json`) and `fallow`
  (`.fallowrc.json`) fail on any finding. Suppress one only when it is a
  proven false positive, with the reason written next to the suppression.

## E2E

- `e2e` runs on the first free port in 3400-3499, from a random start
  (`E2E_PORT` overrides), against a throwaway SQLite file and
  never reuses a running dev server, so a `bun run dev` on 3000 is safe.
  Do not point it back at 3000 or at `data/twogether.sqlite`.
- Clerk test accounts are reused across runs. Keep `uniqueEmail` seeded by
  stable values (test title/project), never by file paths, timestamps, or
  worker indexes: every new email burns a user slot and the dev instance
  stops sign-ups at its user quota.
- Specs locate with `getByRole` or `getByLabel`, scoped to the visible
  region or row. Breakpoints can render the same text twice and hide one
  copy with CSS, so `bun run lint` bans `locator("span"|"p"|"div")` and
  `.first()`/`.nth()`/`.last()` after `getByText`. A copy hidden for a
  breakpoint must be `display: none` (`hidden`, `max-sm:hidden`) so it
  leaves the accessibility tree.

## State without useState or useEffect

- `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, and
  `useInsertionEffect` are banned by `bun run lint` (imports from `react`
  and `React.*` access). Do not disable the rule. The vendored Glaze
  components own their internal state; app code drives them through
  `value`/`onValueChange` from the stores below or leaves them uncontrolled.
- Server data and async results: React Query (`useQuery`, `useMutation`).
  Track pending, error, and success through the mutation instead of flags.
- Form fields and local picker values: React Hook Form (`useForm`,
  `useWatch`, `setValue`), with `zodResolver` when a schema exists.
- URL state (month, person, filters, list page): nuqs, with parsers in
  `src/features/budget/search.ts` built from the route schemas.
- Workspace dialogs (transaction, percentages, delete, settle) open through
  the URL: nuqs `dialogParams` in `src/features/budget/search.ts`, read by
  `hooks/use-workspace-dialogs.ts`.
- Every other sheet and popover: let Base UI own it uncontrolled; close from
  code through the `actions` ref, as `account-drawer.tsx` and
  `month-filter.tsx` do.
- Side effects: run them in the event handler, a route lifecycle hook
  (`onLeave`, `beforeLoad`), the router's `defaultOnCatch`, or
  `useBrowserSync` (`src/lib/use-browser-sync.ts`) for browser-only syncs.
- Tab-only client state that must stay out of the URL lives in the React
  Query cache, as `useHiddenValues` does.
- nuqs `parseAsIndex` maps `?page=0` to index `-1`. Wrap parsers so values
  outside the valid range read as absent, as `pageParam` does.

## React Query

- Cache ownership: React Query owns server data. Workspace snapshots live
  under `workspaceQueryKey`, one entry per month, built only by
  `workspaceQueryOptions(month)` (`src/features/budget/workspace.ts`).
  Mutations refresh it by invalidating that key in `hooks/use-mutation.ts`,
  the one refresh path.
- Loading before a URL change: `queryClient.query()` rejects on failure;
  `prefetchQuery` resolves either way, so never gate navigation on it (#102,
  pinned by `use-workspace-search.test.tsx`).
- `mutation.reset()` only detaches the observer; the request keeps running.
  Wrap it so an in-flight run keeps its pending state and error, as
  `useMutation` in `hooks/use-mutation.ts` does (#96, pinned by
  `use-mutation.test.tsx`).
- An optimistic updater paints every cached month and must match what the
  store writes. `optimistic.server.test.ts` runs each one against the server
  and fails on any difference; see One definition per mutation.

## Glaze

- The UI is built on the Glaze design system from design.how: Tailwind v4,
  components in `src/components/glaze/ui`, icons in
  `src/components/glaze/icon.tsx`, tokens and recipes in
  `src/components/glaze/{tokens,base,styles}.css`, helpers in
  `src/lib/glaze`. Follow `.claude/skills/glaze/SKILL.md` for every UI
  change, and read a component's page
  (`https://design.how/systems/glaze/components/<name>.md`) before using it.
- Glaze is scoped to `.glaze`. `src/routes/__root.tsx` imports its
  stylesheet, puts `glaze` on `<body>` and wraps the app in
  `GlazePortalProvider`, so dialogs, menus and toasts keep the tokens.
  `data-theme="dark"` on `<html>` flips them.
- Colour means status only: ok, warn, fail. Categories, partners and
  amounts are ink on paper; partners read through `PersonAvatar`.
- Breakpoints are Glaze's `sm` 640, `md` 768, `lg` 1024 and `xl` 1280, with
  `max-*` for max-width. Layouts must still fit a 320px screen.
- No CSS modules and no per-component CSS. When a token or component is
  missing, use the closest one and say so in the PR; never invent a token,
  an arbitrary value or an inline style to dodge `bun run lint:glaze`.
- Never emit conflicting utilities on one element (two `left-[...]`, two
  `text-[...]` without a variant). Cascade order decides the winner, not the
  order in `className`. Pick one branch conditionally. `bun run fitness`
  fails when a padding/margin shorthand and a side share one string
  (`m-0 mt-2`); keep only the sides you mean.
- The phone nav height lives once in `--mobile-nav-height`
  (`src/styles.css`). The nav, the space under the workspace and the toast
  offset read it (`h-(--mobile-nav-height)`, `pb-(--mobile-nav-height)`);
  `bun run fitness` checks those three uses.
- Vendored files: `src/components/glaze/**`, `src/lib/glaze/**` and
  `glaze.eslint.config.mjs` come from the registry in `components.json`.
  Add a component with
  `npx shadcn@latest add https://design.how/r/glaze/<name>.json`. Do not
  edit them except for the patches listed in
  `src/components/glaze/PATCHES.md`; reapply those after any
  `--overwrite`.

## Clock

- Read the time only through `@/lib/clock`: `now()` for an instant,
  `today(timeZone)` and `currentMonth(timeZone)` for calendar dates. Pass the
  reader's zone (`browserTimeZone()` from `@/lib/time-zone`, the time-zone
  cookie, or the MCP household zone), never the process zone. `bun run lint` bans `new Date()`
  and `Date.now()` elsewhere.

## Imports and boundaries

- Source-code imports in the repository must use the `@/` alias (`src/`),
  never relative paths (`./` or `../`).
- Do not change public URLs at runtime, `url()` in CSS, or imports of
  external packages.
- Keep imports at the top of the file. No inline imports unless the
  toolchain requires lazy loading.
- Exception: generated files that the toolchain rewrites with relative
  imports (e.g., TanStack Router's `src/routeTree.gen.ts`). Do not edit them
  to force the alias.
- The zone graph lives in `boundaries` in `.fallowrc.json`. Code outside
  `src/features/<name>/` reaches a feature only through its public API, the
  `<name>-api` zone: `index.ts` for functions and types, plus the component
  modules that routes or other features render (MCP's is its
  `endpoint.server.ts`). Every export of a listed module is public;
  `src/server`, `src/lib` and `src/components` never import features;
  `domain/` imports only `src/lib`. `bun run fallow` enforces it.
- Keep components out of `index.ts`. Route config (`beforeLoad`,
  `validateSearch`) loads eagerly, and a barrel that re-exports a component
  drags that component and its CSS into the main chunk. A component another
  feature or a route renders joins its feature's `-api` zone as its own
  module instead. `bun run fitness` fails when a feature `index.ts`
  re-exports or value-imports a component module.
- `oxlint.config.ts` keeps `domain/` free of React, TanStack, server modules
  and `node:*`. Only server-side files may import `*.server` modules or
  `@/server/**`: `*.server.ts`, `src/server/`, `actions/`, `src/start.ts`,
  the server-handler routes and the helpers listed in `SERVER_SIDE`. A new
  server-only file either takes the `.server.ts` suffix or joins that list.
- A fallow failure reads
  `boundary-violation:<file>:<line>:<file> -> <target> (<from zone> -> <to zone>)`.
  Fix it by importing from the feature's `index.ts` (export the symbol there
  if needed), moving shared code down into `src/lib` or `domain/`, or passing
  the value in. Change the zones only when the architecture itself changes.
- One exception: the `store` zone (`src/server/store.server.ts`,
  `src/server/middleware.ts`, `src/server/serve.server.ts`,
  `src/server/store-test-harness.ts`) is the composition root.
  `middleware.ts` belongs to it because `authMiddleware` loads the current
  user through `getStore()`, and `serve.server.ts` because every mutation
  handler runs its definition against `getStore()`. The zone alone may import
  feature stores, and only through each feature's `*.server.ts` entry zone
  (`auth-store`, `household-store`, `budget-store`). Features reach each
  other's stores only through `getStore()`. New server code stays out of
  that zone unless it composes stores; the rest of `src/server` still never
  imports features.
- `scripts/boundary-baseline.json` grandfathers violations that predate the
  gate. It must never grow. When you remove a listed import, `bun run fallow`
  fails on the stale entry: re-save with
  `bunx fallow dead-code --save-baseline scripts/boundary-baseline.json` and
  check that the diff only deletes lines. `bun run fitness` fails when the
  file has more entries than the copy at the merge-base with `origin/main`.

## Pull requests

- Merge only with `bun run merge-guard <pr>`. It waits for every check on
  the PR head with `gh pr checks --watch --fail-fast`, refuses unless all
  pass, and then squash-merges that exact head commit.
- Never run `gh pr merge` directly. GitHub branch protection is unavailable
  on this repository's plan, so nothing server-side stops a merge while CI is
  pending or red. Claude Code enforces this with a PreToolUse hook
  (`scripts/merge-guard-hook.ts`). Codex, Grok, and every other agent must
  follow the rule without a hook.
- `bun run merge-guard <pr> --dry-run` reports whether the PR would merge
  without merging it.
- Bot review findings: before you report a PR code-ready, every bot review
  thread on it has a reply with either the fix (the commit that makes it) or
  a concrete reason it does not apply. A finding answered after merge counts
  as ignored. merge-guard checks CI, not threads, so this one is on you.
- Do not attach, commit, or leave screenshots or videos under `.github/`
  (no `.github/assets`, no PR image dumps in that tree). Visual validation
  stays in the PR body: hosted/agent images and markdown embeds that are not
  files under `.github/`. Do not use the repository's git as a substitute for
  storing that media elsewhere.

## Money is `Cents`

- Amounts are the branded `Cents` type from `src/lib/decimal.ts`. Get one
  by parsing with `centsSchema` or from the `decimal.ts` helpers
  (`sumCents`, `minusCents`, `halfDown`, `percentageOf`); never cast a
  number to `Cents`. Tests use `cents()` from `src/test/cents.ts`.

## One definition per domain concept

- A domain type backed by a schema is `z.infer` of that schema
  (`Transaction` is `z.infer<typeof transactionObjectSchema>`). Add a field
  to the schema, never to a hand-written interface in `domain/types.ts`.
- A mutation's input type is `z.infer` of its schema, exported from the
  feature's `actions/mutations.ts` as `<Name>Input`. The store parameter and
  any optimistic updater that takes the whole input use that type instead of
  an object literal.
- Lock, settlement and ownership state comes from
  `transactionStatus(t, userId)` in `domain/status.ts`: `repayment`,
  `split`, `paidAt`, `userOwes` and `lock`. Outside `domain/`, do not branch
  on `settlementOf` or `split.paidAt`; map `lock` to copy at the edge, as
  `LOCKED` in `budget.server.ts` and `deleteLock` in `domain/view.ts` do.
- Rows saved before `memberId` existed have none, and four answers about
  them are kept on purpose and pinned in `domain/legacy-rows.test.ts`,
  `legacy-rows.server.test.ts` and `transaction-dialog.test.tsx`:
  - `ownerOf` (server writes and the optimistic paint) gives the row to its
    creator;
  - `transactionStatus` reads its split as owed by either partner;
  - so either partner, its creator included, may settle that split, and the
    repayment income is written without `memberId` too;
  - the dialog treats the viewer as the payer.

  Rows the app creates otherwise carry `memberId`. Change these answers
  together and deliberately.

- `bun run fitness` fails on a new interface in `domain/types.ts`, on a
  type there that is anything but exactly `z.infer`, `z.input` or
  `z.output` of a schema (no intersections or extra members), and on a new
  `settlementOf` or `split.paidAt` outside `domain/` and tests.
  `scripts/fitness-domain-baseline.tsv` grandfathers the existing ones, and
  fitness fails when it has more lines than at the merge-base with
  `origin/main`.

## One definition per mutation

- A mutation is one entry in `src/features/<name>/actions/mutations.ts`,
  `<name>: define("<name>", { ... })`: its gate, schema, store call (`run`)
  and, if the UI paints it early, its optimistic update. A mutation without
  input uses `defineCommand("<name>", { gate, run })`; its server fn has no
  `.validator()` and callers pass no arguments. The name gives the
  definition its identity, so a surface filed under another mutation with a
  compatible input still fails to compile. Add the entry and the store
  method, then run `bun run typecheck`: it names each surface below that
  still lacks it.
  - The server fn in `actions/index.ts`: one private
    `const <name> = createServerFn(...).validator(defs.<name>.parse).handler(serve(defs.<name>))`,
    listed in the feature's actions object (`budgetActions: BudgetActions`),
    typed from the registry.
  - Budget: the client handle in `useBudgetMutations`. Auth and household
    call `authActions` / `householdActions` through `useActionRun`.
  - The break-ui fake in `src/features/break-ui/actions.ts` (one tagged
    object per feature).
  - Budget: the MCP tool in `budgetTools`
    (`src/features/mcp/tools.server.ts`): a `writeTool(definition, spec)`
    whose spec owns the agent's arguments and answer, or `null` when agents
    should not reach it.
  - A parity scenario in `src/features/budget/optimistic.server.test.ts` when
    the entry has an optimistic update. `bun run test` fails when the paint
    disagrees with what the store writes.
- The Start compiler extracts only a top-level `const x = createServerFn()`,
  so never build server fns in a helper or an object literal; both leak
  server code into the client build.
- Code outside the feature reads the registry through its public module
  (`@/features/budget/registry`), never `index.ts`: the registry's
  top-level calls would land in the eager main chunk.
- Client-only data an optimistic update needs (the row a restore puts back)
  is the updater's third parameter and `run`'s second argument. It never
  goes on the wire.
- `bun run fitness` (`scripts/fitness-mutations.ts`) fails, in a feature
  with a registry, on a registry entry whose `define` name or `run` store
  method differs from its key, on a statement whose `.middleware([...])` is
  not its definition's gate, on an exported server fn statement, on a
  statement whose validator or handler names another definition, on a
  statement used
  anywhere but as its own entry in the one exported actions object, on an
  actions object holding anything else, on a statement that
  is not a top-level `const`, and on a POST server fn outside
  `actions/index.ts`.

---

<!-- fallow:setup-hooks:start -->

## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to...                                     | Run                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| delete an "unused" export or file                                 | `fallow dead-code --trace <file>:<export>`                                                                                                              |
| prove a TypeScript symbol's exact consumers before refactoring    | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>`                                                                         |
| find how one module reaches another                               | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.) |
| delete an "unused" dependency                                     | `fallow dead-code --trace-dependency <name>`                                                                                                            |
| commit or open a PR                                               | `fallow audit --base <ref>`                                                                                                                             |
| read a diff before approving it                                   | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row)                                  |
| prioritize refactoring                                            | `fallow health --hotspots --targets`                                                                                                                    |
| ask who owns code                                                 | `fallow health --ownership`                                                                                                                             |
| check untested-but-reachable code                                 | `fallow health --coverage-gaps`                                                                                                                         |
| consolidate duplication                                           | `fallow dupes --trace dup:<fingerprint>`                                                                                                                |
| find feature flags                                                | `fallow flags`                                                                                                                                          |
| check which architecture rules apply to a file before changing it | `fallow guard <files>`                                                                                                                                  |
| surface security candidates                                       | `fallow security`                                                                                                                                       |
| understand a finding                                              | `fallow explain <issue-type>`                                                                                                                           |
| scope a monorepo                                                  | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command)                                                                    |

<!-- fallow:setup-hooks:end -->
