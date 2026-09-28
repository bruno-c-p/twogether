import { describe, expect, test } from "vitest";
import { Overview } from "@/features/budget/components/overview/overview";
import { summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import type { Transaction } from "@/features/budget/domain/types";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const salary = transaction({
  id: "s",
  description: "Salário",
  kind: "income",
  goal: null,
  amount: 500000,
  date: "2026-09-05",
  tags: [],
});

const market = transaction({ id: "m", amount: 4590, date: "2026-09-10" });

const earlier = transaction({ id: "e", amount: 20000, date: "2026-07-03" });

function renderOverview({
  monthly,
  history = monthly,
  memberFilter = "all",
  hidden = false,
  month = "2026-09",
}: {
  monthly: Transaction[];
  history?: Transaction[];
  memberFilter?: string;
  hidden?: boolean;
  month?: string;
}) {
  return renderPlain(
    <Overview
      monthly={monthly}
      historyTransactions={history}
      month={month}
      memberFilter={memberFilter}
      hidden={hidden}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
      summary={summarize(monthly)}
    />,
  );
}

describe("Overview", () => {
  test("a positive month explains the balance and charts the spending", () => {
    const { screen } = renderOverview({
      monthly: [salary, market],
      history: [salary, market, earlier],
    });

    expect(screen.getByText("Nosso saldo do mês")).toBeTruthy();
    expect(screen.getByText("Saldo = entradas - despesas.")).toBeTruthy();
    expect(screen.getByText("em 1 dia com saída")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Histórico financeiro" }),
    ).toBeTruthy();
    expect(
      screen.queryByText("Nenhuma entrada ou saída neste período."),
    ).toBeNull();
  });

  test("a person filter with only expenses warns about the deficit", () => {
    const { screen } = renderOverview({
      monthly: [market],
      memberFilter: "ana",
    });

    expect(screen.getByText("Saldo desta pessoa")).toBeTruthy();
    expect(
      screen.getByText("As despesas superam as entradas neste mês."),
    ).toBeTruthy();
  });

  test("an empty month says so in every card", () => {
    const { screen } = renderOverview({ monthly: [] });

    expect(
      screen.getByText("Nenhuma entrada registrada neste mês."),
    ).toBeTruthy();
    expect(screen.getByText("Nenhuma despesa neste mês")).toBeTruthy();
    expect(
      screen.getByText("Nenhuma entrada ou saída neste período."),
    ).toBeTruthy();
  });

  test("hidden values mask money in the cards and history", () => {
    const { screen } = renderOverview({
      monthly: [salary, market],
      hidden: true,
    });

    expect(screen.getAllByText("R$ ••••").length).toBeGreaterThan(2);
    expect(screen.getAllByText("Valores ocultos").length).toBeGreaterThan(0);
  });

  test("the history period can switch to one year", async () => {
    const { screen, user } = renderOverview({
      monthly: [salary, market],
      history: [salary, market, earlier],
    });

    const year = screen.getByRole("button", { name: "1 ano" });

    await user.click(year);
    expect(year.getAttribute("aria-pressed")).toBe("true");
  });

  test("without a month the charts are skipped", () => {
    const { screen } = renderOverview({ monthly: [], month: "" });

    expect(
      screen.queryByRole("heading", { name: "Histórico financeiro" }),
    ).toBeNull();
  });
});
