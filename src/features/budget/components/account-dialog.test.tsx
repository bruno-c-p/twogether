import { describe, expect, test, vi } from "vitest";
import { AccountDialog } from "@/features/budget/components/account-dialog";
import type { BankAccount } from "@/features/budget/domain/types";
import { nubank } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup({
  account = null,
  saved = true,
  serverError = "",
}: {
  account?: BankAccount | null;
  saved?: boolean;
  serverError?: string;
} = {}) {
  const onSave = vi.fn<(account: BankAccount) => Promise<boolean>>(() =>
    Promise.resolve(saved),
  );

  const onClose = vi.fn();

  const view = renderPlain(
    <AccountDialog
      account={account}
      serverError={serverError}
      onSave={onSave}
      onClose={onClose}
    />,
  );

  return { ...view, onSave, onClose };
}

describe("AccountDialog", () => {
  test("creates an account from the typed name and opening balance", async () => {
    const { screen, user, onSave, onClose } = setup();

    expect(screen.getByRole("heading", { name: "Nova conta" })).toBeTruthy();
    await user.type(screen.getByLabelText("Nome da conta"), "Itaú");
    await user.type(screen.getByLabelText("Saldo inicial"), "150075");
    expect(screen.getByLabelText("Saldo inicial")).toHaveProperty(
      "value",
      "1.500,75",
    );
    await user.click(screen.getByRole("button", { name: "Adicionar conta" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Itaú", openingBalance: 150075 }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  test("edits keep the id and revision and stay open when saving fails", async () => {
    const { screen, user, onSave, onClose } = setup({
      account: nubank,
      saved: false,
      serverError: "Conflito.",
    });

    expect(screen.getByText("Conflito.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(onSave).toHaveBeenCalledWith({
      id: "nubank",
      name: "Nubank",
      openingBalance: 100000,
      revision: 1,
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  test("shows field errors instead of saving invalid input", async () => {
    const { screen, user, onSave, container } = setup();
    const form = container.ownerDocument.querySelector("form");

    await user.type(screen.getByLabelText("Nome da conta"), "   ");
    await user.type(screen.getByLabelText("Saldo inicial"), "0");
    form?.requestSubmit();

    const error = await screen.findByText("Dê um nome para esta conta.");

    expect(error.id).toBe("account-name-error");
    expect(
      container.ownerDocument
        .getElementById("account-name")
        ?.getAttribute("aria-invalid"),
    ).toBe("true");
    expect(onSave).not.toHaveBeenCalled();
  });
});
