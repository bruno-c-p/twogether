import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type {
  BankAccount,
  Transaction,
  GoalPercentages,
  SharedSnapshot,
  BudgetCommand,
  CommandResult,
} from "@/features/budget/types";

const emptySnapshot = (): SharedSnapshot => ({
  user: null,
  household: null,
  budget: {
    transactions: [],
    accounts: [],
    percentages: { ...DEFAULT_PERCENTAGES },
  },
});

export function useBudget(initialSnapshot: SharedSnapshot) {
  const router = useRouter();
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const accessToken = search.access ?? "";
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const current = ++generation.current;
    try {
      const response = await fetch("/api/budget", { cache: "no-store" });
      if (!response.ok)
        throw new Error("Não foi possível sincronizar. Tente novamente.");
      const result: CommandResult = await response.json();
      if (current !== generation.current) return;
      setSnapshot(result.snapshot);
      setSyncError("");
    } catch (error) {
      if (current === generation.current)
        setSyncError(
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "Sem conexão com o servidor. Tentaremos sincronizar novamente.",
        );
    }
  }, []);
  useEffect(() => {
    const synchronize = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", synchronize);
    window.addEventListener("online", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    const invalidateRequests = () => {
      generation.current++;
    };
    return () => {
      invalidateRequests();
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("online", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [refresh]);

  const command = useCallback(
    async (data: BudgetCommand): Promise<CommandResult | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      generation.current++;
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 401) setSnapshot(emptySnapshot());
          throw new Error(result.error || "Não foi possível salvar.");
        }
        const success: CommandResult = result;
        setSnapshot(success.snapshot);
        void router.invalidate();
        return success;
      } catch (error) {
        setError(
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "Sem conexão. Confira o orçamento antes de tentar novamente.",
        );
        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [router],
  );

  return {
    accessToken,
    finishAccess: () => {
      setError("");
      void navigate({
        to: "/",
        search: (prev) => ({ ...prev, access: undefined }),
        replace: true,
      });
    },
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
