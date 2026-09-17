import { describe, expect, it } from "vitest";
import {
  accessRedirectSearch,
  gateRedirectSearch,
  openGoalTransactions,
  openView,
  validateAccessSearch,
  validateBudgetSearch,
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
  access: "a".repeat(64),
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

describe("accessRedirectSearch", () => {
  const convite = "c".repeat(64);

  it("keeps the invite and never puts the access token in the URL", () => {
    expect(accessRedirectSearch(convite)).toEqual({ convite });
    expect(accessRedirectSearch(convite)).not.toHaveProperty("access");
  });

  it("returns an empty search when there is no invite", () => {
    expect(accessRedirectSearch()).toEqual({});
    expect(accessRedirectSearch()).not.toHaveProperty("access");
  });
});

describe("gateRedirectSearch", () => {
  const access = "a".repeat(64);
  const convite = "b".repeat(64);

  it("forwards access and convite to /entrar", () => {
    expect(gateRedirectSearch({ access, convite })).toEqual({
      access,
      convite,
    });
  });

  it("omits missing tokens", () => {
    expect(gateRedirectSearch({ access })).toEqual({ access });
    expect(gateRedirectSearch({ convite })).toEqual({ convite });
    expect(gateRedirectSearch({})).toEqual({});
  });
});

describe("validateAccessSearch", () => {
  const access = "a".repeat(64);
  const convite = "b".repeat(64);

  it("keeps 64-hex tokens and drops junk and workspace filters", () => {
    expect(validateAccessSearch({ access, convite, view: "accounts" })).toEqual(
      {
        access,
        convite,
      },
    );
    expect(validateAccessSearch({ access: "nope", convite: "invite" })).toEqual(
      {
        access: undefined,
        convite: undefined,
      },
    );
  });
});

describe("validateBudgetSearch", () => {
  const access = "a".repeat(64);
  const convite = "b".repeat(64);

  it("keeps a 64-hex access token for the loader and drops junk", () => {
    expect(validateBudgetSearch({ access })).toMatchObject({ access });
    expect(
      validateBudgetSearch({ access: "not-a-token" }).access,
    ).toBeUndefined();
    expect(
      validateBudgetSearch({ access: access.slice(0, 63) }).access,
    ).toBeUndefined();
  });

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
      access: undefined,
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
