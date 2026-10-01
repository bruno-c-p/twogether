import { describe, expect, test } from "bun:test";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import { setupMemoryStore } from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

describe("clerk user provisioning", () => {
  test("creates a profile on first request and reuses it afterwards", async () => {
    const { store } = ctx;
    const first = await store.ensureUser("user_ana");
    expect(first).toMatchObject({
      id: "user_ana",
      name: "",
      household_id: null,
    });
    expect(JSON.parse(first.percentages)).toEqual(DEFAULT_PERCENTAGES);
    await store.setName(first, "Ana");
    const again = await store.ensureUser("user_ana");
    expect(again.id).toBe(first.id);
    expect(again.name).toBe("Ana");
  });

  test("keeps separate profiles per clerk user", async () => {
    const { store } = ctx;
    const ana = await store.ensureUser("user_ana");
    await store.ensureUser("user_bia");
    await store.setName(ana, "Ana");
    expect((await store.ensureUser("user_bia")).name).toBe("");
  });
});
