# twogether verification map

This directory is the maintained source for verifying twogether's user-facing behavior. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- An instance launched by `verify.ts launch` in this run, with `RUN` set to the printed path.
- `verify.ts doctor "$RUN"` prints `doctor: healthy`.
- The database starts empty. Every journey signs in with `kit.onboard` and creates its own household and data.
- Never drive port 3000 or any instance this run did not launch.

## Driving conventions

- Journeys run through `verify.ts drive "$RUN" <journey.ts>` and use the `Kit` described in `../SKILL.md`.
- Use `getByRole` and `getByLabel` with the exact Portuguese names below, scoped to a named region, dialog, or navigation.
- Desktop navigation is `navigation "Navegação principal"` with links `Visão geral`, `Transações`, `Orçamento`. Phones use `navigation "Navegação mobile"` with links `Início`, `Transações`, `Orçamento` and buttons `Registrar transação`, `Conta`.
- The month lives in `?month=YYYY-MM`, the person filter in `?member=<id>`. Use `kit.setMonth` and the person picker, not URL edits, unless the feature is about URLs. The picker is `getByRole("button", { name: /^Filtrar por pessoa/ })`; it opens a dialog whose options are `getByRole("radio", { name: "Nós" | "Eu" | "<partner name>", exact: true })`. Choosing one closes the dialog and renames the button `Filtrar por pessoa: <option>`.
- Toasts are `page.locator('[data-slot="toast"]').filter({ hasText: "<message>" })`. Their buttons (`Desfazer`, `Fechar aviso`) are `getByRole("button")` inside that locator. A toast has no role, so this is the one CSS locator the map uses.
- Amounts are typed in pt-BR form (`45,90`, `5000,00`) and render as `R$ 4.940,00`. Match with `/R\$\s*4\.940,00/`: the space is a no-break space.
- Use months in 2026 away from today's (the journeys use `2026-09` and `2026-10`) so the default-month redirect does not hide a month switch.

## Proof and skip reporting

- Each proof has a `shot` of the action and of the resulting state, and a `sweep` for any UI change.
- A mutation is proven by a `reload` or by the partner's page showing it, not by its toast.
- `problems.json` must be empty. A console error or failed request fails the proof even when the screen looks right.
- Report an entry point you could not reach with the attempted step and the unmet precondition. Do not report it as verified through another path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph describing the user-visible behavior, then exactly four H2s in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify.ts`, `Gotchas`. The driving section starts with `Preconditions:` and pairs each user action with the exact locator and the observable result.

## Features

- [Sign-in redirect](./sign-in.md): signed-out visitors land on `/entrar`, sign in, name themselves, and create a household.
- [Overview](./overview.md): month balance, income and expense totals, goal cards, household bills, split debt, latest transactions, value hiding.
- [Transactions](./transactions.md): add, edit, delete with undo, filters, search, pagination, month switch. Maintained journey: `journeys/transactions.ts`.
- [Splits and settle](./splits.md): split an expense with the partner, settle it from the partner's side, unsettle.
- [Budget percentages](./budget-percentages.md): the six goals' planned amounts and editing "my" percentages.
- [Account drawer](./account-drawer.md): theme, set name, invite a partner, manage account, sign out.

Not mapped: bank accounts. They were removed from the app (`src/server/db.server.ts` drops the `accounts` table), so there is no accounts screen to verify. "Contas da casa" (household bills) is an overview card, covered in [Overview](./overview.md).
