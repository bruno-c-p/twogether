import { afterEach, describe, expect, test, vi } from "vitest";
import { BalanceCard } from "@/features/budget/components/balance-card";
import { summarize } from "@/features/budget/domain/calc";
import { currentMonth, money } from "@/features/budget/domain/format";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const salary = transaction({
  id: "s",
  kind: "income",
  goal: null,
  amount: 500000,
});

const market = transaction({ id: "m", amount: 4590 });

const partners = [
  { memberId: "ana", name: "Ana", position: 0, income: 500000, expenses: 1000 },
  { memberId: "bia", name: "Bia", position: 1, income: 0, expenses: 3590 },
];

function renderCard(
  month: string,
  memberFilter = "all",
  hidden = false,
  withPartners = false,
) {
  return renderPlain(
    <BalanceCard
      summary={summarize([salary, market])}
      month={month}
      memberFilter={memberFilter}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
      hidden={hidden}
      onToggleHidden={() => undefined}
      partners={withPartners ? partners : undefined}
    />,
  );
}

afterEach(() => vi.useRealTimers());

describe("BalanceCard", () => {
  test("shows the month's leftover with income and expenses", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 10, 12));

    const { screen } = renderCard("2026-09");

    expect(screen.getByText(/Sobra de\s+setembro/)).toBeTruthy();
    expect(screen.getByText(/4\.954,10/)).toBeTruthy();
    expect(screen.getByText(/5\.000,00/)).toBeTruthy();
    expect(screen.getByText(/45,90/)).toBeTruthy();
    expect(screen.queryByText(/para fechar o mês/)).toBeNull();
  });

  test("the current month counts the days left", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 28, 12));

    const { screen } = renderCard(currentMonth());

    expect(screen.getByText("Faltam 2 dias para fechar o mês")).toBeTruthy();
  });

  test("a person filter names the person and hidden values are masked", () => {
    const { screen } = renderCard("2026-09", "ana", true);

    expect(screen.getByText(/Sobra desta pessoa em\s+setembro/)).toBeTruthy();
    expect(screen.getAllByText("R$ ••••")).toHaveLength(3);
  });

  test("as a couple, each partner's part sits under income and expenses", () => {
    const { screen } = renderCard("2026-09", "all", false, true);
    const income = screen.getByText("Entradas").parentElement!;
    const expenses = screen.getByText("Saídas").parentElement!;

    expect(income.textContent).toMatch(/Ana:\s*R\$\s5\.000,00/);
    expect(income.textContent).toMatch(/Bia:\s*R\$\s0,00/);
    expect(expenses.textContent).toMatch(/Ana:\s*R\$\s10,00/);
    expect(expenses.textContent).toMatch(/Bia:\s*R\$\s35,90/);
  });

  test("hidden values mask each partner's part too", () => {
    const { screen } = renderCard("2026-09", "all", true, true);

    expect(screen.getAllByText("R$ ••••")).toHaveLength(7);
  });
});
