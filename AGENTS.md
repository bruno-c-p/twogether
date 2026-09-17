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
  `bun run test`, `bun run build`, `bun run e2e:must`, and `git diff --check`.
  If dependencies are missing, run `bun install --frozen-lockfile` before
  the checks. Playwright Chromium: `bunx playwright install chromium`.
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
