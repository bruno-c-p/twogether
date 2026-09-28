import { describe, expect, it } from "vitest";
import { isValidTimeZone, monthIn } from "@/lib/time-zone";

const instant = new Date("2026-10-01T01:00:00.000Z");

describe("monthIn", () => {
  it("uses the given time zone instead of the runtime one", () => {
    expect(monthIn("UTC", instant)).toBe("2026-10");
    expect(monthIn("America/Sao_Paulo", instant)).toBe("2026-09");
  });

  it("keeps the month of a fixed instant", () => {
    expect(
      monthIn("America/Sao_Paulo", new Date("2026-09-17T15:00:00.000Z")),
    ).toBe("2026-09");
    expect(monthIn("Asia/Tokyo", new Date("2026-09-30T16:00:00.000Z"))).toBe(
      "2026-10",
    );
  });
});

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
