import { describe, expect, test } from "vitest";
import { authMutations } from "@/features/auth/actions/mutations";

const parseSetName = authMutations.setName.parse;

describe("parseSetName", () => {
  test("requires a name", () => {
    expect(parseSetName({ name: "Ana" })).toEqual({ name: "Ana" });
    // @ts-expect-error: the parser must reject untrusted request bodies
    expect(() => parseSetName({})).toThrow(
      "Conte como você quer aparecer no orçamento.",
    );
  });
});
