import { describe, expect, test, vi } from "vitest";
import {
  SettleDialog,
  type SettleInput,
} from "@/features/budget/components/settle-dialog";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { ana, nubank, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const itau: BankAccount = { id: "itau", name: "Itaú", openingBalance: 0 };

function setup({
  source = transaction({ amount: 10000, memberId: "ana", split: {} }),
  accounts = [nubank, itau],
  busy = false,
  serverError = "",
}: {
  source?: Transaction;
  accounts?: BankAccount[];
  busy?: boolean;
  serverError?: string;
} = {}) {
  const onConfirm = vi.fn<(input: SettleInput) => Promise<void>>(() =>
    Promise.resolve(),
  );

  const onClose = vi.fn();

  const view = renderPlain(
    <SettleDialog
      transaction={source}
      members={[ana, { ...ana, id: "bia", name: "Bia" }]}
      accounts={accounts}
      busy={busy}
      serverError={serverError}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

  return { ...view, onConfirm, onClose };
}

describe("SettleDialog", () => {
  test("explains the half owed and confirms with the chosen accounts", async () => {
    const { screen, user, onConfirm, onClose } = setup();

    expect(
      screen.getByText(/Você paga R\$\s50,00 a Ana por “Mercado”\./),
    ).toBeTruthy();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Conta de onde você pagou" }),
      "itau",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerAccountId: "itau",
        payerAccountId: "nubank",
      }),
    );
    // The settle action closes the dialog once it succeeds.
    expect(onClose).not.toHaveBeenCalled();
  });

  test("shows the server's message when it refuses", () => {
    const { screen } = setup({ serverError: "Já foi pago." });

    expect(screen.getByText("Já foi pago.")).toBeTruthy();
  });

  test("while saving the form is locked and says so", async () => {
    const { screen, user, onConfirm } = setup({ busy: true });
    const submit = screen.getByRole("button", { name: "Salvando…" });

    expect(submit.closest("fieldset")?.disabled).toBe(true);
    await user.click(submit);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("an account that no longer exists must be chosen again", async () => {
    const { screen, onConfirm, container } = setup({
      source: transaction({ accountId: "gone", memberId: "ana", split: {} }),
      accounts: [itau],
    });

    const form = container.ownerDocument.querySelector("form");

    for (const select of container.ownerDocument.querySelectorAll("select"))
      select.removeAttribute("required");
    form?.requestSubmit();

    expect(
      (await screen.findAllByText("Escolha uma conta bancária.")).length,
    ).toBe(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("an invalid date is rejected", async () => {
    const { screen, onConfirm, container } = setup();

    const date =
      container.ownerDocument.querySelector<HTMLInputElement>(
        "input[name=date]",
      );

    date?.removeAttribute("required");

    if (date) date.value = "";
    container.ownerDocument.querySelector("form")?.requestSubmit();

    expect(await screen.findByText("Escolha uma data válida.")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
