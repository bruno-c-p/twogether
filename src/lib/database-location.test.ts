import { describe, expect, test } from "vitest";
import { databaseLocation } from "@/lib/database-location";

describe("databaseLocation", () => {
  test("remote Turso and HTTP URLs pass through untouched", () => {
    for (const url of [
      "libsql://app.turso.io",
      "https://db.example.com",
      "wss://db.example.com",
    ])
      expect(databaseLocation(url)).toEqual({
        url,
        local: false,
        localPath: undefined,
      });
  });

  test(":memory: becomes an in-memory libsql URL", () => {
    expect(databaseLocation(":memory:")).toEqual({
      url: "file::memory:",
      local: true,
      localPath: undefined,
    });
  });

  test("file: URLs stay as given and are not treated as paths", () => {
    expect(databaseLocation("file:/tmp/a.sqlite")).toEqual({
      url: "file:/tmp/a.sqlite",
      local: true,
      localPath: undefined,
    });
  });

  test("plain paths become file: URLs the store owns", () => {
    expect(databaseLocation("data/twogether.sqlite")).toEqual({
      url: "file:data/twogether.sqlite",
      local: true,
      localPath: "data/twogether.sqlite",
    });
  });
});
