import { describe, expect, it } from "vitest";
import {
  missingWorkspaceMonth,
  openGoalTransactions,
  openView,
  validateBudgetFilters,
  withDefaultMonth,
  withView,
  type BudgetFilters,
} from "@/features/budget/search";

const filtered: BudgetFilters = {
  view: "overview",
  month: "2026-09",
  member: "alice",
  query: "aluguel",
  goal: "fixed",
  tag: "casa",
  kind: "expense",
};

describe("withView", () => {
  it("changes only the tab and keeps month, person, and filters", () => {
    expect(withView(filtered, "transactions")).toEqual({
      ...filtered,
      view: "transactions",
    });
  });
});

describe("openView", () => {
  it("switches tab and drops query, goal, tag, and kind", () => {
    expect(openView(filtered, "accounts")).toEqual({
      ...filtered,
      view: "accounts",
      query: undefined,
      goal: undefined,
      tag: undefined,
      kind: undefined,
    });
  });
});

describe("openGoalTransactions", () => {
  it("opens transações for that goal and drops the other list filters", () => {
    expect(openGoalTransactions(filtered, "freedom")).toEqual({
      ...filtered,
      view: "transactions",
      goal: "freedom",
      query: undefined,
      tag: undefined,
      kind: undefined,
    });
  });
});

describe("validateBudgetFilters", () => {
  it("drops junk month, view, and kind", () => {
    expect(
      validateBudgetFilters({
        month: "2026-13",
        view: "settings",
        kind: "transfer",
      }),
    ).toEqual({
      view: undefined,
      month: undefined,
      member: undefined,
      query: undefined,
      goal: undefined,
      tag: undefined,
      kind: undefined,
    });
    expect(
      validateBudgetFilters({
        month: "2026-09",
        view: "accounts",
        kind: "income",
      }),
    ).toMatchObject({
      month: "2026-09",
      view: "accounts",
      kind: "income",
    });
  });
});

describe("withDefaultMonth", () => {
  it("fills the current month when the workspace URL has none", () => {
    expect(missingWorkspaceMonth({})).toBe(true);
    expect(withDefaultMonth({}, "2026-09")).toEqual({ month: "2026-09" });
    expect(
      withDefaultMonth({ view: "transactions", member: "ana" }, "2026-09"),
    ).toEqual({
      view: "transactions",
      member: "ana",
      month: "2026-09",
    });
  });

  it("keeps a month that is already in the URL", () => {
    expect(missingWorkspaceMonth({ month: "2026-09" })).toBe(false);
  });
});
