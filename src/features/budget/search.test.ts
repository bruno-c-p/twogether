import { describe, expect, it } from "vitest";
import {
  legacyViewHref,
  validateTransactionFilters,
  validateWorkspaceSearch,
  withDefaultMonthHref,
} from "@/features/budget/search";

describe("validateWorkspaceSearch", () => {
  it("keeps month and person and drops junk or page-only params", () => {
    expect(
      validateWorkspaceSearch({ month: "2026-13", member: "", kind: "income" }),
    ).toEqual({ month: undefined, member: undefined });
    expect(
      validateWorkspaceSearch({ month: "2026-09", member: "ana", tag: "casa" }),
    ).toEqual({ month: "2026-09", member: "ana" });
  });
});

describe("validateTransactionFilters", () => {
  it("drops junk kind and blank query", () => {
    expect(
      validateTransactionFilters({ kind: "transfer", query: "  " }),
    ).toEqual({
      query: undefined,
      goal: undefined,
      tag: undefined,
      kind: undefined,
    });
    expect(
      validateTransactionFilters({
        kind: "income",
        goal: "fixed",
        tag: "casa",
        query: "aluguel",
        month: "2026-09",
      }),
    ).toEqual({ kind: "income", goal: "fixed", tag: "casa", query: "aluguel" });
  });
});

describe("withDefaultMonthHref", () => {
  it("builds a redirect to the same page with the month added", () => {
    expect(
      withDefaultMonthHref(
        { pathname: "/transacoes", searchStr: "?tag=casa" },
        "2026-09",
      ),
    ).toBe("/transacoes?tag=casa&month=2026-09");
    expect(
      withDefaultMonthHref({ pathname: "/", searchStr: "" }, "2026-09"),
    ).toBe("/?month=2026-09");
  });
});

describe("legacyViewHref", () => {
  it("sends old /?view= links to the page's own path", () => {
    expect(legacyViewHref("?view=transactions&month=2026-09&tag=casa")).toBe(
      "/transacoes?month=2026-09&tag=casa",
    );
    expect(legacyViewHref("?view=overview")).toBe("/");
  });

  it("leaves links without a known view alone", () => {
    expect(legacyViewHref("?month=2026-09")).toBeUndefined();
    expect(legacyViewHref("?view=settings")).toBeUndefined();
  });
});
