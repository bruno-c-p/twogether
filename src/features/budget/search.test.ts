import { describe, expect, it } from "vitest";
import {
  gateRedirectSearch,
  missingWorkspaceMonth,
  openGoalTransactions,
  openView,
  validateBudgetSearch,
  validateInviteSearch,
  withDefaultMonth,
  withView,
  type BudgetSearch,
} from "@/features/budget/search";

const filtered: BudgetSearch = {
  view: "overview",
  month: "2026-09",
  member: "alice",
  query: "aluguel",
  goal: "fixed",
  tag: "casa",
  kind: "expense",
  convite: "b".repeat(64),
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

describe("gateRedirectSearch", () => {
  const convite = "b".repeat(64);

  it("forwards the invite to /entrar", () => {
    expect(gateRedirectSearch({ convite })).toEqual({ convite });
  });

  it("omits a missing invite", () => {
    expect(gateRedirectSearch({})).toEqual({});
  });
});

describe("validateInviteSearch", () => {
  const convite = "b".repeat(64);

  it("keeps a 64-hex invite and drops junk and workspace filters", () => {
    expect(validateInviteSearch({ convite, view: "accounts" })).toEqual({
      convite,
    });
    expect(validateInviteSearch({ convite: "invite" })).toEqual({
      convite: undefined,
    });
  });
});

describe("validateBudgetSearch", () => {
  const convite = "b".repeat(64);

  it("keeps a 64-hex invite token and drops junk", () => {
    expect(validateBudgetSearch({ convite })).toMatchObject({ convite });
    expect(validateBudgetSearch({ convite: "invite" }).convite).toBeUndefined();
  });

  it("drops junk month, view, and kind", () => {
    expect(
      validateBudgetSearch({
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
      convite: undefined,
    });
    expect(
      validateBudgetSearch({
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

  it("does not default month for invite URLs", () => {
    const convite = "b".repeat(64);
    expect(missingWorkspaceMonth({ convite })).toBe(false);
    expect(missingWorkspaceMonth({ month: "2026-09" })).toBe(false);
  });
});
