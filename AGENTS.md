# Working rules

## Mandatory validation for any change

- Every change, regardless of size or type (code, UI, styles, copy,
  configuration, dependencies, or documentation), requires validating the app
  running before finishing the task. Do not skip this step by considering the
  change simple or low-impact.
- Start the app with Bun and use a real browser to run the affected flow
  end to end. For changes with no direct UI effect, do at least a basic
  load-and-navigate test of the app and also validate the specific behavior
  of the change.
- Check the visual result and responsiveness on desktop, tablet, and phone,
  including 320px-wide screens. Verify clipping, overlaps, and unintended
  horizontal scrolling. Inspect light and dark themes when there is UI.
- Exercise the relevant controls and states: filters, month/person switching,
  forms, empty states, filled data, persistence after reloading, and value
  hiding, as the affected flow requires.
- Inspect console errors and failed requests. Fix problems introduced by the
  change and repeat the validation of the fixed flow.
- Run `bun run typecheck`, `bun run lint`, `bun run fitness`,
  `bun run test`, `bun run build`, `bun run e2e`, and `git diff --check`.
  If dependencies are missing, run `bun install --frozen-lockfile` before
  the checks. Playwright Chromium: `bunx playwright install chromium`.
- `e2e` runs on its own port (3400) against a throwaway SQLite file and
  never reuses a running dev server, so a `bun run dev` on 3000 is safe.
  Do not point it back at 3000 or at `data/twogether.sqlite`.
- Clerk test accounts are reused across runs. Keep `uniqueEmail` seeded by
  stable values (test title/project), never by file paths, timestamps, or
  worker indexes: every new email burns a user slot and the dev instance
  stops sign-ups at its user quota.
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
  `src/components/ui/brand.tsx` does for its mark bars.
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

---

<!-- fallow:setup-hooks:start -->
## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| prove a TypeScript symbol's exact consumers before refactoring | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>` |
| find how one module reaches another | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.) |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| read a diff before approving it | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row) |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| check which architecture rules apply to a file before changing it | `fallow guard <files>` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |
<!-- fallow:setup-hooks:end -->
