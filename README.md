# twogether

Shared budget for **two people**, built with TanStack Start, React, TypeScript, and Bun.

## Running

Requires Bun 1.3.14+ and Node.js 22.12+ for the build tools. The server runs on Bun with its native SQLite.

```sh
bun install
cp .env.example .env.local
# Fill in the Clerk keys in .env.local (or run `npx clerk@latest init`)
bun run dev
```

- `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: Clerk application keys. Development keys can be written by `npx clerk@latest init`; claim the application with `npx clerk@latest auth login` before production.
- `CLERK_SIGN_IN_URL` and `CLERK_SIGN_UP_URL`: optional, keep Clerk redirects on `/entrar`.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: credentials injected by the Vercel Turso integration. When present, the server uses the shared remote database.
- `BUDGET_DATABASE_PATH`: local fallback when Turso is not configured, defaults to `./data/twogether.sqlite`.

Restart the server after changing the environment.

## Access and couple

1. Sign in on `/entrar` with your e-mail and the six-digit code Clerk sends. There is no password and no distinction between sign-up and sign-in: the embedded `<SignIn />` runs Clerk's sign-in-or-up flow, so an unknown e-mail verifies first and the account is created after the code is confirmed.
2. Sign-in and onboarding live on `/entrar`. The budget at `/` and settings at `/conta` sit under the pathless `_authenticated` layout and require a session, a name, and a household; anything missing redirects to `/entrar`. With a name and a household, `/entrar` continues to `/`.
3. Invites are links to `/convite/<token>`. The route handles sign-in or sign-up, returns to the same invite, asks for a name when needed, and only then joins the household. Legacy `?convite=` links on `/` redirect to it.
4. On `/conta` (**Nosso espaço**), generate and copy an invite for your partner. The link accepts a single person, expires in 48 hours, and can be canceled. Generating another invalidates the previous one.

Clerk owns credentials, sessions, and e-mail delivery; the instance enables e-mail code only (password and social sign-in are disabled) with strict user enumeration protection, which is what powers the single sign-in-or-up flow. Signing out ends the Clerk session. Both see and edit all couple data; each account belongs to only one budget and the database limits each budget to two people.

## Budget

- Transactions with description, amount, date, goal, and tags; each new transaction is automatically associated with the signed-in person and keeps that attribution when edited.
- **Us** view and individual filters. Each goal's planned amount always uses the couple's total income, even with an individual filter active.
- Six fixed goals with editable percentages that add up to 100%: fixed costs 30%, pleasures 10%, comfort 15%, goals 15%, financial freedom 25%, and knowledge 5%. The split applies to every month.
- Editing, deleting, and undoing per transaction, plus search and filters by goal, type, and tag. Amounts in whole cents.
- Original authorship and the last person to edit are preserved.
- Split expenses: turn on **Dividir com …** on an expense and the other person owes half (rounded down). The payer keeps the full expense. Only the person who owes can mark it paid, picking the date; that records an income for the payer and an expense for the partner. Those repayment entries count in individual views but not in **Us**, and undoing the payment removes them. A paid split locks its amount, type, split, and deletion until it is unmarked.
- Each change is a validated `createServerFn`. The workspace seeds TanStack Query from the loader snapshot; saving, deleting, or undoing a transaction updates that cache immediately, then reconciles with the server. Focus, visibility, and reconnect refetch the snapshot so you see your partner's changes. Concurrent edits to the same entry or to the percentages are rejected with guidance to review the current version; independent additions do not overwrite each other. The month lives in the URL (`?month=YYYY-MM`); the first visit without it redirects to the current month.

## Persistence and deployment

Turso Cloud provides the shared production SQLite over HTTP; the libSQL client initializes the schema and uses transactions on the server. Without the Turso variables, local development uses SQLite in `data/` (ignored by Git). Clerk stores identities and sessions; the local database stores each profile name, household membership, percentages, and invite hashes. App reads and writes go through server functions with `.validator()`; the SSR document and authenticated payloads use `Cache-Control: private, no-store`. Secrets are not part of the client bundle.

To configure locally after connecting the resource in Vercel, run `vercel env pull .env.local --yes`. Deployment uses Nitro to generate the TanStack Start handler compatible with Vercel. E-mails are transactional and sent by Clerk; the app does not automatically send invites to third parties.

## Verification

```sh
bun run typecheck
bun run lint
bun run fitness
bun run test
bun run build
bun run e2e
```

Vitest covers calculations/validation; Bun tests SQLite, user provisioning, isolation, member limit, invites, expiration, and concurrent editing. Playwright runs the real flows against a Clerk development instance using `@clerk/testing` and e2e test e-mails; because development instances cap at 100 users, each test derives one stable account from its spec file and title so re-runs reuse them. CI runs the same checks; the E2E step needs the `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` repository secrets and is skipped with a warning when they are absent.

References: [TanStack Start server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [Clerk TanStack Start SDK](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart), [Clerk testing with Playwright](https://clerk.com/docs/guides/development/testing/playwright/overview).
