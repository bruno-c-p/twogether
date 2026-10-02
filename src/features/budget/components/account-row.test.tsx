import { describe, expect, test, vi } from "vitest";
import { AccountRow } from "@/features/budget/components/account-row";
import { money } from "@/features/budget/domain/format";
import { nubank, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup(overrides: Partial<Parameters<typeof AccountRow>[0]> = {}) {
  const props = {
    account: nubank,
    used: false,
    balance: 100000,
    entered: 0,
    left: 0,
    monthTransactions: [],
    monthName: "setembro",
    busy: false,
    displayMoney: money,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...renderPlain(
      <ul>
        <AccountRow {...props} />
      </ul>,
    ),
  };
}

describe("AccountRow", () => {
  test("shows the balance and lets an unused account be edited or deleted", async () => {
    const { screen, user, props } = setup();

    expect(screen.getByText("0 transações em setembro")).toBeTruthy();
    expect(screen.getByText(/R\$\s1\.000,00/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Editar Nubank" }));
    await user.click(screen.getByRole("button", { name: "Excluir Nubank" }));
    expect(props.onEdit).toHaveBeenCalledWith(nubank);
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Excluir esta conta?" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancelar" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Excluir esta conta?" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Excluir Nubank" }));
    await user.click(screen.getByRole("button", { name: "Excluir conta" }));
    expect(props.onDelete).toHaveBeenCalledWith(nubank);
  });

  test("an account in use cannot be deleted and says why", () => {
    const { screen } = setup({ used: true, balance: -500 });
    const remove = screen.getByRole("button", { name: "Excluir Nubank" });

    expect(remove.hasAttribute("disabled")).toBe(true);
    expect(remove.getAttribute("title")).toMatch(/Exclua ou mova/);
  });

  test("lists the month's movement with signed amounts", () => {
    const { screen } = setup({
      entered: 5000,
      left: 8000,
      monthTransactions: [
        transaction(),
        transaction({
          id: "income",
          description: "Salário",
          kind: "income",
          goal: null,
          amount: 1234,
        }),
      ],
    });

    expect(screen.getByText("2 transações em setembro")).toBeTruthy();
    expect(screen.getByText("Mercado")).toBeTruthy();
    expect(screen.getByText("Custo fixo")).toBeTruthy();
    expect(screen.getByText("Salário")).toBeTruthy();
    expect(screen.getByText("Receita")).toBeTruthy();
    expect(screen.getByText(/^-\sR\$\s45,90$/)).toBeTruthy();
    expect(screen.getByText(/^\+\sR\$\s12,34$/)).toBeTruthy();
    expect(screen.getByText(/^\+\sR\$\s50,00$/)).toBeTruthy();
  });

  test("masks the balance when values are hidden", () => {
    const { screen } = setup({ displayMoney: () => "R$ ••••" });

    expect(screen.getAllByText("R$ ••••").length).toBeGreaterThan(0);
  });
});
