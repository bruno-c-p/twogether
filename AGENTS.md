# Working rules

## Worktree setup

- Run `bun run setup` once in every new worktree, and again whenever
  dependencies change. It installs dependencies from the frozen lockfile,
  links `.env.local` to the dev env, installs Playwright Chromium, and
  validates the client env. Rerunning it is safe.
- The dev env is `~/workspaces/twogether/.env.local`. Set
  `TWOGETHER_DEV_ENV` to use another file.
- Setup refuses an env file with live Clerk keys (`sk_live_`, `pk_live_`)
  or a remote database URL, and refuses to replace a regular `.env.local`.
  Fix what its message names. Never copy the main checkout's `.env.local`
  into a worktree: it holds production Turso credentials.

## Mandatory validation for any change

- Every change, regardless of size or type (code, UI, styles, copy,
  configuration, dependencies, or documentation), requires validating the app
  running before finishing the task. Do not skip this step by considering the
  change simple or low-impact.
- Start the app with Bun and use a real browser to run the affected flow
  end to end. For changes with no direct UI effect, do at least a basic
  load-and-navigate test of the app and also validate the specific behavior
  of the change.
- Do this with the `verify-twogether` skill (`.claude/skills/verify-twogether/`).
- Check the visual result and responsiveness on desktop, tablet, and phone,
  including 320px-wide screens. Verify clipping, overlaps, and unintended
  horizontal scrolling. Inspect light and dark themes when there is UI.
- Exercise the relevant controls and states: filters, month/person switching,
  forms, empty states, filled data, persistence after reloading, and value
  hiding, as the affected flow requires.
- Inspect console errors and failed requests. Fix problems introduced by the
  change and repeat the validation of the fixed flow.
- Run `bun run typecheck`, `bun run lint`, `bun run format:check`,
  `bun run fitness`, `bun run doctor`, `bun run fallow`, `bun run test`,
  `bun run build`, `bun run e2e`, and `git diff --check`.
  In a fresh worktree, run `bun run setup` first (see Worktree setup).
- `lint` runs oxlint (config in `oxlint.config.ts`) with the vendored
  anti-slop rules in `tools/oxlint/anti-slop/`. Fix findings instead of
  disabling rules or adding casts; a type assertion needs a `SAFETY:` comment
  that states the invariant. Update the vendored copy only through its
  `install-anti-slop` skill and record the commit in `UPSTREAM.md`.
- `doctor` (React Doctor, `doctor.config.json`) and `fallow`
  (`.fallowrc.json`) fail on any finding. Suppress one only when it is a
  proven false positive, with the reason written next to the suppression.
- `e2e` runs on the first free port in 3400-3499, from a random start
  (`E2E_PORT` overrides), against a throwaway SQLite file and
  never reuses a running dev server, so a `bun run dev` on 3000 is safe.
  Do not point it back at 3000 or at `data/twogether.sqlite`.
- Clerk test accounts are reused across runs. Keep `uniqueEmail` seeded by
  stable values (test title/project), never by file paths, timestamps, or
  worker indexes: every new email burns a user slot and the dev instance
  stops sign-ups at its user quota.
- E2E specs locate with `getByRole` or `getByLabel`, scoped to the visible
  region or row. Breakpoints can render the same text twice and hide one
  copy with CSS, so `bun run lint` bans `locator("span"|"p"|"div")` and
  `.first()`/`.nth()`/`.last()` after `getByText`. A copy hidden for a
  breakpoint must be `display: none` (`hidden`, `max-bpN:hidden`) so it
  leaves the accessibility tree.
- Automated tests, code analysis, and build do not replace in-browser
  validation. Do not declare the task complete based only on those checks.
- Use isolated test data; preserve real data and unrelated work.
  Do not publish or deploy without authorization.
- If access, authentication, or tools prevent some validation, report the
  concrete blocker and what is left to verify. Do not present the change as
  fully validated; ask only for the information or action needed to finish
  the verification.
- In the final response, briefly record what was tested in the app, the
  results of the automated checks, and any real limitations.

## No media under `.github/`

- Do not attach, commit, or leave screenshots or videos under `.github/`
  (no `.github/assets`, no PR image dumps in that tree).
- Visual validation stays in the PR body: hosted/agent images and markdown
  embeds that are not files under `.github/`.
- Do not use the repository's git as a substitute for storing that media
  elsewhere.

## State without useState or useEffect

- `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, and
  `useInsertionEffect` are banned by `bun run lint` (imports from `react`
  and `React.*` access). Do not disable the rule.
- Server data and async results: React Query (`useQuery`, `useMutation`).
  Track pending, error, and success through the mutation instead of flags.
- Form fields and local picker values: React Hook Form (`useForm`,
  `useWatch`, `setValue`), with `zodResolver` when a schema exists.
- URL state (month, person, filters, list page, open dialogs): nuqs, with
  parsers in `src/features/budget/search.ts` built from the route schemas.
- Open/closed UI (sheets, dialogs): let Base UI own it uncontrolled; close
  from code through the `actions` ref.
- Side effects: run them in the event handler, a route lifecycle hook
  (`onLeave`, `beforeLoad`), the router's `defaultOnCatch`, or
  `useBrowserSync` (`src/lib/use-browser-sync.ts`) for browser-only syncs.
- Tab-only client state that must stay out of the URL lives in the React
  Query cache, as `useHiddenValues` does.
- Loading before a URL change: `queryClient.query()` rejects on failure;
  `prefetchQuery` resolves either way, so never gate navigation on it.
- `mutation.reset()` only detaches the observer; the request keeps running.
  Wrap it so an in-flight run keeps its pending state and error.
- nuqs `parseAsIndex` maps `?page=0` to index `-1`. Wrap parsers so values
  outside the valid range read as absent, as `pageParam` does.

## Component folders

- A component that owns a CSS module lives in its own folder:
  `<component>/<component>.tsx` next to `<component>.module.css`, mirroring
  `src/components/ui/button/`.
- Components without a CSS module stay flat, e.g. inside
  `features/<name>/components/`.
- `bun run fitness` fails when a `*.module.css` is not inside a folder named
  after it or when the sibling component file is missing.
- New components default to UnoCSS utilities and stay flat. Keep a CSS module
  only when utilities cannot express the rule (e.g. `::backdrop`,
  `:focus-within` on a nested input, sibling selectors across component
  boundaries); in that case move the component back into its own folder.

## Styling with UnoCSS

- Style with utilities; tokens come from `uno.config.ts`, which maps
  `src/styles.css` custom properties into `theme.colors`. Use token utilities
  (`bg-surface`, `text-text-muted`, `border-border`) instead of raw colors.
- Dark mode: tokens flip through `[data-theme="dark"]`, so most rules need no
  `dark:` variant. The `dark:` variant is bound to that same attribute when a
  non-token override is unavoidable.
- Use the project breakpoints (`bp1450`, `bp1190`, `bp1000`, `bp800`,
  `bp620`, `bp360`). They are min-width by default; prefix with `max-` for
  max-width (`max-bp620:p-[13px]`, emitted as `max-width: 619.9px`).
- Never emit conflicting utilities on one element (two `left-[...]`, two
  `text-[...]` without a variant). Cascade order decides the winner, not the
  order in `className`. Pick one branch conditionally, as
  `src/components/ui/brand.tsx` does for its mark bars. `bun run fitness`
  fails when a padding/margin shorthand and a side share one string
  (`m-0 mt-2`); keep only the sides you mean.
- No new arbitrary px values in class strings: use a theme utility (spacing
  is 4px per step, so `w-8`, not `w-[32px]`) or add a named token to
  `uno.config.ts`. `bun run fitness` fails on any px value not grandfathered
  in `scripts/fitness-px-baseline.tsv`; never add entries to that file.
- The phone nav height lives once in `--mobile-nav-height` (`h-mobile-nav`,
  `pb-mobile-nav`). Anything that clears the nav reads that token, not a
  pixel guess.
- Utilities live next to the markup, grouped in readable `cx(...)` lines or a
  variant map like `src/components/ui/button.tsx`. Repeated cross-component
  patterns belong in `shortcuts` in `uno.config.ts`.
- Font families go under `theme.font` in `uno.config.ts` (`font-heading`,
  `font-sans`); preset-wind4 ignores `theme.fontFamily`.
- `src/routes/__root.tsx` imports `virtual:uno.css`; keep that import, and
  keep `unocss` in devDependencies. Tailwind and shadcn stay banned by
  `bun run fitness`.
- `src/styles.css` keeps tokens, resets, and global element rules only. Do
  not add per-component rules there.

## Clock

- Read the time only through `@/lib/clock`: `now()` for an instant,
  `today(timeZone)` and `currentMonth(timeZone)` for calendar dates. Pass the
  reader's zone (`browserTimeZone()`, the time-zone cookie, or the MCP
  household zone), never the process zone. `bun run lint` bans `new Date()`
  and `Date.now()` elsewhere.

## Absolute imports

- Source-code imports in the repository must use the `@/` alias (`src/`),
  never relative paths (`./` or `../`).
- Do not change public URLs at runtime, `url()` in CSS, or imports of
  external packages.
- Keep imports at the top of the file. No inline imports unless the
  toolchain requires lazy loading.
- Exception: generated files that the toolchain rewrites with relative
  imports (e.g., TanStack Router's `src/routeTree.gen.ts`). Do not edit them
  to force the alias.

## Import boundaries

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
  re-exports or value-imports a component module; `theme/index.ts` is the
  one listed exception.
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

## Merging pull requests

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
  and, if the UI paints it early, its optimistic update. The name gives the
  definition its identity, so a surface filed under another mutation with a
  compatible input still fails to compile. Add the entry and the store
  method, then run `bun run typecheck`: it names each surface below that
  still lacks it.
  - The server fn in `actions/index.ts`: one private
    `const <name> = createServerFn(...).validator(defs.<name>.parse).handler(serve(defs.<name>))`,
    listed in the feature's actions object (`budgetActions`), which
    `satisfies` the registry.
  - The client handle in `useBudgetMutations`.
  - The break-ui fake in `src/features/break-ui/actions.ts`.
  - The MCP tool in `budgetTools` (`src/features/mcp/tools.server.ts`): a
    `writeTool(definition, spec)` whose spec owns the agent's arguments and
    answer, or `null` when agents should not reach it.
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
