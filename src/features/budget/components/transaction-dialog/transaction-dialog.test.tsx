import { describe, expect, test, vi } from "vitest";
import { TransactionDialog } from "@/features/budget/components/transaction-dialog/transaction-dialog";
import type { Transaction } from "@/features/budget/domain/types";
import { ana, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup({
  editing = null,
  busy = false,
  currentUserId = "ana",
}: {
  editing?: Transaction | null;
  busy?: boolean;
  currentUserId?: string;
} = {}) {
  const onSettle = vi.fn();
  const onUnsettle = vi.fn(() => Promise.resolve());

  const onSave = vi.fn<
    (transaction: Transaction, occurrences?: number) => Promise<void>
  >(() => Promise.resolve());

  const onClose = vi.fn();

  const view = renderPlain(
    <TransactionDialog
      transaction={editing}
      defaultDate="2026-09-15"
      existingTags={["casa", "mercado"]}
      members={[ana, { ...ana, id: "bia", name: "Bia" }]}
      currentUserId={currentUserId}
      busy={busy}
      serverError=""
      splitBusy={false}
      onSave={onSave}
      onSettle={onSettle}
      onUnsettle={onUnsettle}
      onClose={onClose}
    />,
  );

  return { ...view, onSave, onClose, onSettle, onUnsettle };
}

describe("TransactionDialog", () => {
  test("adds an expense with goal and typed tag", async () => {
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
        memberId: "ana",
      }),
      1,
    );
    // The save action closes the dialog once it succeeds.
    expect(onClose).not.toHaveBeenCalled();
  });

  test("while saving the form is locked and says so", () => {
    const { screen } = setup({ editing: transaction(), busy: true });
    const submit = screen.getByRole("button", { name: "Salvando…" });

    expect(submit.closest("fieldset")?.disabled).toBe(true);
  });

  test("income drops the goal picker and repeats monthly when asked", async () => {
    const { screen, user, onSave } = setup();

    await user.click(screen.getByRole("button", { name: "Receita" }));
    expect(screen.queryByRole("group", { name: "Para qual meta?" })).toBeNull();
    await user.type(screen.getByLabelText("Valor"), "500000");
    await user.type(screen.getByLabelText("Descrição"), "Salário");
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

    const { screen, user, onSave } = setup({ editing });

    expect(
      screen.getByRole("heading", { name: "Editar transação" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Registrado por Ana\. Última alteração por Bia\./),
    ).toBeTruthy();
    expect(
      screen.queryByRole("switch", { name: "Repetir mensalmente" }),
    ).toBeNull();
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

  test("splitting a new expense with the partner saves an open split", async () => {
    const { screen, user, onSave } = setup();

    await user.type(screen.getByLabelText("Valor"), "10000");
    await user.type(screen.getByLabelText("Descrição"), "Jantar");
    await user.click(screen.getByRole("button", { name: "Prazeres" }));
    await user.click(screen.getByRole("switch", { name: "Dividir com Bia" }));
    expect(screen.getByText("Bia deve R$ 50,00 a você.")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Adicionar transação" }),
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ split: {}, amount: 10000 }),
      1,
    );
  });

  test("the debtor can mark their share as paid", async () => {
    const editing = transaction({ memberId: "ana", split: {} });
    const { screen, user, onSettle } = setup({ editing, currentUserId: "bia" });

    expect(
      screen.getByRole("switch", { name: "Dividir entre Ana e você" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Marcar como pago" }));
    expect(onSettle).toHaveBeenCalledWith(editing);
  });

  test("a paid split locks amount and kind and can be unmarked", async () => {
    const editing = transaction({
      memberId: "ana",
      split: { paidAt: "2026-09-12T12:00:00.000Z" },
    });

    const { screen, user, onUnsettle } = setup({
      editing,
      currentUserId: "bia",
    });

    expect(screen.getByLabelText("Valor").hasAttribute("readonly")).toBe(true);
    expect(
      screen
        .getByRole("switch", { name: "Dividir entre Ana e você" })
        .hasAttribute("disabled"),
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Desmarcar pagamento" }),
    );
    expect(onUnsettle).toHaveBeenCalledWith(editing);
  });

  test("income cannot be split", async () => {
    const { screen, user } = setup();

    await user.click(screen.getByRole("button", { name: "Receita" }));
    expect(screen.queryByRole("region", { name: "Divisão" })).toBeNull();
  });
});
