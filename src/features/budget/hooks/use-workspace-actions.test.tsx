import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import type { Notice } from "@/features/budget/components/notice";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { Transaction } from "@/features/budget/domain/types";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";
import { useWorkspaceActions } from "@/features/budget/hooks/use-workspace-actions";
import { useWorkspaceDialogs } from "@/features/budget/hooks/use-workspace-dialogs";
import { ana, nubank, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

function fakeMutations(succeeds: boolean): BudgetMutations {
  const ok = succeeds;
  const idle = { pending: false, error: "", reset: vi.fn() };

  return {
    saveTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    deleteTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    restoreTx: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    saveAcc: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
    deleteAcc: { ...idle, run: vi.fn(() => Promise.resolve(ok)) },
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
    accounts: [nubank],
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

function Harness({
  mutations,
  initialNotice = null,
}: {
  mutations: BudgetMutations;
  initialNotice?: Notice | null;
}) {
  const dialogs = useWorkspaceDialogs(mutations);
  const [notice, setNotice] = useState<Notice | null>(initialNotice);

  const actions = useWorkspaceActions({
    budget,
    dialogs,
    mutations,
    notice,
    setNotice,
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
      <button onClick={() => dialogs.setAccount({ account: nubank })}>
        edit account
      </button>
      <button onClick={() => void actions.saveAccountRecord(nubank)}>
        save account
      </button>
      <button onClick={actions.openPercentages}>edit percentages</button>
      <button onClick={() => void actions.undoNotice()}>undo</button>
      <p role="status">{notice?.message ?? ""}</p>
      <p data-testid="deleting">{dialogs.deleting?.id ?? "none"}</p>
      <p data-testid="account">{dialogs.account ? "open" : "closed"}</p>
      <p data-testid="percentages">{dialogs.percentagesRevision ?? "closed"}</p>
    </>
  );
}

function setup(props: Parameters<typeof Harness>[0]) {
  return renderWithProviders(<Harness {...props} />);
}

describe("useWorkspaceActions", () => {
  test("deleting one occurrence offers undo and closes the dialog", async () => {
    const mutations = fakeMutations(true);
    const { screen, user } = await setup({ mutations });

    await user.click(screen.getByRole("button", { name: "pick" }));
    await user.click(screen.getByRole("button", { name: "delete one" }));

    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
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
      expect(screen.getByRole("status").textContent).toBe(
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
    expect(screen.getByRole("status").textContent).toBe("");
  });

  test("saving an account says added or updated, and nothing on failure", async () => {
    const added = await setup({ mutations: fakeMutations(true) });

    await added.user.click(
      added.screen.getByRole("button", { name: "save account" }),
    );
    await vi.waitFor(() =>
      expect(added.screen.getByRole("status").textContent).toBe(
        "Conta adicionada.",
      ),
    );
    added.unmount();

    const updated = await setup({ mutations: fakeMutations(true) });

    await updated.user.click(
      updated.screen.getByRole("button", { name: "edit account" }),
    );
    await updated.user.click(
      updated.screen.getByRole("button", { name: "save account" }),
    );
    await vi.waitFor(() =>
      expect(updated.screen.getByRole("status").textContent).toBe(
        "Conta atualizada.",
      ),
    );
    expect(updated.screen.getByTestId("account").textContent).toBe("closed");
    updated.unmount();

    const failed = await setup({ mutations: fakeMutations(false) });

    await failed.user.click(
      failed.screen.getByRole("button", { name: "edit account" }),
    );
    await failed.user.click(
      failed.screen.getByRole("button", { name: "save account" }),
    );
    expect(failed.screen.getByRole("status").textContent).toBe("");
    expect(failed.screen.getByTestId("account").textContent).toBe("open");
  });

  test("percentages open at the person's own revision", async () => {
    const { screen, user } = await setup({ mutations: fakeMutations(true) });

    await user.click(screen.getByRole("button", { name: "edit percentages" }));
    expect(screen.getByTestId("percentages").textContent).toBe("7");
  });

  test("undo restores the deleted transaction at the next revision", async () => {
    const mutations = fakeMutations(true);
    const undo: Transaction = transaction({ id: "t9", revision: 4 });

    const { screen, user } = await setup({
      mutations,
      initialNotice: { message: "Transação excluída.", undo },
    });

    await user.click(screen.getByRole("button", { name: "undo" }));

    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        "Alteração desfeita.",
      ),
    );
    expect(mutations.restoreTx.run).toHaveBeenCalledWith({
      id: "t9",
      revision: 5,
      transaction: undo,
    });
  });

  test("undo without anything to restore does nothing", async () => {
    const mutations = fakeMutations(true);

    const { screen, user } = await setup({
      mutations,
      initialNotice: { message: "Oi." },
    });

    await user.click(screen.getByRole("button", { name: "undo" }));
    expect(mutations.restoreTx.run).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Oi.");
  });
});
