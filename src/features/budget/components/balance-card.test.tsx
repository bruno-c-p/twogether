import { afterEach, describe, expect, test, vi } from "vitest";
import { BalanceCard } from "@/features/budget/components/balance-card";
import { summarize } from "@/features/budget/domain/calc";
import { currentMonth, money } from "@/features/budget/domain/format";
import type { Transaction } from "@/features/budget/domain/types";
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
      hidden={hidden}
      onToggleHidden={() => undefined}
    />,
  );
}

function spendBar(transactions: Transaction[], hidden = false) {
  const { container } = renderPlain(
    <BalanceCard
      summary={summarize(transactions)}
      month="2026-09"
      memberFilter="all"
      displayMoney={money}
      hidden={hidden}
      onToggleHidden={() => undefined}
    />,
  );

  // SAFETY: the card always renders the decorative bar track and its fill.
  return container.querySelector<HTMLElement>('[aria-hidden="true"] > div')!;
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
    expect(screen.queryByText(/Faltam/)).toBeNull();
  });

  test("the current month counts the days left", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 28, 12));

    const { screen } = renderCard(currentMonth());

    expect(screen.getByText("Faltam 2 dias")).toBeTruthy();
  });

  test("a person filter names the person and hidden values are masked", () => {
    const { screen } = renderCard("2026-09", "ana", true);

    expect(screen.getByText(/Sobra desta pessoa em\s+setembro/)).toBeTruthy();
    expect(screen.getAllByText("R$ ••••")).toHaveLength(3);
  });

  test("the spend bar fills with the share of income spent", () => {
    expect(spendBar([salary, market]).style.width).toBe("0.918%");
  });

  test("spending past income fills the bar and turns it red", () => {
    const overspent = transaction({ id: "big", amount: 900000 });

    const withIncome = spendBar([salary, overspent]);
    expect(withIncome.style.width).toBe("100%");
    expect(withIncome.className).toContain("bg-danger");

    expect(spendBar([market]).style.width).toBe("100%");
  });

  test("hidden values and an empty month leave the bar empty", () => {
    expect(spendBar([salary, market], true).style.width).toBe("0%");
    expect(spendBar([salary]).style.width).toBe("0%");
  });
});
