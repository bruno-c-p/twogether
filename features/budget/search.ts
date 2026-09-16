import type { GoalId, View } from "./types";

const tokenPattern = /^[0-9a-f]{64}$/;
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

export interface BudgetSearch {
  view?: View;
  month?: string;
  member?: string;
  query?: string;
  goal?: GoalId;
  tag?: string;
  kind?: string;
  access?: string;
  convite?: string;
}

export function validateBudgetSearch(
  search: Record<string, unknown>,
): BudgetSearch {
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
    typeof search.kind === "string" &&
    (search.kind === "expense" || search.kind === "income")
      ? search.kind
      : undefined;
  const access =
    typeof search.access === "string" && tokenPattern.test(search.access)
      ? search.access
      : undefined;
  const convite =
    typeof search.convite === "string" && tokenPattern.test(search.convite)
      ? search.convite
      : undefined;
  return { view, month, member, query, goal, tag, kind, access, convite };
}
