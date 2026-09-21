import { describe, expect, test } from "vitest";
import { parseDeleteTransaction } from "@/features/budget/actions/delete-transaction";

describe("parseDeleteTransaction", () => {
  test("requires id and revision", () => {
    expect(
      parseDeleteTransaction({ id: "transaction-1", revision: 1 }),
    ).toEqual({ id: "transaction-1", revision: 1 });
    expect(
      parseDeleteTransaction({
        id: "transaction-1",
        revision: 1,
        following: [{ id: "next", revision: 2 }],
      }),
    ).toEqual({
      id: "transaction-1",
      revision: 1,
      following: [{ id: "next", revision: 2 }],
    });
    expect(() => parseDeleteTransaction({ id: "transaction-1" })).toThrow(
      "Versão inválida. Atualize a página.",
    );
  });
});
