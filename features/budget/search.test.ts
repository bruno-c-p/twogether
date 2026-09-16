import { describe, expect, it } from "vitest";
import { withView } from "@/features/budget/search";

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
