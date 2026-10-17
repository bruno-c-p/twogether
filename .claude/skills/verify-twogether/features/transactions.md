# Transactions

The transactions screen (`Transações`, route `/transacoes`) lists the selected month's entries grouped by day, lets a person add, edit, and delete them (with undo), and narrows the list by type, goal, and free-text search. Long months paginate at 50 rows.

## Sub-features

- `tx-add` creates a receita or despesa with amount, description, date, and goal (optionally monthly recurrence).
- `tx-edit` changes an entry from its row.
- `tx-delete` removes an entry, with `Desfazer` in the toast; recurring entries ask which occurrences.
- `tx-filter-kind` chips `Todas`, `Despesas`, `Receitas`, `Divididas`.
- `tx-filter-goal` select `Filtrar por meta`.
- `tx-search` searchbox `Buscar transações` with `Limpar busca`.
- `tx-empty` shows `Nenhuma transação neste mês.` or, with filters, `Nenhuma transação encontrada.` plus `Limpar filtros`.
- `tx-pages` `navigation "Páginas de transações"` with `Anterior` / `Próxima` once there are more than 50 rows, kept in `?page=`.
- `tx-month` switches month through the picker.

## How to get to it (user POV)

- Desktop: link `Transações` in `Navegação principal`, then `Adicionar transação`.
- Phone: link `Transações` in `Navegação mobile`; the round `Registrar transação` button opens the new-transaction sheet from any view.
- From the overview: `Ver todas` or `Editar <descrição>` in `Últimas transações`.

## Driving it with verify.ts

Preconditions:

- `kit.onboard(page, "solo", "Ana")`, on `Transações`, `kit.setMonth(page, "2026-09")`.

Maintained journey: `verify.ts drive "$RUN" .claude/skills/verify-twogether/journeys/transactions.ts` runs every step below except recurrence and pagination.

- **Empty state.** `getByRole("region", { name: "Transações do mês" })` shows `Nenhuma transação neste mês.` `sweep(page, "empty")`.
- **Add.** Choose `Adicionar transação`. In `getByRole("dialog", { name: "Nova transação" })`: button `Receita` or `Despesa`, `getByLabel("Valor")` `5000,00`, `getByLabel("Descrição")` `Salário`, `getByLabel("Data")` `2026-09-01`; for a despesa also button `Custo fixo` (exact). Submit with the dialog's `Adicionar transação`. Toast `Transação adicionada.`, dialog gone, row button `Salário` (exact) in the region.
- **Persist.** `kit.reload(page)`. URL keeps `month=2026-09`, both rows still there.
- **Edit.** Choose the row button `Mercado`. In `dialog "Editar transação"`, set `Valor` to `60,00`, choose `Salvar alterações`. Toast `Transação atualizada.`. After `reload`, the row (`getByRole("listitem")` filtered by `has: page.getByRole("button", { name: "Mercado", exact: true })`) contains `/R\$\s*60,00/`.
- **Kind filter.** In the region, button `Despesas`: `Mercado` visible, `Salário` count 0. Button `Todas` restores both.
- **Goal filter.** `getByLabel("Filtrar por meta")`, option `Custo fixo`: only despesas with that goal remain.
- **Search.** `getByLabel("Buscar transações")` fill `salá`: only `Salário`. `Limpar busca` restores the list.
- **Filtered empty.** Search `zzz`: `Nenhuma transação encontrada.`; `Limpar filtros` clears search and chips.
- **Month switch.** `kit.setMonth(page, "2026-10")`: URL `month=2026-10`, empty state. Back to `2026-09`: rows return.
- **Delete and undo.** `getByRole("button", { name: "Excluir Mercado" })`. Toast `Transação excluída.`, row gone. The toast's `Desfazer`: toast `Alteração desfeita.`, row back. Overview balance returns to the cent.
- **Recurrence.** In the new dialog check `getByLabel("Repetir mensalmente")`, fill `getByLabel("Por quantos meses?")` `3`. Toast `3 transações mensais adicionadas.`; the row appears in 2026-09, 2026-10, 2026-11. `Excluir` on one opens `dialog "Excluir transação"`; radio `Esta e as seguintes`, button `Excluir 2 transações`.
- **Pagination.** Add 51 entries in one month (recurrence does not help; use 51 adds, or skip and report). `navigation "Páginas de transações"` reads `1–50 de 51 transações · Página 1 de 2`; `Próxima` sets `?page=` and shows the 51st.
- **Phone entry.** `page.setViewportSize({ width: 320, height: 720 })`, `navigation "Navegação mobile"` button `Registrar transação`: `dialog "Nova transação"` opens; `Escape` closes it.
- **Proof.** `shot` after add, edit, search; `sweep(page, "filled")` at the end.

## Gotchas

- The header and the empty state both render `Adicionar transação` until there is a row. The journey takes the first; once a row exists only the header one remains.
- Phones and desktops render a row's goal and split status in different places. Assert on the row's text with `useInnerText`, never on one copy.
- `?page=0` is read as absent and an out-of-range page clamps to the last page.
- A paid split row disables `Editar` and `Excluir` until unsettled.
- No seed data exists for pagination. A journey that needs 51 rows must add them, which takes a while; if you skip it, report pagination as unverified.
