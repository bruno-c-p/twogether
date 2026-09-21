import { z } from "zod";
import { currentMonth } from "@/features/budget/domain/format";
import {
  budgetTokenSchema,
  goalIdSchema,
  monthSchema,
} from "@/features/budget/domain/schemas";
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

const accessSearchSchema = z.object({
  access: drop(budgetTokenSchema),
  convite: drop(budgetTokenSchema),
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

export interface AccessSearch {
  access?: string;
  convite?: string;
}

export type BudgetSearch = BudgetFilters & AccessSearch;

export function withView(search: BudgetSearch, view: View): BudgetSearch {
  return { ...search, view };
}

export function openView(search: BudgetSearch, view: View): BudgetSearch {
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
  search: BudgetSearch,
  goal: GoalId,
): BudgetSearch {
  return {
    ...search,
    view: "transactions",
    goal,
    query: undefined,
    tag: undefined,
    kind: undefined,
  };
}

export function accessRedirectSearch(
  convite?: string,
): Pick<AccessSearch, "convite"> {
  return convite ? { convite } : {};
}

export function gateRedirectSearch(search: AccessSearch): AccessSearch {
  return {
    ...(search.access ? { access: search.access } : {}),
    ...(search.convite ? { convite: search.convite } : {}),
  };
}

export function missingWorkspaceMonth(search: BudgetSearch): boolean {
  return !search.month && !search.access && !search.convite;
}

export function withDefaultMonth(
  search: BudgetSearch,
  month = currentMonth(),
): BudgetSearch {
  return { ...search, month };
}

export function validateAccessSearch(
  search: Record<string, unknown>,
): AccessSearch {
  return accessSearchSchema.parse(search);
}

export function validateBudgetFilters(
  search: Record<string, unknown>,
): BudgetFilters {
  return budgetFiltersSchema.parse(search);
}

export function validateBudgetSearch(
  search: Record<string, unknown>,
): BudgetSearch {
  return {
    ...validateBudgetFilters(search),
    ...validateAccessSearch(search),
  };
}
