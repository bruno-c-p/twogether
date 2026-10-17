import { budgetActions } from "@/features/budget/actions";
import {
  budgetMutations,
  type BudgetExtra,
  type BudgetInput,
  type BudgetMutationName,
} from "@/features/budget/actions/mutations";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { useMutation } from "@/features/budget/hooks/use-mutation";

type Args<K extends BudgetMutationName> =
  BudgetExtra<K> extends undefined
    ? [input: BudgetInput<K>]
    : [input: BudgetInput<K>, extra: BudgetExtra<K>];

// Annotated per key so indexing with a generic K keeps the definition and
// its server fn correlated.
const definitions: {
  [K in BudgetMutationName]: {
    optimistic?: (
      snapshot: WorkspaceSnapshot,
      ...args: Args<K>
    ) => WorkspaceSnapshot;
  };
} = budgetMutations;

const actions: {
  [K in BudgetMutationName]: (opts: { data: BudgetInput<K> }) => Promise<void>;
} = budgetActions;

function useBudgetMutation<K extends BudgetMutationName>(name: K) {
  const mutation = useMutation(
    (...args: Args<K>) => actions[name]({ data: args[0] }),
    definitions[name].optimistic,
  );

  return { ...mutation, name };
}

type Handles = {
  [K in BudgetMutationName]: ReturnType<typeof useBudgetMutation<K>>;
};

export function useBudgetMutations() {
  // A fixed literal, not a loop: rules of hooks.
  const handles = {
    saveTransaction: useBudgetMutation("saveTransaction"),
    deleteTransaction: useBudgetMutation("deleteTransaction"),
    restoreTransaction: useBudgetMutation("restoreTransaction"),
    settleSplit: useBudgetMutation("settleSplit"),
    unsettleSplit: useBudgetMutation("unsettleSplit"),
    savePercentages: useBudgetMutation("savePercentages"),
  } satisfies Handles;

  return {
    ...handles,
    splitBusy: handles.settleSplit.pending || handles.unsettleSplit.pending,
    busy: Object.values(handles).some((mutation) => mutation.pending),
  };
}

export type BudgetMutations = ReturnType<typeof useBudgetMutations>;
