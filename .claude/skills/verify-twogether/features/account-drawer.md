# Account drawer

The account drawer (`Sua conta`) holds the theme picker, the person's name, the household (`Nosso espaço`) with its members and invite link, the Clerk account manager, and sign-out. A household with one person can generate a 48-hour invite link for the partner.

## Sub-features

- `drawer-open` opens from the header avatars or the phone `Conta` tab, closes with `Fechar` or `Escape`.
- `drawer-theme` `Aparência` group: `Tema claro`, `Tema escuro`, `Tema sistema`, persisted in local storage.
- `drawer-name` `Você` section: name field and `Salvar nome`, status `Nome atualizado.`
- `drawer-invite` `Gerar convite`, `Link para seu par`, `Copiar convite` / `Link copiado`, `Gerar novo convite`, `Cancelar convites pendentes`.
- `drawer-full` with two members: `Vocês dois já estão aqui. O espaço está completo.` and no invite button.
- `drawer-manage` `Gerenciar conta` opens Clerk's profile modal.
- `drawer-sign-out` `Sair da conta`.

## How to get to it (user POV)

- Desktop header: button `Abrir nosso espaço: 1 pessoa` (or `2 pessoas`).
- Phone: `navigation "Navegação mobile"` button `Conta`.

## Driving it with verify.ts

Preconditions:

- `kit.onboard(page, "solo", "Ana")`. For the full state, onboard `ana` and `kit.invitePartner(page, "bia", "Bia")`.

- **Open.** Choose `getByRole("button", { name: "Abrir nosso espaço: 1 pessoa" })`. `getByRole("heading", { name: "Sua conta" })` and `getByRole("heading", { name: "Nosso espaço" })` visible.
- **Set name.** Fill the `Você` section's name field (placeholder `Como você quer aparecer?`) with `Ana Clara`, choose `Salvar nome`. Status `Nome atualizado.` After `kit.reload(page)` and reopening, the field holds `Ana Clara`.
- **Invite.** Choose `Gerar convite`. `getByLabel("Link para seu par")` has a value matching `/\/convite\/[0-9a-f]{64}$/`, and `Expira em 48 horas` is visible. `Copiar convite` turns into `Link copiado` (or `Selecione e copie o link acima.` without clipboard access).
- **Invite works.** Open the link in `kit.newPage()`, `kit.onboard(partner, "bia", "Bia")`, choose `Aceitar convite`: Bia lands on `Visão geral` with `Abrir nosso espaço: 2 pessoas`. Or call `kit.invitePartner` for all of this.
- **Full household.** `kit.reload(page)`, reopen: `Vocês dois já estão aqui. O espaço está completo.`, `Gerar convite` count 0.
- **Cancel invites.** One-person household: `Gerar convite`, then `Cancelar convites pendentes`. Status `Convites anteriores cancelados.` and the link field is gone.
- **Theme.** `Tema escuro`: `html[data-theme="dark"]`; `reload` keeps it. Choose `Tema sistema` before any `sweep`.
- **Phone.** `page.setViewportSize({ width: 320, height: 720 })`, `navigation "Navegação mobile"` button `Conta`: the same drawer, no horizontal overflow.
- **Proof.** `shot(page, "drawer")` with the invite link visible; `sweep(page, "drawer")` with the drawer open.

## Gotchas

- `Gerenciar conta` opens Clerk's hosted UI; do not change the test user's email or delete the account there.
- Generating a new invite invalidates the previous link.
- An invite accepts exactly one person; the database caps a household at two.
- `Sair da conta` ends the Clerk session for that context only; other contexts stay signed in.
