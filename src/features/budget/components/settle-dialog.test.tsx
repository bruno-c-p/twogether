import { describe, expect, test, vi } from "vitest";
import {
  SettleDialog,
  type SettleInput,
} from "@/features/budget/components/settle-dialog";
import type { Transaction } from "@/features/budget/domain/types";
import { ana, transaction } from "@/test/fixtures";
import { cents } from "@/test/cents";
import { renderPlain } from "@/test/render";
import { today } from "@/lib/clock";
import { browserTimeZone } from "@/lib/time-zone";

// jsdom has no ResizeObserver; Glaze's dialog body watches its own size.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function setup({
  source = transaction({ amount: cents(10000), memberId: "ana", split: {} }),
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
      open
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
    const submit = screen.getByRole("button", { name: "Confirmar pagamento" });

    expect(submit.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Salvando…")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /Data do pagamento/ })
        .closest("fieldset")?.disabled,
    ).toBe(true);
    await user.click(submit);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("confirms with a day picked in the calendar", async () => {
    const { screen, user, onConfirm } = setup();
    const now = today(browserTimeZone());
    const picked = `${now.slice(0, 8)}${now.endsWith("-01") ? "02" : "01"}`;

    await user.click(screen.getByRole("button", { name: /Data do pagamento/ }));

    const day = document.querySelector<HTMLElement>(`[data-day="${picked}"]`);

    expect(day).toBeTruthy();

    if (day) await user.click(day);

    await user.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );

    expect(onConfirm).toHaveBeenCalledWith({ date: picked });
  });
});
