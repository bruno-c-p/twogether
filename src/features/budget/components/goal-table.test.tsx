import { describe, expect, test, vi } from "vitest";
import { GoalTable } from "@/features/budget/components/goal-table";
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

function renderTable({ hidden = false, withIncome = true } = {}) {
  const monthly = withIncome ? [salary, rent] : [rent];
  const onFilterGoal = vi.fn();

  const view = renderPlain(
    <GoalTable
      summary={summarize(monthly)}
      plans={planGoals(monthly, [ana])}
      hidden={hidden}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
      onFilterGoal={onFilterGoal}
    />,
  );

  return { ...view, onFilterGoal };
}

describe("GoalTable", () => {
  test("flags a goal over its plan and filters by goal on click", async () => {
    const { screen, user, onFilterGoal } = renderTable();
    const fixed = screen.getByRole("button", { name: /^Custo fixo:/ });

    expect(fixed.getAttribute("aria-label")).toMatch(/acima do planejado$/);
    expect(fixed.textContent).toMatch(/30%/);
    expect(fixed.textContent).toMatch(/133% · R\$\s100,00 acima/);
    expect(
      screen.getByRole("button", { name: /^Prazeres:/ }).textContent,
    ).toMatch(/0 transações/);
    await user.click(fixed);
    expect(onFilterGoal).toHaveBeenCalledWith("fixed");
  });

  test("shows what remains and the total row", () => {
    const { container } = renderTable();

    expect(container.textContent).toMatch(/0% · restam R\$\s100,00/);
    expect(container.textContent).toMatch(/Total100%/);
  });

  test("without income nothing is planned, so spending fills the bar", () => {
    const { container } = renderTable({ withIncome: false });

    const widths = [
      ...container.querySelectorAll<HTMLElement>("button span[style]"),
    ].flatMap((bar) => bar.style.width || []);

    expect(widths).toContain("100%");
    expect(widths).toContain("0%");
  });

  test("hidden values keep the warning but not the amounts", () => {
    const { screen } = renderTable({ hidden: true });
    const fixed = screen.getByRole("button", { name: /^Custo fixo:/ });

    expect(fixed.textContent).toMatch(/Acima do planejado/);
    expect(fixed.textContent).not.toMatch(/\d{3},\d{2}/);
  });
});
