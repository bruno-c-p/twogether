import { describe, expect, test, vi } from "vitest";
import { SplitDebtCard } from "@/features/budget/components/split-debt-card";
import { money } from "@/features/budget/domain/format";
import type { Transaction } from "@/features/budget/domain/types";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const bia = { id: "bia", name: "Bia" };

function renderCard(net: number | null, unpaid: Transaction[]) {
  const onSettle = vi.fn();

  const view = renderPlain(
    <SplitDebtCard
      debt={net === null ? null : { net, unpaid }}
      userId="ana"
      partner={bia}
      busy={false}
      displayMoney={money}
      onSettle={onSettle}
    />,
  );

  return { ...view, onSettle };
}

describe("SplitDebtCard", () => {
  test("says what the partner owes and waits for them", () => {
    const { screen } = renderCard(2500, [
      transaction({ id: "t1", amount: 5000, memberId: "ana", split: {} }),
    ]);

    expect(screen.getByText(/Bia te deve R\$\s25,00/)).toBeTruthy();
    expect(screen.getByText("Mercado", { exact: false })).toBeTruthy();
    expect(
      screen.getByText("1 despesa dividida em aberto · aguardando Bia"),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Marcar como pago" }),
    ).toBeNull();
  });

  test("lets the person who owes mark a split as paid", async () => {
    const owed = transaction({
      id: "t2",
      amount: 8000,
      memberId: "bia",
      split: {},
    });

    const { screen, user, onSettle } = renderCard(-4000, [owed]);

    expect(screen.getByText(/Você deve R\$\s40,00 a Bia/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Marcar como pago" }));
    expect(onSettle).toHaveBeenCalledWith(owed);
  });

  test("balanced and empty states read differently", () => {
    const balanced = renderCard(0, [
      transaction({ id: "a", memberId: "ana", split: {} }),
      transaction({ id: "b", memberId: "bia", split: {} }),
    ]);

    expect(balanced.screen.getByText("Vocês estão quites")).toBeTruthy();
    expect(
      balanced.screen.getByText("2 despesas divididas em aberto"),
    ).toBeTruthy();
    balanced.unmount();

    const empty = renderCard(0, []);

    expect(empty.screen.getByText("Nada pendente entre vocês")).toBeTruthy();
    expect(empty.screen.getByText(/Ative “Dividir com Bia”/)).toBeTruthy();
  });

  test("waits for the reader's date before showing any debt", () => {
    const { screen } = renderCard(null, []);

    expect(screen.getByText("Acerto entre vocês")).toBeTruthy();
    expect(screen.queryByText(/Nada pendente|deve/)).toBeNull();
  });
});
