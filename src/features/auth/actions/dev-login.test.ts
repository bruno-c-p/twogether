import { describe, expect, test } from "vitest";
import { parseDevLogin } from "@/features/auth/actions/dev-login";

describe("parseDevLogin", () => {
  test("requires an email", () => {
    expect(parseDevLogin({ email: "ana@example.test" })).toEqual({
      email: "ana@example.test",
    });
    expect(() => parseDevLogin({})).toThrow("Informe um e-mail válido.");
  });
});
