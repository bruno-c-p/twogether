import { within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BalanceCard } from "@/features/budget/components/balance-card";
import { summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import type { Transaction } from "@/features/budget/domain/types";
import { transaction } from "@/test/fixtures";
import { cents } from "@/test/cents";
import { renderPlain } from "@/test/render";

const salary = transaction({
  id: "s",
  kind: "income",
  goal: null,
  amount: cents(500000),
});

const market = transaction({ id: "m", amount: cents(4590) });

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

function spendMeter(transactions: Transaction[], hidden = false) {
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

  return within(container).getByRole("meter", {
    name: "Gastos sobre entradas",
  });
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

    const { screen } = renderCard("2026-09");

    expect(screen.getByText("Faltam 2 dias")).toBeTruthy();
  });

  test("a person filter names the person and hidden values are masked", () => {
    const { screen } = renderCard("2026-09", "ana", true);

    expect(screen.getByText(/Sobra desta pessoa em\s+setembro/)).toBeTruthy();
    expect(screen.getAllByText("R$ ••••")).toHaveLength(3);
  });

  test("the spend meter reads the share of income spent", () => {
    expect(spendMeter([salary, market]).getAttribute("aria-valuenow")).toBe(
      "0.918",
    );
  });

  test("spending past income fills the meter and says so", () => {
    const overspent = transaction({ id: "big", amount: cents(900000) });

    const withIncome = spendMeter([salary, overspent]);
    expect(withIncome.getAttribute("aria-valuenow")).toBe("100");
    expect(withIncome.getAttribute("aria-valuetext")).toContain(
      "Acima das entradas",
    );

    expect(spendMeter([market]).getAttribute("aria-valuenow")).toBe("100");
  });

  test("hidden values and an empty month leave the meter empty", () => {
    const overspent = transaction({ id: "big", amount: cents(900000) });
    const hidden = spendMeter([salary, overspent], true);

    expect(hidden.getAttribute("aria-valuenow")).toBe("0");
    expect(hidden.getAttribute("aria-valuetext")).not.toContain("Acima");
    expect(spendMeter([salary]).getAttribute("aria-valuenow")).toBe("0");
  });
});
