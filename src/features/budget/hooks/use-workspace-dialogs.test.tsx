import { describe, expect, test, vi } from "vitest";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

function idle() {
  return {
    run: vi.fn(() => Promise.resolve(false)),
    reset: vi.fn(),
    pending: false,
    error: "",
  };
}

function Harness() {
  const saveTx = useMutation(() =>
    Promise.reject(new Error("Transação duplicada.")),
  );

  const mutations: BudgetMutations = {
    saveTx,
    deleteTx: idle(),
    restoreTx: idle(),
    savePct: idle(),
    settleTx: idle(),
    unsettleTx: idle(),
    splitBusy: false,
    busy: false,
  };

  const dialogs = useWorkspaceDialogs(mutations);

  return (
    <>
      <button
        onClick={() => dialogs.setTransaction({ transaction: transaction() })}
      >
        open
      </button>
      <button onClick={() => void saveTx.run()}>save</button>
      <button onClick={() => dialogs.setTransaction(null)}>close</button>
      <p role="status">{saveTx.error || "no error"}</p>
    </>
  );
}

describe("useWorkspaceDialogs", () => {
  test("opening or closing a dialog clears its mutation's old error", async () => {
    const { screen, user } = await renderWithProviders(<Harness />);
    const status = () => screen.getByRole("status").textContent;

    await user.click(screen.getByRole("button", { name: "open" }));
    await user.click(screen.getByRole("button", { name: "save" }));
    await vi.waitFor(() => expect(status()).toBe("Transação duplicada."));

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(status()).toBe("no error");

    await user.click(screen.getByRole("button", { name: "save" }));
    await vi.waitFor(() => expect(status()).toBe("Transação duplicada."));
    await user.click(screen.getByRole("button", { name: "open" }));
    expect(status()).toBe("no error");
  });
});
