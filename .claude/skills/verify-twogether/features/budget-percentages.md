# Budget percentages

The budget screen (`Orçamento`, route `/orcamento`) splits income across six fixed goals with percentages that add up to 100%: Custo fixo 30%, Prazeres 10%, Conforto 15%, Metas 15%, Liberdade financeira 25%, Conhecimento 5%. Each goal card shows spent versus planned. A person edits their own percentages; the planned amounts update to the cent.

## Sub-features

- `budget-cards` goal links named `<Meta>: R$ x de R$ y planejados`, with each goal's description.
- `budget-distribution` the `Distribuição da renda` section.
- `budget-edit` `Editar meus percentuais` opens `Divisão da minha renda` with one field per goal and a total status.
- `budget-person` the copy and the edit button follow the person filter: visible for `Nós` and `Eu`, hidden for the partner.

## How to get to it (user POV)

- Desktop: link `Orçamento` in `Navegação principal`. Phone: link `Orçamento` in `Navegação mobile`.

## Driving it with verify.ts

Preconditions:

- `kit.onboard(page, "solo", "Ana")`, `kit.setMonth(page, "2026-09")`, one Receita `Salário` `5000,00` on `2026-09-01` (see [transactions](./transactions.md)).

- **Defaults.** Open `Orçamento`. `getByRole("heading", { name: "Distribuição da renda" })` visible. Links `/Custo fixo: R\$\s*0,00 de R\$\s*1\.500,00 planejados/` and `/Metas: R\$\s*0,00 de R\$\s*750,00 planejados/`.
- **Edit.** Choose `getByRole("button", { name: "Editar meus percentuais" })`. In `dialog "Divisão da minha renda"`: `getByLabel("Custo fixo")` `20`, `getByLabel("Metas")` `25`; `getByRole("status")` contains `100%`. Choose `Salvar percentuais`. Toast `Percentuais atualizados.`
- **Result.** Links now read `/Custo fixo: R\$\s*0,00 de R\$\s*1\.000,00 planejados/` and `/Metas: R\$\s*0,00 de R\$\s*1\.250,00 planejados/`.
- **Persist.** `kit.reload(page)`: the same planned amounts.
- **Invalid total.** Reopen the dialog, set `Custo fixo` to `90`: the status no longer says `100%` and `Salvar percentuais` is disabled. Close with `Escape`; nothing changed.
- **Person filter.** In a couple journey, `Bia` selected in `Filtrar por pessoa` hides `Editar meus percentuais`; `Eu` and `Nós` show it.
- **Proof.** `shot` before and after save; `sweep(page, "budget")`.

## Gotchas

- Under a person filter, planned amounts come from that person's income, not the couple's. Goal links open `/transacoes` filtered by that goal, not this screen.
- Hidden values zero the bar widths (`0%`); show values before judging bars.
- Concurrent edits to percentages from both partners are rejected with a message to review the current version.
