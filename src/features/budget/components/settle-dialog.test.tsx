import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  SettleDialog,
  type SettleInput,
} from "@/features/budget/components/settle-dialog";
import type { Transaction } from "@/features/budget/domain/types";
import { ana, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";

function setup({
  source = transaction({ amount: 10000, memberId: "ana", split: {} }),
  busy = false,
  serverError = "",
}: {
  source?: Transaction;
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
      busy={busy}
      serverError={serverError}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

  return { ...view, onConfirm, onClose };
}

describe("SettleDialog", () => {
  test("explains the half owed and confirms with the chosen date", async () => {
    const { screen, user, onConfirm, onClose } = setup();

    expect(
      screen.getByText(/Você paga R\$\s50,00 a Ana por “Mercado”\./),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );

    expect(onConfirm).toHaveBeenCalledWith({ date: today(browserTimeZone()) });
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

  test("an invalid date is rejected", async () => {
    const { screen, onConfirm, container } = setup();

    const date =
      container.ownerDocument.querySelector<HTMLInputElement>(
        "input[name=date]",
      );

    date?.removeAttribute("required");

    if (date) fireEvent.change(date, { target: { value: "" } });
    container.ownerDocument.querySelector("form")?.requestSubmit();

    expect(await screen.findByText("Escolha uma data válida.")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
