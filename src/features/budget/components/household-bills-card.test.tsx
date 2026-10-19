import { describe, expect, test } from "vitest";
import { HouseholdBillsCard } from "@/features/budget/components/household-bills-card";
import { money } from "@/features/budget/domain/format";
import { transaction } from "@/test/fixtures";
import { cents } from "@/test/cents";
import { renderWithProviders } from "@/test/render";

const bills = [
  transaction({ id: "rent", amount: cents(300000), goal: "fixed", split: {} }),
  transaction({
    id: "power",
    amount: cents(25001),
    goal: "fixed",
    memberId: "bia",
    split: { paidAt: "2026-09-13" },
  }),
  transaction({
    id: "dinner",
    amount: cents(75000),
    goal: "pleasure",
    split: {},
  }),
  transaction({ id: "solo", amount: cents(9999), goal: "comfort" }),
  transaction({ id: "in", kind: "income", goal: null, amount: cents(500000) }),
];

function renderCard(
  transactions = bills,
  hidden = false,
  memberFilter = "all",
) {
  return renderWithProviders(
    <HouseholdBillsCard
      transactions={transactions}
      memberFilter={memberFilter}
      hidden={hidden}
      displayMoney={hidden ? () => "R$ ••••" : money}
    />,
    "/?month=2026-09",
  );
}

describe("HouseholdBillsCard", () => {
  test("splits the month's shared bills by goal", async () => {
    const { screen } = await renderCard();

    expect(
      screen.getByText(/R\$\s*4\.000,01 no mês · R\$\s*2\.000,00 para cada/),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Custo fixo 81%, Prazeres 19%" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /^Custo fixo: R\$\s*3\.250,01, R\$\s*1\.625,00 para cada$/,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /^Prazeres: R\$\s*750,00, R\$\s*375,00 para cada$/,
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^Conforto/ })).toBeNull();
  });

  test("one person's view shows what they paid, without a share each", async () => {
    const { screen } = await renderCard(bills, false, "bia");

    expect(screen.getByText(/^R\$\s*4\.000,01 no mês$/)).toBeTruthy();
    expect(screen.queryByText(/cada/)).toBeNull();
    expect(
      screen.getByRole("link", { name: /^Custo fixo: R\$\s*3\.250,01$/ }),
    ).toBeTruthy();
  });

  test("a goal opens its split bills; hidden values hide the shares", async () => {
    const { screen, user, router } = await renderCard(bills, true);

    expect(
      screen.getByRole("img", { name: "Divisão por meta oculta" }),
    ).toBeTruthy();
    expect(screen.queryByText("81%")).toBeNull();
    await user.click(screen.getByRole("link", { name: /^Prazeres:/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(router.state.location.search).toEqual({
      month: "2026-09",
      kind: "split",
      goal: "pleasure",
    });
  });

  test("links to the split filter and handles a month without bills", async () => {
    const { screen, user, router } = await renderCard([]);

    expect(screen.getByText("Nenhuma conta dividida neste mês.")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /Ver contas/ }));
    expect(router.state.location.search).toEqual({
      month: "2026-09",
      kind: "split",
    });
  });
});
