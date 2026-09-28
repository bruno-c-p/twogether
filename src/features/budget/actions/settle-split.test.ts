import { describe, expect, test } from "vitest";
import { parseSettleSplit } from "@/features/budget/actions/settle-split";
import { parseUnsettleSplit } from "@/features/budget/actions/unsettle-split";

const input = {
  id: "rent",
  revision: 1,
  date: "2026-09-20",
  payerAccountId: "account-1",
  partnerAccountId: "account-2",
};

describe("split settlement input", () => {
  test("validates settle and unsettle payloads", () => {
    expect(parseSettleSplit(input)).toEqual(input);
    expect(() => parseSettleSplit({ ...input, date: "2026-02-30" })).toThrow(
      "Escolha uma data válida.",
    );
    expect(() => parseSettleSplit({ ...input, payerAccountId: "" })).toThrow();
    expect(parseUnsettleSplit({ id: "rent", revision: 2 })).toEqual({
      id: "rent",
      revision: 2,
    });
    expect(() => parseUnsettleSplit({ id: "rent", revision: -1 })).toThrow(
      "Versão inválida. Atualize a página.",
    );
  });
});
