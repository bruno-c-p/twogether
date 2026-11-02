import { describe, expect, test, vi } from "vitest";
import { DeleteRecurrenceDialog } from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup(
  overrides: Partial<Parameters<typeof DeleteRecurrenceDialog>[0]> = {},
) {
  const props = {
    open: true,
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

    await user.click(
      screen.getByRole("radio", { name: /Esta e as seguintes/ }),
    );
    expect(screen.getByText(/não pode ser desfeita/)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Excluir 3 transações" }),
    );
    expect(props.onDelete).toHaveBeenCalledWith(true);
  });

  test("the last occurrence offers no 'following' option", () => {
    const { screen } = setup({ count: 1 });

    expect(
      screen.queryByRole("radio", { name: /Esta e as seguintes/ }),
    ).toBeNull();
  });

  test("while busy it shows progress, the error, and ignores Escape", async () => {
    const { screen, props, user } = setup({
      busy: true,
      error: "Falhou.",
    });

    expect(screen.getByText("Excluindo…")).toBeTruthy();
    expect(screen.getByText("Falhou.")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test("Escape closes it when idle", async () => {
    const { props, user } = setup();

    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });
});
