---
name: verify-twogether
description: "Launch an isolated twogether web app (production build, throwaway SQLite, own port), sign in with existing Clerk e2e users, and drive features in a real Chromium the way a user does, capturing screenshots, ARIA snapshots, console errors and failed requests at 320px/tablet/desktop in light and dark. Use to satisfy AGENTS.md's mandatory in-browser validation for any twogether change, or whenever you need proof that a flow works in the running app."
---

# Verify twogether

twogether is a shared budget web app (TanStack Start, Clerk auth, SQLite). Users touch one surface: the browser UI, in Portuguese (pt-BR). The MCP endpoint at `/mcp` is a second surface; this skill does not cover it.

Everything runs through one helper, from the repo root:

```sh
.claude/skills/verify-twogether/scripts/verify.ts launch [--no-build]
.claude/skills/verify-twogether/scripts/verify.ts doctor  "$RUN"
.claude/skills/verify-twogether/scripts/verify.ts drive   "$RUN" <journey.ts>
.claude/skills/verify-twogether/scripts/verify.ts cleanup "$RUN"
```

## Hard rules

- Never drive, restart, or kill the user's `bun run dev` on port 3000, and never open `data/twogether.sqlite`. The helper only uses ports 3500-3599 (e2e uses 3400-3499, so a parallel `bun run e2e` cannot collide) and a fresh SQLite file in a temp dir.
- The Clerk dev instance is at its 100-user quota. Sign in only as the existing e2e users the helper knows (`solo`, `ana`, `bia`). It looks them up and refuses to create one. Do not call `createUser`, do not invent new emails, and do not sign up through the Clerk form.
- Evidence never goes under the repo, and never under `.github/`. Do not commit it.

## Launch

Prerequisite: `bun run setup` has run in this worktree (it links the test-only `.env.local` and installs Chromium).

```sh
.claude/skills/verify-twogether/scripts/verify.ts launch
```

This runs `bun run build`, picks a free port in 3500-3599, creates a scratch dir `$TMPDIR/twogether-verify-XXXXXX/` holding an empty `budget.sqlite`, and starts `node .output/server/index.mjs` detached with `BUDGET_DATABASE_PATH` set to that file, the Turso variables blanked, and the Clerk test keys from `.env.local`. The schema is created on first connect, so an empty data dir is enough. The helper refuses a `.env.local` with live Clerk keys.

It is ready when the last two lines are:

```
ready http://127.0.0.1:35NN
RUN=/Users/<you>/.local/state/twogether-verify/<timestamp>
```

`ready` means `/manifest.webmanifest` answers 200 and `/entrar` renders the app title. Keep the `RUN` path: every other command takes it. Pass `--no-build` only when you built this exact tree a moment ago. Doctor fails if the source changed after launch.

Why the production build: the e2e suite moved off `vite dev` because the dev SSR module runner races on server-function modules. Verify the artifact that ships.

## Doctor

```sh
.claude/skills/verify-twogether/scripts/verify.ts doctor "$RUN"
```

Read-only. Run it first, and again whenever anything looks off. Every line must say `ok`:

- the run was not cleaned up
- the port is in 3500-3599 (never 3000)
- the database lives in this run's scratch dir, not `data/`
- the recorded pid is alive and is `.output/server/index.mjs`
- that pid owns the listening port
- `/manifest.webmanifest` and `/entrar` respond
- the build matches the working tree (HEAD + diff of `src`, `public`, Vite/Uno config). If this fails, `cleanup` and `launch` again
- the `solo`, `ana` and `bia` Clerk test users exist

`drive` runs doctor itself and refuses an unhealthy instance.

## Drive

A journey is a TypeScript file whose default export receives a `Kit` (types in `scripts/verify.ts`):

```ts
import type { Kit } from "../scripts/verify.ts";

export default async function journey(kit: Kit) {
  const { page, expect, step, shot } = kit;
  step("sign in and create a household");
  await kit.onboard(page, "solo", "Ana");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await shot(page, "overview");
}
```

```sh
.claude/skills/verify-twogether/scripts/verify.ts drive "$RUN" .claude/skills/verify-twogether/journeys/transactions.ts
```

Write one-off journeys in a scratch dir outside the repo (for example `/tmp/<task>/journey.ts`). Keep a journey in `journeys/` only when it is a maintained proof for a mapped feature.

What the kit gives you:

| Member                              | Does                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page`                              | Chromium page, `pt-BR`, `America/Sao_Paulo`, 1280x800, light, `baseURL` set (use relative `goto("/")`)                                                                                     |
| `newPage()`                         | A page in a fresh browser context (a second person)                                                                                                                                        |
| `onboard(page, who, name)`          | Signs in as `solo`, `ana` or `bia` with a Clerk sign-in token, sets the name, and creates the household (skips household creation on `/convite/…`, where the invite is accepted instead) |
| `invitePartner(owner, who, name)`   | Generates an invite from the owner's drawer, signs `who` in on a new page, accepts it, reloads the owner. Returns the partner page                                                          |
| `setMonth(page, "YYYY-MM")`         | Picks the month through the month picker, as a user does                                                                                                                                   |
| `reload(page)`                      | Reloads and waits for React hydration                                                                                                                                                      |
| `shot(page, name)`                  | Full-page PNG plus ARIA snapshot (`name.png`, `name.aria.yml`)                                                                                                                             |
| `sweep(page, name)`                 | 320x720, 768x1024 and 1280x800, each in light and dark: asserts `html[data-theme]`, records horizontal overflow as a problem, shoots each. Restores desktop/light                           |
| `evidence`                          | This journey's evidence dir, for any extra artifact                                                                                                                                        |
| `step(label)`                       | Appends a timestamped line to `transcript.md`                                                                                                                                              |
| `expect`                            | Playwright's `expect`                                                                                                                                                                      |

Every page from the kit is watched. Console errors, page errors, HTTP responses >= 400, and failed requests (except `net::ERR_ABORTED` from navigations) are problems. Any problem, or a thrown journey, makes `drive` exit 1.

Locator rules (the same ones `bun run lint` enforces on e2e specs): use `getByRole` and `getByLabel`, scoped to a named region, dialog or row. No `locator("span"|"p"|"div")`, no `.first()`/`.nth()`/`.last()` after `getByText`. Breakpoints render some text twice and hide one copy, so scope to the visible region. Wait for an element or URL, never a fixed sleep.

Person switching, splits and settle need two people: onboard `ana`, then `invitePartner(page, "bia", "Bia")`. `solo` covers everything else.

The feature map in [`features/README.md`](features/README.md) is the recipe source. Read the matching feature file before driving, and cover every entry point it lists for the behavior you changed.

## Evidence

Each run writes to `~/.local/state/twogether-verify/<timestamp>/`:

- `run.json`: port, pid, scratch dir, database path, source digest, launch and cleanup times
- `server.log`: copied from scratch at cleanup
- `<journey>/transcript.md`: each `step` with timestamps, then `PASSED` or `FAILED: <reason>`
- `<journey>/*.png` and `*.aria.yml`: action and result states, plus the sweep matrix
- `<journey>/failure-N.png`: every open page at the moment a journey threw
- `<journey>/problems.json`: console errors, failed requests, overflow. `noise` lists aborted navigation fetches

Proof standards:

- Drive the real user path: buttons, dialogs, the month picker. No test-only endpoints, no direct DB writes, no setting React state.
- Capture the action and the resulting state, not only the final screen.
- Prove persistence with `reload` (or a second person's page), not with the toast. A toast only says the client sent the request.
- AGENTS.md's bar for UI changes: 320px, tablet and desktop; light and dark; no horizontal scroll; no console errors or failed requests; persistence after reload; value hiding; month and person switching; empty and filled states, as the change requires. `sweep` covers the viewport and theme part. The rest comes from the feature file.
- Report the `RUN` path and the journey's `PASSED`/`FAILED` line in your final message.

## Cleanup

```sh
.claude/skills/verify-twogether/scripts/verify.ts cleanup "$RUN"
```

Stops the recorded pid only if it is still our `.output/server/index.mjs` (never by name, never anything on another port), copies `server.log` into the run dir, deletes the scratch dir and its SQLite file, and stamps `cleanedAt` in `run.json`. Evidence stays. Run cleanup after every run, including failed launches and failed drives, before trying again.

## Helpers

- `scripts/verify.ts`: the launch/doctor/drive/cleanup helper above. Executable with Bun (`#!/usr/bin/env bun`); it resolves Playwright, `@clerk/testing` and `@clerk/backend` from the repo's `node_modules`.
- `journeys/transactions.ts`: maintained proof for [transactions](features/transactions.md). Signs in, covers empty state, add, reload, edit, filters, search, month switch, delete with undo, value hiding, and the filled sweep.

## Gotchas

- The build is shared with `bun run e2e` (`.output/`). Launch rebuilds by default, so an e2e run started afterwards uses your tree, which is what you want in the same worktree.
- `bun run e2e` resets nothing of yours: it uses its own port range and its own temp database. The two can run at the same time.
- The Clerk users are shared with e2e. That is safe because sessions are per browser context and households live in each run's own SQLite file.
- `sweep` drives the theme through `prefers-color-scheme`. If the journey clicked `Tema escuro`/`Tema claro`, the stored preference overrides it and the sweep fails on `data-theme`. Click `Tema sistema` first.
- Value hiding is tab-only state. A reload shows values again by design.
