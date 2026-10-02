import { describe, expect, test, vi } from "vitest";
import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup(
  overrides: Partial<Parameters<typeof DeleteRecurrenceDialog>[0]> = {},
) {
  const props = {
    transaction: transaction({ description: "Aluguel" }),
    count: 3,
    busy: false,
    error: "",
    onClose: vi.fn(),
    onDelete: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  return { props, ...renderPlain(<DeleteRecurrenceDialog {...props} />) };
}

describe("DeleteRecurrenceDialog", () => {
  test("deletes only this occurrence by default", async () => {
    const { screen, user, props } = setup();

    await user.click(screen.getByRole("button", { name: "Excluir transação" }));
    expect(props.onDelete).toHaveBeenCalledWith(false);
  });

  test("warns and deletes the following occurrences when chosen", async () => {
    const { screen, user, props } = setup();

    await user.click(screen.getByLabelText(/Esta e as seguintes/));
    expect(screen.getByText(/não pode ser desfeita/)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Excluir 3 transações" }),
    );
    expect(props.onDelete).toHaveBeenCalledWith(true);
  });

  test("the last occurrence offers no 'following' option", () => {
    const { screen } = setup({ count: 1 });

    expect(screen.queryByLabelText(/Esta e as seguintes/)).toBeNull();
  });

  test("while busy it shows progress, the error, and ignores Escape", () => {
    const { screen, props, container } = setup({
      busy: true,
      error: "Falhou.",
    });

    const dialog = container.ownerDocument.querySelector("dialog");

    expect(screen.getByText("Excluindo…")).toBeTruthy();
    expect(screen.getByText("Falhou.")).toBeTruthy();
    dialog?.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test("Escape closes it when idle", async () => {
    const { props, container } = setup();

    container.ownerDocument
      .querySelector("dialog")
      ?.dispatchEvent(new Event("cancel", { cancelable: true }));
    await vi.waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });
});
