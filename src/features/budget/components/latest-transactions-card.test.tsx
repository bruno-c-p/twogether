import { describe, expect, test, vi } from "vitest";
import { LatestTransactionsCard } from "@/features/budget/components/latest-transactions-card";
import { money } from "@/features/budget/domain/format";
import { transaction } from "@/test/fixtures";
import { cents } from "@/test/cents";
import { renderWithProviders } from "@/test/render";

async function renderCard(transactions = [transaction()]) {
  const onEdit = vi.fn();

  const view = await renderWithProviders(
    <LatestTransactionsCard
      transactions={transactions}
      displayMoney={money}
      onEdit={onEdit}
    />,
    "/?month=2026-09",
  );

  return { ...view, onEdit };
}

describe("LatestTransactionsCard", () => {
  test("shows the five most recent, signed, and opens one for editing", async () => {
    const days = ["01", "02", "03", "04", "05", "06"];

    const { screen, user, onEdit } = await renderCard([
      ...days.map((day) =>
        transaction({
          id: day,
          description: `Gasto ${day}`,
          date: `2026-09-${day}`,
        }),
      ),
      transaction({
        id: "in",
        kind: "income",
        goal: null,
        description: "Freela",
        date: "2026-09-07",
        amount: cents(120000),
      }),
    ]);

    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(5);
    expect(screen.queryByText("Gasto 01")).toBeNull();
    expect(screen.getByText(/^\+\s*R\$\s*1\.200,00$/)).toBeTruthy();
    expect(screen.getAllByText(/^–\s*R\$/).length).toBe(4);
    expect(screen.getByText(/Custo fixo · 06 set/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Editar Freela" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "in" }));
  });

  test("shows a transfer unsigned", async () => {
    const { screen } = await renderCard([
      transaction({
        kind: "transfer",
        goal: "freedom",
        description: "Tesouro Direto",
        amount: cents(50000),
      }),
    ]);

    expect(screen.getByText(/^R\$\s*500,00$/)).toBeTruthy();
    expect(screen.getByText(/Transferência · /)).toBeTruthy();
  });

  test("links to the full list and handles an empty month", async () => {
    const { screen, user, router } = await renderCard([]);

    expect(screen.getByText("Nenhuma transação neste mês.")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /Ver todas/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(router.state.location.search).toEqual({ month: "2026-09" });
  });
});
