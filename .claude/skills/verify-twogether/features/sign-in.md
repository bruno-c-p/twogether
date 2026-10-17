# Sign-in redirect

A signed-out visitor who opens any private page lands on the `/entrar` gate. After Clerk sign-in, a new person names themselves and creates a household, then reaches the overview. Invite links keep their `/convite/<token>` path through sign-in.

## Sub-features

- `gate-redirect` sends `/`, `/transacoes`, `/orcamento` and `/?month=…` to `/entrar` when signed out.
- `gate-render` shows the hero, the Clerk form, and the theme picker on the gate.
- `name` asks "Como chamamos você?" until the person has a name.
- `household` offers "Começar nosso orçamento" until the person has a household.
- `return` sends a signed-in person with a name and household from `/entrar` to `/`.
- `invite-path` keeps `/convite/<token>` (and legacy `/?convite=<token>`) through sign-in.
- `sign-out` ends the session and returns to the gate.

## How to get to it (user POV)

- Open any app URL while signed out.
- Open an invite link `/convite/<token>`.
- Choose `Sair da conta` in the account drawer, or the header button whose name starts with `Sair de `.

## Driving it with verify.ts

Preconditions:

- Fresh instance from `launch`, doctor healthy.
- A new browser context (no cookies). `kit.page` starts that way.

- **Redirect.** `await page.goto("/?month=2026-09")`. URL matches `/\/entrar(?:\?|$)/` and `getByRole("heading", { name: /A vida a dois/ })` is visible. Repeat for `/transacoes` and `/orcamento`.
- **Gate render.** `getByRole("group", { name: "Aparência" })` is visible with buttons `Tema claro`, `Tema escuro`, `Tema sistema`. The page title is `twogether — Orçamento a dois`. `shot(page, "gate")` and `sweep(page, "gate")`.
- **Sign in, name, household.** `await kit.onboard(page, "solo", "Ana")`. It waits for `Como chamamos você?`, fills `getByLabel("Seu nome")`, chooses `Continuar`, then `Começar nosso orçamento`. End state: `getByRole("heading", { name: "Visão geral" })`, URL has `?month=YYYY-MM` for the current month in `America/Sao_Paulo`.
- **Persistence.** `await kit.reload(page)`. Still on `Visão geral`, `getByRole("button", { name: /Abrir nosso espaço/ })` visible.
- **Return from gate.** `await page.goto("/entrar")`. URL leaves `/entrar` for `/`.
- **Invite path.** In a fresh `kit.newPage()`, `goto("/convite/" + "a".repeat(64))`. URL stays on `/convite/…` and `Seu par convidou você` is visible.
- **Sign out.** Open the drawer (`Abrir nosso espaço: 1 pessoa`), choose `Sair da conta`. URL returns to `/entrar`, and `goto("/")` lands there again.

## Gotchas

- Do not type an email into the Clerk form. That runs Clerk's sign-up flow and would create a user on a full instance. `kit.onboard` signs in with a backend sign-in token for an existing user.
- `kit.onboard` stops before `Começar nosso orçamento` on `/convite/…`. Accept the invite yourself (`Aceitar convite`), or use `kit.invitePartner`.
- The first `/` without `?month` redirects (307) to the current month only once the time-zone cookie exists. A cold request returns 200 with "Carregando orçamento…" and the client redirects.
- The Clerk users are reused across runs, but each run's database is empty, so every run onboards again from the name step.
