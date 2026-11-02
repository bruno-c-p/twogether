import { describe, expect, test, vi } from "vitest";
import { Button } from "@/components/glaze/ui/button";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { fakeBudgetMutations } from "@/test/budget-mutations";
import { transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

function Harness() {
  const saveTransaction = useMutation(() =>
    Promise.reject(new Error("Transação duplicada.")),
  );

  const mutations = fakeBudgetMutations(false, saveTransaction);

  const dialogs = useWorkspaceDialogs(mutations, [transaction()]);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => dialogs.setTransaction({ transaction: transaction() })}
      >
        open
      </Button>
      <Button variant="secondary" onClick={() => void saveTransaction.run()}>
        save
      </Button>
      <Button variant="secondary" onClick={() => dialogs.setTransaction(null)}>
        close
      </Button>
      <p role="status">{saveTransaction.error || "no error"}</p>
      <p data-testid="editing">
        {dialogs.transaction?.transaction?.id ?? "closed"}
      </p>
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

  test("the open dialog lives in the URL, so a reload reopens it", async () => {
    const { screen, user, router } = await renderWithProviders(
      <Harness />,
      "/?month=2026-09&transaction=t1",
    );

    expect(screen.getByTestId("editing").textContent).toBe("t1");

    await user.click(screen.getByRole("button", { name: "close" }));
    await vi.waitFor(() =>
      expect(router.state.location.search).toEqual({ month: "2026-09" }),
    );
    expect(screen.getByTestId("editing").textContent).toBe("closed");
  });
});
