import { describe, expect, test } from "vitest";
import { parseRestoreTransaction } from "@/features/budget/actions/restore-transaction";

describe("parseRestoreTransaction", () => {
  test("requires id and revision", () => {
    expect(
      parseRestoreTransaction({ id: "transaction-1", revision: 2 }),
    ).toEqual({ id: "transaction-1", revision: 2 });
    expect(() => parseRestoreTransaction({ revision: 2 })).toThrow(
      "Informe um identificador válido.",
    );
    expect(() => parseRestoreTransaction({ id: "transaction-1" })).toThrow(
      "Versão inválida. Atualize a página.",
    );
    expect(() => parseRestoreTransaction({ id: "   ", revision: 2 })).toThrow(
      "Informe um identificador válido.",
    );
    expect(() =>
      parseRestoreTransaction({ id: "transaction-1", revision: -1 }),
    ).toThrow("Versão inválida. Atualize a página.");
  });
});
