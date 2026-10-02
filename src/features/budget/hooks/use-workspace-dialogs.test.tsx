import { describe, expect, test, vi } from "vitest";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { nubank } from "@/test/fixtures";
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
  const saveAcc = useMutation(() =>
    Promise.reject(new Error("Conta duplicada.")),
  );

  const mutations: BudgetMutations = {
    saveTx: idle(),
    deleteTx: idle(),
    restoreTx: idle(),
    saveAcc,
    deleteAcc: idle(),
    savePct: idle(),
    settleTx: idle(),
    unsettleTx: idle(),
    splitBusy: false,
    busy: false,
  };

  const dialogs = useWorkspaceDialogs(mutations);

  return (
    <>
      <button onClick={() => dialogs.setAccount({ account: nubank })}>
        open
      </button>
      <button onClick={() => void saveAcc.run()}>save</button>
      <button onClick={() => dialogs.setAccount(null)}>close</button>
      <p role="status">{saveAcc.error || "no error"}</p>
    </>
  );
}

describe("useWorkspaceDialogs", () => {
  test("opening or closing a dialog clears its mutation's old error", async () => {
    const { screen, user } = await renderWithProviders(<Harness />);
    const status = () => screen.getByRole("status").textContent;

    await user.click(screen.getByRole("button", { name: "open" }));
    await user.click(screen.getByRole("button", { name: "save" }));
    await vi.waitFor(() => expect(status()).toBe("Conta duplicada."));

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(status()).toBe("no error");

    await user.click(screen.getByRole("button", { name: "save" }));
    await vi.waitFor(() => expect(status()).toBe("Conta duplicada."));
    await user.click(screen.getByRole("button", { name: "open" }));
    expect(status()).toBe("no error");
  });
});
