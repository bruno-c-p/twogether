import { describe, expect, test, vi } from "vitest";
import { GoalList } from "@/features/budget/components/goal-list/goal-list";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { ana, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const salary = transaction({
  id: "s",
  kind: "income",
  goal: null,
  amount: 100000,
  tags: [],
});

const rent = transaction({ id: "r", goal: "fixed", amount: 40000 });

function renderGoals({
  hidden = false,
  expanded = false,
  withIncome = true,
}: { hidden?: boolean; expanded?: boolean; withIncome?: boolean } = {}) {
  const monthly = withIncome ? [salary, rent] : [rent];
  const onFilterGoal = vi.fn();

  const view = renderPlain(
    <GoalList
      summary={summarize(monthly)}
      plans={planGoals(monthly, [ana])}
      expanded={expanded}
      hidden={hidden}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
      onFilterGoal={onFilterGoal}
    />,
  );

  return { ...view, onFilterGoal };
}

describe("GoalList", () => {
  test("marks a goal over its plan and filters by goal on click", async () => {
    const { screen, user, onFilterGoal } = renderGoals();
    const fixed = screen.getByRole("button", { name: /^Custo fixo:/ });

    expect(fixed.getAttribute("aria-label")).toMatch(/acima do planejado$/);
    expect(fixed.textContent).toMatch(/30%/);
    expect(fixed.textContent).toMatch(/R\$\s100,00 acima/);
    expect(
      screen.getByRole("button", { name: /^Prazeres:/ }).textContent,
    ).toMatch(/0 transações/);
    await user.click(fixed);
    expect(onFilterGoal).toHaveBeenCalledWith("fixed");
  });

  test("without income nothing is planned, so spending fills the bar", () => {
    const { container } = renderGoals({ withIncome: false });

    const widths = [
      ...container.querySelectorAll<HTMLElement>("button span[style]"),
    ].flatMap((bar) => bar.style.width || []);

    expect(widths).toContain("100%");
    expect(widths).toContain("0%");
  });

  test("hidden values keep the warning but not the amount; expanded shows descriptions", () => {
    const { screen } = renderGoals({ hidden: true, expanded: true });
    const fixed = screen.getByRole("button", { name: /^Custo fixo:/ });

    expect(fixed.textContent).toMatch(/Acima do planejado/);
    expect(fixed.querySelector("p:last-of-type")?.textContent).not.toBe("");
  });
});
