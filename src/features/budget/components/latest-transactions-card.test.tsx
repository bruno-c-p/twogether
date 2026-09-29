import { describe, expect, test, vi } from "vitest";
import { LatestTransactionsCard } from "@/features/budget/components/latest-transactions-card";
import { money } from "@/features/budget/domain/format";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function renderCard(transactions = [transaction()]) {
  const onEdit = vi.fn();
  const onViewAll = vi.fn();

  const view = renderPlain(
    <LatestTransactionsCard
      transactions={transactions}
      displayMoney={money}
      onEdit={onEdit}
      onViewAll={onViewAll}
    />,
  );

  return { ...view, onEdit, onViewAll };
}

describe("LatestTransactionsCard", () => {
  test("shows the five most recent, signed, and opens one for editing", async () => {
    const days = ["01", "02", "03", "04", "05", "06"];

    const { screen, user, onEdit } = renderCard([
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
        amount: 120000,
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

  test("links to the full list and handles an empty month", async () => {
    const { screen, user, onViewAll } = renderCard([]);

    expect(screen.getByText("Nenhuma transação neste mês.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Ver todas/ }));
    expect(onViewAll).toHaveBeenCalled();
  });
});
