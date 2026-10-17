import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentMonth, now, today } from "@/lib/clock";

describe("today and currentMonth", () => {
  it("use the given time zone instead of the runtime one", () => {
    const instant = new Date("2026-10-01T01:00:00.000Z");

    expect(currentMonth("UTC", instant)).toBe("2026-10");
    expect(currentMonth("America/Sao_Paulo", instant)).toBe("2026-09");
    expect(today("Asia/Tokyo", new Date("2026-09-30T16:00:00.000Z"))).toBe(
      "2026-10-01",
    );
  });
});

describe("a server running in UTC at 23:30 in São Paulo", () => {
  const processZone = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "UTC";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T23:30:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = processZone;
  });

  it("still reads São Paulo's day and month", () => {
    expect(now().getDate()).toBe(1);
    expect(today("America/Sao_Paulo")).toBe("2026-10-31");
    expect(currentMonth("America/Sao_Paulo")).toBe("2026-10");
  });
});
