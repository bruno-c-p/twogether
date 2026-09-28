import { describe, expect, test, vi } from "vitest";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog/transaction-dialog";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { ana, nubank, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const itau: BankAccount = { id: "itau", name: "Itaú", openingBalance: 0 };

function setup({
  editing = null,
  accounts = [nubank],
  saved = true,
}: {
  editing?: Transaction | null;
  accounts?: BankAccount[];
  saved?: boolean;
} = {}) {
  const onSave = vi.fn<
    (transaction: Transaction, occurrences?: number) => Promise<boolean>
  >(() => Promise.resolve(saved));

  const onClose = vi.fn();

  const view = renderPlain(
    <TransactionDialog
      transaction={editing}
      defaultDate="2026-09-15"
      existingTags={["casa", "mercado"]}
      members={[ana, { ...ana, id: "bia", name: "Bia" }]}
      accounts={accounts}
      currentUserId="ana"
      serverError=""
      onSave={onSave}
      onClose={onClose}
    />,
  );

  return { ...view, onSave, onClose };
}

describe("TransactionDialog", () => {
  test("adds an expense with goal, typed tag and the only account preselected", async () => {
    const { screen, user, onSave, onClose } = setup();

    await user.type(screen.getByLabelText("Valor"), "4590");
    await user.type(screen.getByLabelText("Descrição"), "Feira");
    await user.click(screen.getByRole("button", { name: "Prazeres" }));
    await user.type(screen.getByLabelText(/Tags/), "sábado");
    await user.click(
      screen.getByRole("button", { name: "Adicionar transação" }),
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 4590,
        description: "Feira",
        date: "2026-09-15",
        kind: "expense",
        goal: "pleasure",
        tags: ["sábado"],
        accountId: "nubank",
        memberId: "ana",
      }),
      1,
    );
    expect(onClose).toHaveBeenCalled();
  });

  test("income drops the goal picker and repeats monthly when asked", async () => {
    const { screen, user, onSave } = setup({ accounts: [nubank, itau] });

    await user.click(screen.getByRole("button", { name: "Receita" }));
    expect(screen.queryByRole("group", { name: "Para qual meta?" })).toBeNull();
    await user.type(screen.getByLabelText("Valor"), "500000");
    await user.type(screen.getByLabelText("Descrição"), "Salário");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Conta" }),
      "itau",
    );
    await user.click(
      screen.getByRole("switch", { name: "Repetir mensalmente" }),
    );
    await user.clear(screen.getByLabelText("Por quantos meses?"));
    await user.type(screen.getByLabelText("Por quantos meses?"), "3");
    await user.click(
      screen.getByRole("button", { name: "Adicionar transação" }),
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "income",
        goal: null,
        accountId: "itau",
      }),
      3,
    );
  });

  test("editing keeps id, member and revision and shows who changed it", async () => {
    const editing = transaction({
      createdBy: "ana",
      updatedBy: "bia",
      memberId: "bia",
    });

    const { screen, user, onSave, onClose } = setup({ editing, saved: false });

    expect(
      screen.getByRole("heading", { name: "Editar transação" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Registrado por Ana\. Última alteração por Bia\./),
    ).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Remover tag casa" }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "t1",
        memberId: "bia",
        revision: 1,
        tags: [],
      }),
      1,
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  test("rejects a zero amount with a linked field error", async () => {
    const { screen, user, onSave } = setup();

    await user.type(screen.getByLabelText("Valor"), "0");
    await user.type(screen.getByLabelText("Descrição"), "Nada");
    await user.click(
      screen.getByRole("button", { name: "Adicionar transação" }),
    );

    const error = await screen.findByText(
      "Digite um valor válido, como 45,90.",
    );

    expect(error.id).toBe("amount-error");
    expect(onSave).not.toHaveBeenCalled();
  });

  test("adds a suggested tag and ignores duplicates", async () => {
    const { screen, user, onSave } = setup();

    await user.click(screen.getByRole("button", { name: "#mercado" }));
    await user.type(screen.getByLabelText(/Tags/), "mercado{Enter}");
    await user.type(screen.getByLabelText("Valor"), "100");
    await user.type(screen.getByLabelText("Descrição"), "Pão");
    await user.click(screen.getByRole("button", { name: "Custo fixo" }));
    await user.click(
      screen.getByRole("button", { name: "Adicionar transação" }),
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["mercado"] }),
      1,
    );
  });
});
