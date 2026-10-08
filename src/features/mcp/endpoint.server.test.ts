import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  bearerToken,
  methodNotAllowed,
  protectedResourceMetadata,
  serveMcp,
  unauthorized,
} from "@/features/mcp/endpoint.server";
import {
  couple,
  setupMemoryStore,
} from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

const ORIGIN = "https://twogether.example";

// "fake-clerk.example.com$", the placeholder key the fitness check also uses.
const PUBLISHABLE_KEY = "pk_test_ZmFrZS1jbGVyay5leGFtcGxlLmNvbSQ=";

function rpc(
  body: Record<
    string,
    string | number | Record<string, string | Record<string, string>>
  >,
) {
  return new Request(`${ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
  });
}

describe("MCP endpoint", () => {
  test("reads only bearer tokens", () => {
    const request = (value: string) =>
      new Request(`${ORIGIN}/mcp`, { headers: { Authorization: value } });

    expect(bearerToken(request("Bearer abc"))).toBe("abc");
    expect(bearerToken(request("bearer abc"))).toBe("abc");
    expect(bearerToken(request("Basic abc"))).toBeUndefined();
    expect(bearerToken(new Request(`${ORIGIN}/mcp`))).toBeUndefined();
  });

  test("points unauthenticated clients at the resource metadata", async () => {
    const response = unauthorized(new Request(`${ORIGIN}/mcp`));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp"`,
    );
  });

  test("names Clerk as the authorization server for /mcp", async () => {
    const response = protectedResourceMetadata(
      new Request(`${ORIGIN}/.well-known/oauth-protected-resource/mcp`),
      PUBLISHABLE_KEY,
    );

    const metadata = z
      .object({
        resource: z.string(),
        authorization_servers: z.array(z.string()),
      })
      .parse(await response.json());

    expect(metadata.resource).toBe(`${ORIGIN}/mcp`);
    expect(metadata.authorization_servers).toEqual([
      "https://fake-clerk.example.com",
    ]);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("rejects the stateless transport's unsupported methods", () => {
    expect(methodNotAllowed().status).toBe(405);
  });

  test("answers JSON-RPC over HTTP for the signed-in person", async () => {
    const { store } = ctx;
    const { a } = await couple(store);

    const initialized = await serveMcp(
      rpc({
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
      store,
      a.user.id,
    );

    expect(initialized.status).toBe(200);

    const info = z
      .object({
        result: z.object({ serverInfo: z.object({ name: z.string() }) }),
      })
      .parse(await initialized.json());

    expect(info.result.serverInfo.name).toBe("twogether");

    const called = await serveMcp(
      rpc({
        method: "tools/call",
        params: { name: "get_overview", arguments: { month: "2026-09" } },
      }),
      store,
      a.user.id,
    );

    const result = z
      .object({
        result: z.object({
          content: z.array(z.object({ text: z.string() })),
        }),
      })
      .parse(await called.json());

    expect(result.result.content[0].text).toContain('"view": "Nós"');
  });
});
