import { describe, expect, it } from "vitest";
import {
  accessRedirectSearch,
  validateBudgetSearch,
  withView,
} from "@/features/budget/search";

describe("withView", () => {
  it("changes only the tab and keeps month, person, and filters", () => {
    expect(
      withView(
        {
          view: "overview",
          month: "2026-09",
          member: "alice",
          query: "aluguel",
          goal: "fixed",
          tag: "casa",
          kind: "expense",
        },
        "transactions",
      ),
    ).toEqual({
      view: "transactions",
      month: "2026-09",
      member: "alice",
      query: "aluguel",
      goal: "fixed",
      tag: "casa",
      kind: "expense",
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

describe("validateBudgetSearch", () => {
  const access = "a".repeat(64);
  const convite = "b".repeat(64);

  it("keeps a 64-hex access token for the loader and drops junk", () => {
    expect(validateBudgetSearch({ access })).toMatchObject({ access });
    expect(validateBudgetSearch({ access: "not-a-token" }).access).toBeUndefined();
    expect(validateBudgetSearch({ access: access.slice(0, 63) }).access).toBeUndefined();
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
