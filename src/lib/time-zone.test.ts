// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  rememberedTimeZone,
  rememberTimeZone,
  TIME_ZONE_COOKIE,
} from "@/lib/time-zone";

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

describe("rememberedTimeZone", () => {
  afterEach(() => {
    document.cookie = `${TIME_ZONE_COOKIE}=; path=/; max-age=0`;
  });

  it("reads back the zone rememberTimeZone stored", () => {
    document.cookie = "other=1; path=/";
    rememberTimeZone("America/Sao_Paulo");

    expect(rememberedTimeZone()).toBe("America/Sao_Paulo");
  });

  it("reads a missing or junk cookie as no zone", () => {
    expect(rememberedTimeZone()).toBeUndefined();

    document.cookie = `${TIME_ZONE_COOKIE}=Nope%2FNowhere; path=/`;

    expect(rememberedTimeZone()).toBeUndefined();
  });
});
