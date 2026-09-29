import { describe, expect, test, vi } from "vitest";
import { BudgetCard } from "@/features/budget/components/budget-card";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { ana, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const salary = transaction({
  id: "s",
  kind: "income",
  goal: null,
  amount: 100000,
});

function renderCard(amount: number, canEdit = true) {
  const transactions = [salary, transaction({ id: "m", amount })];
  const onEditPercentages = vi.fn();
  const onFilterGoal = vi.fn();

  const view = renderPlain(
    <BudgetCard
      summary={summarize(transactions)}
      plans={planGoals(transactions, [ana])}
      hidden={false}
      displayMoney={money}
      canEdit={canEdit}
      busy={false}
      onEditPercentages={onEditPercentages}
      onFilterGoal={onFilterGoal}
    />,
  );

  return { ...view, onEditPercentages, onFilterGoal };
}

describe("BudgetCard", () => {
  test("lists what is left in each goal and filters by it", async () => {
    const { screen, user, onFilterGoal } = renderCard(10000);

    expect(screen.getAllByText(/^restam /).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /^Custo fixo:/ }));
    expect(onFilterGoal).toHaveBeenCalledWith("fixed");
  });

  test("flags a goal spent beyond its plan", () => {
    const { screen } = renderCard(90000);

    expect(screen.getByText(/acima$/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Custo fixo:.*acima do planejado/ }),
    ).toBeTruthy();
  });

  test("edits percentages only when allowed", async () => {
    const allowed = renderCard(1000);

    await allowed.user.click(
      allowed.screen.getByRole("button", { name: "Editar meus percentuais" }),
    );
    expect(allowed.onEditPercentages).toHaveBeenCalled();
    allowed.unmount();

    const denied = renderCard(1000, false);

    expect(
      denied.screen.queryByRole("button", { name: "Editar meus percentuais" }),
    ).toBeNull();
  });
});
