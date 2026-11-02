import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { Button } from "@/components/glaze/ui/button";
import { toast } from "@/components/glaze/ui/toast";
import { AppToaster } from "@/components/ui/toaster";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import { useWorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { fakeBudgetMutations } from "@/test/budget-mutations";
import { ana, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const budget: BudgetController = {
  state: {
    transactions: [],
    percentages: { ...DEFAULT_PERCENTAGES },
  },
  user: { id: "ana", name: "Ana" },
  household: { id: "home", members: [{ ...ana, percentagesRevision: 7 }] },
  syncError: "",
};

const series = [0, 1, 2].map((index) =>
  transaction({
    id: `r${index}`,
    recurrenceId: "rent",
    recurrenceIndex: index,
    revision: index,
  }),
);

function Harness({ mutations }: { mutations: BudgetMutations }) {
  const dialogs = useWorkspaceDialogs(mutations, series);

  const actions = useWorkspaceActions({
    budget,
    dialogs,
    mutations,
    setMonth: vi.fn(),
  });

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => dialogs.setDeleting(series[0])}
      >
        pick
      </Button>
      <Button
        variant="secondary"
        onClick={() => void actions.deleteRecurring(series[0], [])}
      >
        delete one
      </Button>
      <Button
        variant="secondary"
        onClick={() => void actions.deleteRecurring(series[0], series.slice(1))}
      >
        delete following
      </Button>
      <Button variant="secondary" onClick={actions.openPercentages}>
        edit percentages
      </Button>
      <AppToaster />
      <p data-testid="deleting">{dialogs.deleting?.id ?? "none"}</p>
      <p data-testid="percentages">{dialogs.percentagesRevision ?? "closed"}</p>
    </>
  );
}

function setup(props: Parameters<typeof Harness>[0]) {
  return renderWithProviders(<Harness {...props} />);
}

describe("useWorkspaceActions", () => {
  afterEach(() => toast.dismiss());
  test("deleting one occurrence offers undo and closes the dialog", async () => {
    const mutations = fakeBudgetMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete one" }));

    await vi.waitFor(() =>
      expect(screen.getByText("Transação excluída.").textContent).toBe(
        "Transação excluída.",
      ),
    );
    expect(mutations.deleteTransaction.run).toHaveBeenCalledWith({
      id: "r0",
      revision: 0,
      following: undefined,
    });
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });

  test("deleting the following occurrences sends each revision", async () => {
    const mutations = fakeBudgetMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete following" }));

    await vi.waitFor(() =>
      expect(screen.getByText("3 transações excluídas.").textContent).toBe(
        "3 transações excluídas.",
      ),
    );
    expect(mutations.deleteTransaction.run).toHaveBeenCalledWith({
      id: "r0",
      revision: 0,
      following: [
        { id: "r1", revision: 1 },
        { id: "r2", revision: 2 },
      ],
    });
  });

  test("a failed delete keeps the dialog open", async () => {
    const mutations = fakeBudgetMutations(false);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete one" }));
    await vi.waitFor(() =>
      expect(mutations.deleteTransaction.run).toHaveBeenCalled(),
    );
    expect(screen.getByTestId("deleting").textContent).toBe("r0");
    expect(screen.queryByText("Transação excluída.")).toBeNull();
  });

  test("percentages open at the person's own revision", async () => {
    const { screen, user } = await setup({
      mutations: fakeBudgetMutations(true),
    });

    await user.click(screen.getByRole("button", { name: "edit percentages" }));
    expect(screen.getByTestId("percentages").textContent).toBe("7");
  });

  test("undo restores the deleted transaction at the next revision", async () => {
    const mutations = fakeBudgetMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "delete one" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desfazer" }));

    await screen.findByText("Alteração desfeita.");
    expect(mutations.restoreTransaction.run).toHaveBeenCalledWith(
      { id: "r0", revision: 1 },
      { transaction: series[0] },
    );
  });

  test("failed undo keeps its action available for retry", async () => {
    const mutations = fakeBudgetMutations(true);
    vi.mocked(mutations.restoreTransaction.run).mockResolvedValueOnce(false);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "delete one" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desfazer" }));
    await vi.waitFor(() =>
      expect(mutations.restoreTransaction.run).toHaveBeenCalledTimes(1),
    );
    expect(screen.queryByText("Alteração desfeita.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await screen.findByText("Alteração desfeita.");
    expect(mutations.restoreTransaction.run).toHaveBeenCalledTimes(2);
  });
});
