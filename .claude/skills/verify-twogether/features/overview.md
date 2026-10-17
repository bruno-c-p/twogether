# Overview

The overview (`Visão geral`, route `/`) summarizes the selected month for the selected person: what is left of the income, totals in and out, how each goal is tracking, household bills split per person, what the couple owes each other, and the latest transactions. Money can be masked for the tab.

## Sub-features

- `balance` shows `Sobra de <mês>` (or `Sobra desta pessoa em <mês>` under a person filter) and the remaining amount.
- `totals` shows `Entradas` and `Saídas` for the month.
- `goals` lists each goal as a link named `<Meta>: R$ x de R$ y planejados` that opens `/transacoes` filtered by that goal.
- `household-bills` (`Contas da casa`) totals split expenses per goal with each person's share, `<Meta>: R$ x, R$ y para cada`.
- `split-debt` (`Acerto entre vocês`) shows who owes whom, or `Nada pendente entre vocês`.
- `latest` (`Últimas transações`) lists recent rows with `Editar <descrição>` buttons and a `Ver todas` link.
- `hide-values` masks every amount as `R$ ••••` until shown again or the page reloads.
- `person-switch` and `month-switch` re-scope every card.

## How to get to it (user POV)

- Sign in; the overview is the landing page.
- Desktop: link `Visão geral` in `Navegação principal`. Phone: link `Início` in `Navegação mobile`.
- The brand link `twogether — início`.

## Driving it with verify.ts

Preconditions:

- `kit.onboard(page, "solo", "Ana")` done, `kit.setMonth(page, "2026-09")`.
- For filled state: add `Salário` (Receita, `5000,00`, `2026-09-01`) and `Mercado` (Despesa, `45,90`, `2026-09-14`, goal `Custo fixo`) as in [transactions](./transactions.md).
- For split debt and person switching: a couple from `kit.invitePartner(page, "bia", "Bia")` after onboarding `ana`.

- **Empty state.** Before adding anything: `getByRole("region", { name: "Resumo mensal" })` contains `Sobra de`, and `Nenhuma transação neste mês.` plus `Nenhuma conta dividida neste mês.` are visible. `sweep(page, "overview-empty")`.
- **Balance and totals.** With the two rows: `Resumo mensal` contains `/R\$\s*4\.954,10/`. `getByRole("region", { name: "Entradas e saídas do mês" })` contains `Entradas` and `Saídas` with `/R\$\s*45,90/`.
- **Goals.** `getByRole("link", { name: /Custo fixo: R\$\s*45,90 de R\$\s*1\.500,00 planejados/ })` is visible. Choosing it opens `/transacoes` with `goal=` in the URL and only `Custo fixo` rows.
- **Household bills.** Couple journey with the split `Aluguel` from [splits](./splits.md): `getByRole("heading", { name: "Contas da casa" })` is visible and the card has a link named `/Custo fixo: R\$\s*2\.000,00, R\$\s*1\.000,00 para cada/`. A solo household has no split expenses, so the card has no goal rows.
- **Latest transactions.** `getByRole("heading", { name: "Últimas transações" })`, `getByRole("button", { name: "Editar Mercado" })`, `getByRole("link", { name: /Ver todas/ })` are visible. `Ver todas` opens `/transacoes` with the same `month`.
- **Hide values.** Choose `getByRole("button", { name: "Ocultar valores" })`. `Resumo mensal` contains `R$ ••••`, the button becomes `Mostrar valores`, and the URL has no `hidden`. `kit.reload(page)`: amounts are back.
- **Split debt.** Couple journey, `ana` adds a split expense (see [splits](./splits.md)). `getByRole("region", { name: "Acerto entre vocês" })` shows `Bia te deve R$ 1.000,00` on Ana's page and `Você deve R$ 1.000,00 a Ana` on Bia's.
- **Person switch.** `getByRole("button", { name: /^Filtrar por pessoa/ })` then `getByRole("radio", { name: "Eu", exact: true })`. The balance reads `Sobra desta pessoa em`, the URL gains `member=`, and the button's name becomes `Filtrar por pessoa: Eu`.
- **Month switch.** `kit.setMonth(page, "2026-10")`. URL `month=2026-10`, empty-state texts return. Back to `2026-09` restores the amounts.
- **Proof.** `shot(page, "overview-filled")` and `sweep(page, "overview-filled")`.

## Gotchas

- The goal-card bar fill reads `0%` while values are hidden; that is intended, not a broken bar.
- Under a person filter, planned amounts come from that person's income, not the couple's.
- Repayment entries from a settled split count in individual views but not in `Nós`.
- The overview and the transactions screen share the month and person in the URL; switching on one carries to the other.
