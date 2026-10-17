import { describe, expect, test } from "vitest";
import { ownerOf } from "@/features/budget/domain/recurrence";
import { transactionStatus } from "@/features/budget/domain/status";
import type { Transaction } from "@/features/budget/domain/types";
import { cents } from "@/test/cents";

// Rows saved before memberId existed: these answers are pinned so a change
// to any of them is deliberate (see AGENTS.md).
const legacySplit: Transaction = {
  id: "legacy",
  description: "Aluguel",
  amount: cents(200000),
  kind: "expense",
  date: "2026-09-05",
  goal: "fixed",
  createdBy: "ana",
  split: {},
};

describe("a legacy row without memberId", () => {
  test("ownerOf gives it to its creator", () => {
    expect(ownerOf(legacySplit, "bia")).toBe("ana");
    expect(ownerOf(legacySplit, "ana")).toBe("ana");
  });

  test("transactionStatus reads its split as owed by either partner", () => {
    expect(transactionStatus(legacySplit, "ana").userOwes).toBe(true);
    expect(transactionStatus(legacySplit, "bia").userOwes).toBe(true);
  });
});
