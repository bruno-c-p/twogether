import { z } from "zod";
import { goalIdSchema, monthSchema } from "@/features/budget/domain/schemas";
import type {
  GoalId,
  TransactionKind,
  View,
} from "@/features/budget/domain/types";

const drop = <Schema extends z.ZodType>(schema: Schema) =>
  schema.optional().catch(undefined);

const viewSchema = z.enum(["overview", "transactions", "accounts", "goals"], {
  error: "Visão inválida.",
});

const memberSchema = z.string({ error: "Pessoa inválida." }).min(1).max(64);

const querySchema = z
  .string({ error: "Busca inválida." })
  .refine((value) => value.trim().length > 0)
  .transform((value) => value.slice(0, 200));

const tagSchema = z.string({ error: "Tag inválida." }).min(1).max(100);

const kindSchema = z.enum(["expense", "income"], {
  error: "Tipo inválido.",
});

const budgetFiltersSchema = z.object({
  view: drop(viewSchema),
  month: drop(monthSchema),
  member: drop(memberSchema),
  query: drop(querySchema),
  goal: drop(goalIdSchema),
  tag: drop(tagSchema),
  kind: drop(kindSchema),
});

export interface BudgetFilters {
  view?: View;
  month?: string;
  member?: string;
  query?: string;
  goal?: GoalId;
  tag?: string;
  kind?: TransactionKind;
}

export function withView(search: BudgetFilters, view: View): BudgetFilters {
  return { ...search, view };
}

export function openView(search: BudgetFilters, view: View): BudgetFilters {
  return {
    ...search,
    view,
    query: undefined,
    goal: undefined,
    tag: undefined,
    kind: undefined,
  };
}

export function openGoalTransactions(
  search: BudgetFilters,
  goal: GoalId,
): BudgetFilters {
  return {
    ...search,
    view: "transactions",
    goal,
    query: undefined,
    tag: undefined,
    kind: undefined,
  };
}

export function missingWorkspaceMonth(search: BudgetFilters): boolean {
  return !search.month;
}

export function withDefaultMonth(
  search: BudgetFilters,
  month: string,
): BudgetFilters {
  return { ...search, month };
}

export function validateBudgetFilters(
  search: Record<string, unknown>,
): BudgetFilters {
  return budgetFiltersSchema.parse(search);
}
