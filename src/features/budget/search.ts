import { currentMonth } from "@/features/budget/domain/format";
import type {
  GoalId,
  TransactionKind,
  View,
} from "@/features/budget/domain/types";

export function isBudgetToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
const views: View[] = ["overview", "transactions", "accounts", "goals"];
const goals: GoalId[] = [
  "fixed",
  "pleasure",
  "comfort",
  "targets",
  "knowledge",
  "freedom",
];
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

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
  const access = isBudgetToken(search.access) ? search.access : undefined;
  const convite = isBudgetToken(search.convite) ? search.convite : undefined;
  return { access, convite };
}

export function validateBudgetFilters(
  search: Record<string, unknown>,
): BudgetFilters {
  const view =
    typeof search.view === "string" && views.includes(search.view as View)
      ? (search.view as View)
      : undefined;
  const month =
    typeof search.month === "string" && monthPattern.test(search.month)
      ? search.month
      : undefined;
  const member =
    typeof search.member === "string" &&
    search.member &&
    search.member.length <= 64
      ? search.member
      : undefined;
  const query =
    typeof search.query === "string" && search.query.trim()
      ? search.query.slice(0, 200)
      : undefined;
  const goal =
    typeof search.goal === "string" && goals.includes(search.goal as GoalId)
      ? (search.goal as GoalId)
      : undefined;
  const tag =
    typeof search.tag === "string" && search.tag && search.tag.length <= 100
      ? search.tag
      : undefined;
  const kind =
    search.kind === "expense" || search.kind === "income"
      ? search.kind
      : undefined;
  return { view, month, member, query, goal, tag, kind };
}

export function validateBudgetSearch(
  search: Record<string, unknown>,
): BudgetSearch {
  return {
    ...validateBudgetFilters(search),
    ...validateAccessSearch(search),
  };
}
