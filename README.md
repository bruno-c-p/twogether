# twogether

Shared budget for **two people**, built with TanStack Start, React, TypeScript, and Bun.

## Running

Requires Bun 1.3.14+ and Node.js 22.12+ for the build tools. The server runs on Bun with its native SQLite.

```sh
bun install
cp .env.example .env.local
# Fill in the variables below in .env.local
bun run dev
```

- `RESEND_API_KEY`: Resend key, server-side only.
- `RESEND_FROM`: sender from a domain verified in Resend, such as `Twogether <access@your-domain.com>`.
- `APP_ORIGIN`: application origin, without a path. Local: `http://localhost:3000`. To test on another device, use an address reachable by both and open the app through that same address. Production requires HTTPS.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: credentials injected by the Vercel Turso integration. When present, the server uses the shared remote database.
- `BUDGET_DATABASE_PATH`: local fallback when Turso is not configured, defaults to `./data/twogether.sqlite`.

Restart the server after changing the environment. In `bun run dev`, local access uses the email you provide to find or create the account directly in SQLite and does not send messages through Resend; this shortcut only exists with `NODE_ENV=development`. Outside development, without Resend configured, the app does not send access links.

## Access and couple

1. In development, provide your email to sign in directly; if it does not exist yet, the account is created and proceeds to onboarding. In other environments, receive a magic link through Resend. There is no password and no distinction between sign-up and sign-in.
2. In development, the new account goes straight to the name step; in other environments, open the magic link — the server consumes the token, writes the session cookie, and redirects to `/` without leaving `?access=` in the URL. On the first visit, provide your name.
3. Start the budget or accept an invite. Invites may accompany the access email.
4. Under **Our space**, generate and copy an invite for your partner. The link accepts a single person, expires in 48 hours, and can be canceled. Generating another invalidates the previous one.

The access link expires in 15 minutes, works once, and authenticates only whoever has access to the email. Sessions last 30 days. Signing out revokes the current session. Both see and edit all couple data; each account belongs to only one budget and the database limits each budget to two people.

## Budget

- Transactions with description, amount, date, account, goal, and tags; each new transaction is automatically associated with the signed-in person and keeps that attribution when edited.
- Shared bank accounts, with an initial balance and current balance (initial + income − expenses); creating or editing a transaction requires choosing an account.
- **Us** view and individual filters. Each goal's planned amount always uses the couple's total income, even with an individual filter active.
- Six fixed goals with editable percentages that add up to 100%: fixed costs 30%, pleasures 10%, comfort 15%, goals 15%, financial freedom 25%, and knowledge 5%. The split applies to every month.
- Editing, deleting, and undoing per transaction, plus search and filters by goal, type, and tag. Amounts in whole cents.
- Original authorship and the last person to edit are preserved.
- Each change is a validated `createServerFn`; the UI reads the loader snapshot and calls `router.invalidate()` after saving. When you return to the tab, focus the window, or reconnect to the internet, the budget is synced with your partner's changes. Concurrent changes to the same entry or to the percentages are rejected with guidance to review the current version; independent additions do not overwrite each other.

## Persistence and deployment

Turso Cloud provides the shared production SQLite over HTTP; the libSQL client initializes the schema and uses transactions on the server. Without the Turso variables, local development uses SQLite in `data/` (ignored by Git). Sessions and tokens are stored by hash. HttpOnly/`SameSite=Lax` cookies and Secure under HTTPS. App reads and writes go through server functions with `.validator()`; the SSR document and authenticated payloads use `Cache-Control: private, no-store`. Env and credentials are not part of the client bundle.

To configure locally after connecting the resource in Vercel, run `vercel env pull .env.local --yes`. Deployment uses Nitro to generate the TanStack Start handler compatible with Vercel. Emails are transactional; the app does not automatically send invites to third parties.

## Verification

```sh
bun run typecheck
bun run lint
bun run fitness
bun run test
bun run build
```

Vitest covers calculations/validation; Bun tests SQLite, isolation, member limit, invites, link access, expiration, concurrent editing, and session cookies. Email is replaced by a test transport in tests, without sending real messages.

References: [TanStack Start server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [Resend send API](https://resend.com/docs/api-reference/emails/send-email).
