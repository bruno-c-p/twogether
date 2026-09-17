import { useCallback, useEffect, useRef, useState } from "react";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { mutateBudget } from "@/features/budget/actions/load-budget";
import type {
  BankAccount,
  Transaction,
  GoalPercentages,
  BudgetCommand,
  CommandResult,
} from "@/features/budget/types";

export function useBudget() {
  const router = useRouter();
  const snapshot = useLoaderData({ from: "/" });
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    try {
      await router.invalidate();
      setSyncError("");
    } catch (error) {
      setSyncError(
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : "Sem conexão com o servidor. Tentaremos sincronizar novamente.",
      );
    }
  }, [router]);
  useEffect(() => {
    const synchronize = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", synchronize);
    window.addEventListener("online", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("online", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [refresh]);

  const command = useCallback(
    async (data: BudgetCommand): Promise<CommandResult | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        const result = await mutateBudget({ data });
        await router.invalidate();
        return result;
      } catch (error) {
        const message =
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "Sem conexão. Confira o orçamento antes de tentar novamente.";
        setError(message);
        if (message === "Sua sessão expirou. Entre novamente.")
          void router.invalidate();
        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [router],
  );

  return {
    state: snapshot.budget,
    user: snapshot.user,
    household: snapshot.household,
    error: error || syncError,
    busy,
    refresh,
    command,
    saveTransaction: async (transaction: Transaction, occurrences = 1) =>
      !!(await command({ action: "save", transaction, occurrences })),
    removeTransaction: async (
      transaction: Transaction,
      following?: Transaction[],
    ) =>
      !!(await command({
        action: "delete",
        following: following?.map((item) => ({
          id: item.id,
          revision: item.revision ?? 0,
        })),
        id: transaction.id,
        revision: transaction.revision ?? 0,
      })),
    restore: async (transaction: Transaction) =>
      !!(await command({
        action: "undo-delete",
        id: transaction.id,
        revision: (transaction.revision ?? 0) + 1,
      })),
    saveAccount: async (account: BankAccount) =>
      !!(await command({ action: "save-account", account })),
    removeAccount: async (account: BankAccount) =>
      !!(await command({
        action: "delete-account",
        id: account.id,
        revision: account.revision ?? 0,
      })),
    savePercentages: async (percentages: GoalPercentages, revision: number) =>
      !!(await command({ action: "percentages", percentages, revision })),
  };
}
export type BudgetController = ReturnType<typeof useBudget>;
