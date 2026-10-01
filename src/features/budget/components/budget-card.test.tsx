import { describe, expect, test, vi } from "vitest";
import { BudgetCard } from "@/features/budget/components/budget-card";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { ana, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const salary = transaction({
  id: "s",
  kind: "income",
  goal: null,
  amount: 100000,
});

async function renderCard(amount: number, canEdit = true) {
  const transactions = [salary, transaction({ id: "m", amount })];
  const onEditPercentages = vi.fn();

  const view = await renderWithProviders(
    <BudgetCard
      summary={summarize(transactions)}
      plans={planGoals(transactions, [ana])}
      hidden={false}
      displayMoney={money}
      canEdit={canEdit}
      busy={false}
      onEditPercentages={onEditPercentages}
    />,
    "/?month=2026-09&member=ana",
  );

  return { ...view, onEditPercentages };
}

describe("BudgetCard", () => {
  test("lists what is left in each goal and links to its transactions", async () => {
    const { screen, user, router } = await renderCard(10000);

    expect(screen.getAllByText(/^restam /).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("link", { name: /^Custo fixo:/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(router.state.location.search).toEqual({
      month: "2026-09",
      member: "ana",
      goal: "fixed",
    });
  });

  test("flags a goal spent beyond its plan", async () => {
    const { screen } = await renderCard(90000);

    expect(screen.getByText(/acima$/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /^Custo fixo:.*acima do planejado/ }),
    ).toBeTruthy();
  });

  test("edits percentages only when allowed", async () => {
    const allowed = await renderCard(1000);

    await allowed.user.click(
      allowed.screen.getByRole("button", { name: "Editar meus percentuais" }),
    );
    expect(allowed.onEditPercentages).toHaveBeenCalled();
    allowed.unmount();

    const denied = await renderCard(1000, false);

    expect(
      denied.screen.queryByRole("button", { name: "Editar meus percentuais" }),
    ).toBeNull();
  });
});
