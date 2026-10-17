import { describe, expect, it } from "vitest";
import { isValidTimeZone } from "@/lib/time-zone";

describe("isValidTimeZone", () => {
  it("accepts IANA time zone names", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("America/Sao_Paulo")).toBe(true);
  });

  it("rejects junk values", () => {
    expect(isValidTimeZone("Nope/Nowhere")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone(1)).toBe(false);
  });
});
