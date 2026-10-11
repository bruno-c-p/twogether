import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  authorizationServerMetadataHandler,
  bearerToken,
  clerkPublishableKey,
  handleMcpPost,
  mcpPreflight,
  methodNotAllowed,
  protectedResourceMetadata,
  serveMcp,
  unauthorized,
} from "@/features/mcp/endpoint.server";
import {
  couple,
  setupMemoryStore,
  signup,
} from "@/features/budget/services/store-test-harness";

const ctx = setupMemoryStore();

const ORIGIN = "https://twogether.example";

// "fake-clerk.example.com$", the placeholder key the fitness check also uses.
const PUBLISHABLE_KEY = "pk_test_ZmFrZS1jbGVyay5leGFtcGxlLmNvbSQ=";

type Authenticate = NonNullable<Parameters<typeof handleMcpPost>[1]>;

type RpcArguments = Record<string, string | number>;

function rpc(
  body: Record<
    string,
    | string
    | number
    | Record<string, string | Record<string, string> | RpcArguments>
  >,
  headers: Record<string, string> = {},
) {
  return new Request(`${ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
  });
}

const signedIn =
  (userId: string): Authenticate =>
  async () => ({
    id: "oat_test",
    subject: userId,
    scopes: ["profile", "email"],
    getToken: async () => "oauth-access",
    has: () => false,
    debug: () => ({}),
    tokenType: "oauth_token",
    isAuthenticated: true,
    userId,
    clientId: "client_test",
  });

const signedOut: Authenticate = async () => ({
  id: null,
  subject: null,
  scopes: null,
  getToken: async () => null,
  has: () => false,
  debug: () => ({}),
  tokenType: "oauth_token",
  isAuthenticated: false,
  userId: null,
  clientId: null,
});

const toolText = z.object({
  result: z.object({ content: z.array(z.object({ text: z.string() })) }),
});

describe("MCP endpoint", () => {
  test("reads only bearer tokens", () => {
    const request = (value: string) =>
      new Request(`${ORIGIN}/mcp`, { headers: { Authorization: value } });

    expect(bearerToken(request("Bearer abc"))).toBe("abc");
    expect(bearerToken(request("bearer abc"))).toBe("abc");
    expect(bearerToken(request("Bearer  abc "))).toBe("abc");
    expect(bearerToken(request("Bearer"))).toBeUndefined();
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

  test("lets browser clients send a token and read the OAuth challenge", async () => {
    const preflight = mcpPreflight();

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST",
    );
    expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );

    const challenge = await handleMcpPost(
      rpc({ method: "tools/list" }),
      signedOut,
      () => ctx.store,
    );

    expect(challenge.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(challenge.headers.get("Access-Control-Expose-Headers")).toContain(
      "WWW-Authenticate",
    );
  });

  test("caches Clerk's authorization server metadata", async () => {
    const metadata = {
      issuer: "https://fake-clerk.example.com",
      authorization_endpoint: "https://fake-clerk.example.com/oauth/authorize",
      token_endpoint: "https://fake-clerk.example.com/oauth/token",
    };

    const urls: string[] = [];
    let clock = 0;

    const fetcher = Object.assign(
      async (input: string | URL | Request) => {
        urls.push(input instanceof Request ? input.url : input.toString());

        return Response.json(metadata);
      },
      { preconnect: fetch.preconnect },
    );

    const serve = authorizationServerMetadataHandler(fetcher, () => clock);

    const first = await serve(PUBLISHABLE_KEY);
    await serve(PUBLISHABLE_KEY);

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(metadata);
    expect(first.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(urls).toEqual([
      "https://fake-clerk.example.com/.well-known/oauth-authorization-server",
    ]);

    clock = 2 * 60 * 60 * 1000;
    await serve(PUBLISHABLE_KEY);

    expect(urls).toHaveLength(2);
  });

  test("answers 503 when Clerk's metadata is unavailable", async () => {
    const failing = (response: () => Response) =>
      authorizationServerMetadataHandler(
        Object.assign(async () => response(), { preconnect: fetch.preconnect }),
      );

    const down = await failing(() =>
      Response.json({ error: "nope" }, { status: 502 }),
    )(PUBLISHABLE_KEY);

    expect(down.status).toBe(503);
    expect(down.headers.get("Retry-After")).toBe("60");

    const html = await failing(() => new Response("<html>"))(PUBLISHABLE_KEY);

    expect(html.status).toBe(503);
  });

  test("reads the Clerk key from the server or the client environment", () => {
    expect(clerkPublishableKey(PUBLISHABLE_KEY, undefined)).toBe(
      PUBLISHABLE_KEY,
    );
    expect(clerkPublishableKey("", PUBLISHABLE_KEY)).toBe(PUBLISHABLE_KEY);
    expect(() => clerkPublishableKey(undefined, undefined)).toThrow(
      "VITE_CLERK_PUBLISHABLE_KEY",
    );
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

  test("rejects requests without a valid OAuth token", async () => {
    const { store } = ctx;

    const request = () =>
      rpc({ method: "tools/list" }, { Authorization: "Bearer session-jwt" });

    let asked = false;

    const missing = await handleMcpPost(
      rpc({ method: "tools/list" }),
      async () => {
        asked = true;

        return signedOut();
      },
      () => store,
    );

    expect(missing.status).toBe(401);
    expect(asked).toBe(false);

    const invalid = await handleMcpPost(request(), signedOut, () => store);

    expect(invalid.status).toBe(401);
    expect(invalid.headers.get("WWW-Authenticate")).toContain(
      "resource_metadata=",
    );
  });

  test("serves each token's own household", async () => {
    const { store } = ctx;
    const { a, b } = await couple(store);
    const cris = await signup(store, "Cris");
    await store.createHousehold(cris.user);

    async function call(userId: string, name: string, args: RpcArguments) {
      const response = await handleMcpPost(
        rpc(
          { method: "tools/call", params: { name, arguments: args } },
          { Authorization: "Bearer oauth-access" },
        ),
        signedIn(userId),
        () => store,
      );

      expect(response.status).toBe(200);

      return toolText.parse(await response.json()).result.content[0].text;
    }

    await call(a.user.id, "save_transaction", {
      description: "Mercado",
      amount: 1000,
      date: "2026-09-14",
      goal: "fixed",
    });

    const month = { month: "2026-09" };

    expect(await call(b.user.id, "list_transactions", month)).toContain(
      "Mercado",
    );
    expect(await call(cris.user.id, "list_transactions", month)).toContain(
      '"count": 0',
    );
  });
});
