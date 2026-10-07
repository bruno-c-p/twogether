import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import { useWorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { ana, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

function fakeMutations(succeeds: boolean): BudgetMutations {
  const ok = succeeds;
  const idle = { pending: false, error: "", reset: vi.fn() };

  return {
    saveTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    deleteTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    restoreTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    savePct: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    settleTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    unsettleTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    splitBusy: false,
    busy: false,
  };
}

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
  const dialogs = useWorkspaceDialogs(mutations);

  const actions = useWorkspaceActions({
    budget,
    dialogs,
    mutations,
    setMonth: vi.fn(),
  });

  return (
    <>
      <button onClick={() => dialogs.setDeleting(series[0])}>pick</button>
      <button onClick={() => void actions.deleteRecurring(series[0], [])}>
        delete one
      </button>
      <button
        onClick={() => void actions.deleteRecurring(series[0], series.slice(1))}
      >
        delete following
      </button>
      <button onClick={actions.openPercentages}>edit percentages</button>
      <Toaster />
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
    const mutations = fakeMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete one" }));

    await vi.waitFor(() =>
      expect(screen.getByText("Transação excluída.").textContent).toBe(
        "Transação excluída.",
      ),
    );
    expect(mutations.deleteTx.run).toHaveBeenCalledWith({
      id: "r0",
      revision: 0,
      following: undefined,
    });
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });

  test("deleting the following occurrences sends each revision", async () => {
    const mutations = fakeMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete following" }));

    await vi.waitFor(() =>
      expect(screen.getByText("3 transações excluídas.").textContent).toBe(
        "3 transações excluídas.",
      ),
    );
    expect(mutations.deleteTx.run).toHaveBeenCalledWith({
      id: "r0",
      revision: 0,
      following: [
        { id: "r1", revision: 1 },
        { id: "r2", revision: 2 },
      ],
    });
  });

  test("a failed delete keeps the dialog open", async () => {
    const mutations = fakeMutations(false);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete one" }));
    await vi.waitFor(() => expect(mutations.deleteTx.run).toHaveBeenCalled());
    expect(screen.getByTestId("deleting").textContent).toBe("r0");
    expect(screen.queryByText("Transação excluída.")).toBeNull();
  });

  test("percentages open at the person's own revision", async () => {
    const { screen, user } = await setup({ mutations: fakeMutations(true) });

    await user.click(screen.getByRole("button", { name: "edit percentages" }));
    expect(screen.getByTestId("percentages").textContent).toBe("7");
  });

  test("undo restores the deleted transaction at the next revision", async () => {
    const mutations = fakeMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "delete one" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desfazer" }));

    await screen.findByText("Alteração desfeita.");
    expect(mutations.restoreTx.run).toHaveBeenCalledWith({
      id: "r0",
      revision: 1,
      transaction: series[0],
    });
  });

  test("failed undo keeps its action available for retry", async () => {
    const mutations = fakeMutations(true);
    vi.mocked(mutations.restoreTx.run).mockResolvedValueOnce(false);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "delete one" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desfazer" }));
    await vi.waitFor(() =>
      expect(mutations.restoreTx.run).toHaveBeenCalledTimes(1),
    );
    expect(screen.queryByText("Alteração desfeita.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await screen.findByText("Alteração desfeita.");
    expect(mutations.restoreTx.run).toHaveBeenCalledTimes(2);
  });
});
