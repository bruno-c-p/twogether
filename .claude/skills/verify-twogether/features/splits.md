# Splits and settle

A person can split an expense with their partner: the partner owes half (rounded down). Only the person who owes can mark it paid, on a chosen date; that records a repayment income for the payer and an expense for the partner. Unmarking removes them. A paid split locks its amount, type, split, and deletion.

## Sub-features

- `split-on` the `Dividir com <parceiro>` switch on a despesa, with the preview `<Parceiro> deve R$ x a você.`
- `split-row` the row reads `dividida · a receber`, later `dividida · paga`.
- `split-card` `Acerto entre vocês` on the overview, from each side.
- `settle` `Marcar como pago` from the debtor's side, with `Data do pagamento`.
- `repayments` `Reembolso: <descrição>` for the payer and `<descrição> (sua parte)` for the debtor, visible under `Eu`.
- `unsettle` `Desmarcar pagamento` in the edit dialog.
- `split-filter` the `Divididas` chip on transactions.

## How to get to it (user POV)

- New or edit transaction dialog, despesa, switch `Dividir com Bia`.
- Overview card `Acerto entre vocês`, button `Marcar como pago` (debtor only).
- Edit dialog of a paid split, `Desmarcar pagamento`.

## Driving it with verify.ts

Preconditions:

- `kit.onboard(page, "ana", "Ana")`, then `const bia = await kit.invitePartner(page, "bia", "Bia")`.
- Both pages on `kit.setMonth(…, "2026-09")`.

- **Split.** On Ana's `Transações`, new transaction: `Valor` `2000,00`, `Descrição` `Aluguel`, `Data` `2026-09-05`, `Custo fixo`, then `getByRole("switch", { name: /Dividir com Bia/ })` check. The dialog shows `Bia deve R$ 1.000,00 a você.` Submit; toast `Transação adicionada.`; the `Aluguel` row contains `dividida · a receber` (`useInnerText`).
- **Creditor card.** Ana's overview `region "Acerto entre vocês"` shows `Bia te deve R$ 1.000,00` and `1 despesa dividida em aberto · aguardando Bia`, with no `Marcar como pago` button.
- **Settle.** `kit.reload(bia)`, Bia's card shows `Você deve R$ 1.000,00 a Ana`. Choose `Marcar como pago`; in `dialog "Marcar como pago"` fill `getByLabel("Data do pagamento")` `2026-09-10`, choose `Confirmar pagamento`. Toast `Pagamento registrado.`, card shows `Nada pendente entre vocês`.
- **Repayments.** `reload` both. Bia, `Transações`, person `Eu`: `Aluguel (sua parte)` with `/[-−]\s?R\$\s*1\.000,00/`. Ana, person `Eu`: `Reembolso: Aluguel`, its `Editar Reembolso: Aluguel` disabled, list text `dividida · paga`. Under `Nós`, Bia sees no `Reembolso: Aluguel`.
- **Unsettle.** Bia, person `Nós`, open `Aluguel`: `dialog "Editar transação"` shows `Pago por você em …`; choose `Desmarcar pagamento`. Toast `Pagamento desmarcado.`; after reload the card shows the debt again and `Aluguel (sua parte)` is gone.
- **Proof.** `shot` each side before and after settle; `sweep(bia, "split-settled")`.

## Gotchas

- Needs two people. `solo` has no partner, so the `Dividir com …` switch is absent.
- The payer never sees `Marcar como pago`; only the debtor does.
- The partner's page does not live-update. `reload` it before asserting what the other person did.
- Under `Nós`, repayment entries are hidden by design; check them under `Eu`.
