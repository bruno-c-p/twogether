import { z } from "zod";
import { WORKSPACE_PATHS } from "@/features/budget/constants";
import {
  goalIdSchema,
  monthSchema,
  viewSchema,
} from "@/features/budget/domain/schemas";

const drop = <Schema extends z.ZodType>(schema: Schema) =>
  schema.optional().catch(undefined);

const memberSchema = z.string({ error: "Pessoa inválida." }).min(1).max(64);

const querySchema = z
  .string({ error: "Busca inválida." })
  .refine((value) => value.trim().length > 0)
  .transform((value) => value.slice(0, 200));

const tagSchema = z.string({ error: "Tag inválida." }).min(1).max(100);

// The list also filters by split expenses, which are not a stored kind.
const kindFilterSchema = z.enum(["expense", "income", "split"], {
  error: "Tipo inválido.",
});

// Month and person apply to every workspace page.
const workspaceSearchSchema = z.object({
  month: drop(monthSchema),
  member: drop(memberSchema),
});

// Search, goal, tag and kind only narrow the transactions list.
const transactionFiltersSchema = z.object({
  query: drop(querySchema),
  goal: drop(goalIdSchema),
  tag: drop(tagSchema),
  kind: drop(kindFilterSchema),
});

export type KindFilter = z.infer<typeof kindFilterSchema>;

export type WorkspaceSearch = z.infer<typeof workspaceSearchSchema>;

export type TransactionFilterSearch = z.infer<typeof transactionFiltersSchema>;

interface RequestLocation {
  pathname: string;
  searchStr: string;
}

function hrefFor(pathname: string, params: URLSearchParams) {
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

// Same page and params with the month filled in, for a server redirect.
export function withDefaultMonthHref(location: RequestLocation, month: string) {
  const params = new URLSearchParams(location.searchStr);

  params.set("month", month);

  return hrefFor(location.pathname, params);
}

export function validateWorkspaceSearch<
  RawSearch extends Record<string, unknown>,
>(search: RawSearch): WorkspaceSearch {
  return workspaceSearchSchema.parse(search);
}

export function validateTransactionFilters<
  RawSearch extends Record<string, unknown>,
>(search: RawSearch): TransactionFilterSearch {
  return transactionFiltersSchema.parse(search);
}

// Views used to live in /?view=<view>; old bookmarks still carry it.
export function legacyViewHref(searchStr: string) {
  const params = new URLSearchParams(searchStr);
  const view = drop(viewSchema).parse(params.get("view"));

  if (!view) return undefined;

  params.delete("view");

  return hrefFor(WORKSPACE_PATHS[view], params);
}
