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

function renderCard(month: string, memberFilter = "all", hidden = false) {
  return renderPlain(
    <BalanceCard
      summary={summarize([salary, market])}
      month={month}
      memberFilter={memberFilter}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
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
});
