import { describe, expect, test } from "vitest";
import { parseRestoreTransaction } from "@/features/budget/actions/restore-transaction";

describe("parseRestoreTransaction", () => {
  test("requires id and revision", () => {
    expect(
      parseRestoreTransaction({ id: "transaction-1", revision: 2 }),
    ).toEqual({ id: "transaction-1", revision: 2 });
  });
});
