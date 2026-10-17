import { describe, expect, test } from "vitest";
import { MonthTotalsCard } from "@/features/budget/components/month-totals-card";
import { summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { transaction } from "@/test/fixtures";
import { cents } from "@/test/cents";
import { renderPlain } from "@/test/render";

const summary = summarize([
  transaction({ id: "s", kind: "income", goal: null, amount: cents(500000) }),
  transaction({ id: "m", amount: cents(4590) }),
]);

const partners = [
  { memberId: "ana", name: "Ana", position: 0, income: 500000, expenses: 1000 },
  { memberId: "bia", name: "Bia", position: 1, income: 0, expenses: 3590 },
];

function renderCard(hidden: boolean, withPartners = true) {
  return renderPlain(
    <MonthTotalsCard
      summary={summary}
      partners={withPartners ? partners : undefined}
      hidden={hidden}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
    />,
  );
}

describe("MonthTotalsCard", () => {
  test("as a couple, each partner's part sits under income and expenses", () => {
    const { screen } = renderCard(false);
    const income = screen.getByText("Entradas").closest("div")!;
    const expenses = screen.getByText("Saídas").closest("div")!;

    expect(income.textContent).toMatch(/Entradas\s*R\$\s5\.000,00/);
    expect(income.textContent).toMatch(/Ana\s*R\$\s5\.000,00/);
    expect(income.textContent).toMatch(/Bia\s*R\$\s0,00/);
    expect(expenses.textContent).toMatch(/Saídas\s*R\$\s45,90/);
    expect(expenses.textContent).toMatch(/Ana\s*R\$\s10,00/);
    expect(expenses.textContent).toMatch(/Bia\s*R\$\s35,90/);
  });

  test("a single person shows only the totals", () => {
    const { screen } = renderCard(false, false);

    expect(screen.getByText(/5\.000,00/)).toBeTruthy();
    expect(screen.queryByText("Ana")).toBeNull();
  });

  test("hidden values mask the totals and each partner's part", () => {
    const { screen } = renderCard(true);

    expect(screen.getAllByText("R$ ••••")).toHaveLength(6);
  });
});
