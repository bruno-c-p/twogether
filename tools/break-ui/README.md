# UI stress harness

Run `bun run dev:break-ui`, then open
`http://localhost:3210/?data=worst&month=2026-10`.

The standalone Vite configuration renders the application's actual workspace,
screens, dialogs, name/invite forms and account view. It substitutes server
actions with local fixtures and does not load Clerk or send analytics. The normal
application build does not import this entry.

The selector persists `data=demo|worst|empty|one|huge` in the URL across navigation.
Edits persist in this origin's localStorage, independently for each dataset.
Reset restores the selected fixture. The one-person and empty fixtures expose
invitation controls. `/entrar` renders the production name and invite forms.

Fixtures are validated against production schemas. Limits: names 50 UTF-16
code units, descriptions 80, tags 24 each / 8 per transaction, positive integer
cents up to 99,999,999,999, percentages 0–100 with two decimals and total 100.

This is a rendering and form-validation harness. Local actions use the app's
optimistic update helpers; they do not reproduce server concurrency, authorization,
recurrence expansion, invitation delivery or settlement repayment creation.
Use `bun run e2e` for those flows against an isolated SQLite database and Clerk.
The audit report distinguishes visually observed failures from scale risks.

Screenshots and machine-readable results remain under `output/playwright/`,
outside `.github/`. Do not include that media directory in a production commit.
