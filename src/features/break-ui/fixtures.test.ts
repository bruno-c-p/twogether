import { describe, expect, test } from "vitest";
import { datasets, fixture } from "@/features/break-ui/fixtures";
import {
  goalPercentagesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import { nameSchema } from "@/lib/account-schemas";

describe("break-ui fixtures use accepted production data", () => {
  test.each(datasets)("%s stays within the real contract", (dataset) => {
    const snapshot = fixture(dataset);

    for (const member of snapshot.household.members) {
      expect(nameSchema.safeParse(member.name).success).toBe(true);
      expect(goalPercentagesSchema.safeParse(member.percentages).success).toBe(
        true,
      );
    }

    for (const transaction of snapshot.budget.transactions) {
      expect(transactionSchema.safeParse(transaction).success).toBe(true);
    }

    expect(
      new Set(snapshot.budget.transactions.map((item) => item.id)).size,
    ).toBe(snapshot.budget.transactions.length);
  });

  test("collection boundaries and monetary extremes are represented", () => {
    expect(fixture("empty").budget.transactions).toHaveLength(0);
    expect(fixture("one").budget.transactions).toHaveLength(1);
    expect(fixture("huge").budget.transactions).toHaveLength(1000);

    const amounts = fixture("worst").budget.transactions.map(
      (item) => item.amount,
    );

    expect(amounts).toContain(1);
    expect(amounts).toContain(99999999999);
  });
});
