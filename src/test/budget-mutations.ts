import { vi } from "vitest";
import type { BudgetMutations } from "@/features/budget/hooks/use-budget-mutations";

type Handle = Omit<BudgetMutations["saveTransaction"], "name">;

function idleMutation(succeeds: boolean) {
  return {
    run: vi.fn(() => Promise.resolve(succeeds)),
    reset: vi.fn(),
    pending: false,
    error: "",
  };
}

export function fakeBudgetMutations(
  succeeds = false,
  saveTransaction: Handle = idleMutation(succeeds),
): BudgetMutations {
  const idle = <Name extends string>(name: Name) => ({
    ...idleMutation(succeeds),
    name,
  });

  return {
    saveTransaction: { ...saveTransaction, name: "saveTransaction" },
    deleteTransaction: idle("deleteTransaction"),
    restoreTransaction: idle("restoreTransaction"),
    savePercentages: idle("savePercentages"),
    settleSplit: idle("settleSplit"),
    unsettleSplit: idle("unsettleSplit"),
    splitBusy: false,
    busy: false,
  };
}
