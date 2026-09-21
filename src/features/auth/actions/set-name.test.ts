import { describe, expect, test } from "vitest";
import { parseSetName } from "@/features/auth/actions/set-name";

describe("parseSetName", () => {
  test("requires a name", () => {
    expect(parseSetName({ name: "Ana" })).toEqual({ name: "Ana" });
    expect(() => parseSetName({})).toThrow(
      "Conte como você quer aparecer no orçamento.",
    );
  });
});
