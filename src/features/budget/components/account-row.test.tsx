import { describe, expect, test, vi } from "vitest";
import { AccountRow } from "@/features/budget/components/account-row";
import { nubank } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup(overrides: Partial<Parameters<typeof AccountRow>[0]> = {}) {
  const props = {
    account: nubank,
    used: false,
    balance: 100000,
    busy: false,
    hidden: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return { props, ...renderPlain(<AccountRow {...props} />) };
}

describe("AccountRow", () => {
  test("shows the balance and lets an unused account be edited or deleted", async () => {
    const { screen, user, props } = setup();

    expect(screen.getByText("Nenhuma transação nesta conta")).toBeTruthy();
    expect(screen.getByText(/R\$\s1\.000,00/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Editar Nubank" }));
    await user.click(screen.getByRole("button", { name: "Excluir Nubank" }));
    expect(props.onEdit).toHaveBeenCalledWith(nubank);
    expect(props.onDelete).toHaveBeenCalledWith(nubank);
  });

  test("an account in use cannot be deleted and says why", () => {
    const { screen } = setup({ used: true, balance: -500 });
    const remove = screen.getByRole("button", { name: "Excluir Nubank" });

    expect(screen.getByText("Em uso nas transações")).toBeTruthy();
    expect(remove.hasAttribute("disabled")).toBe(true);
    expect(remove.getAttribute("title")).toMatch(/Exclua ou mova/);
  });

  test("masks the balance when values are hidden", () => {
    const { screen } = setup({ hidden: true });

    expect(screen.getByText("R$ ••••")).toBeTruthy();
  });
});
