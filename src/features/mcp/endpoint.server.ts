import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { auth } from "@clerk/tanstack-react-start/server";
import {
  corsHeaders,
  generateClerkProtectedResourceMetadata,
  verifyClerkToken,
} from "@clerk/mcp-tools/server";
import { z } from "zod";
import { getStore, type Store } from "@/server/store.server";
import { createBudgetMcpServer } from "@/features/mcp/tools.server";
import { now as clockNow } from "@/lib/clock";
import { parseClientEnv } from "@/lib/env";
import { reportError } from "@/lib/errors";

type OAuthSession = Parameters<typeof verifyClerkToken>[0];

const MCP_PATH = "/mcp";

const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

const METADATA_TTL_MS = 60 * 60 * 1000;

const METADATA_TIMEOUT_MS = 5000;

// Browser-based clients send Authorization, which "*" does not cover, and
// must read WWW-Authenticate to find the OAuth metadata.
const mcpCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

const authorizationServerSchema = z.looseObject({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
});

export function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") ?? "";

  return /^\s*bearer\s+(\S+)\s*$/i.exec(header)?.[1];
}

function withMcpCors(response: Response) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(mcpCorsHeaders))
    headers.set(name, value);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function mcpPreflight() {
  return new Response(null, { status: 204, headers: mcpCorsHeaders });
}

// Server deployments may set only CLERK_PUBLISHABLE_KEY; validating through
// parseClientEnv reports a missing key the same way the app does.
export function clerkPublishableKey(
  serverKey = process.env.CLERK_PUBLISHABLE_KEY,
  clientKey: string | undefined = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
) {
  return parseClientEnv({ VITE_CLERK_PUBLISHABLE_KEY: serverKey || clientKey })
    .VITE_CLERK_PUBLISHABLE_KEY;
}

// Points the client at the metadata that names Clerk as the authorization
// server, which starts the OAuth sign-in (RFC 9728).
export function unauthorized(request: Request) {
  const metadata = new URL(RESOURCE_METADATA_PATH, request.url).href;

  return Response.json(
    { error: "invalid_token", error_description: "Sign in to twogether." },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`,
      },
    },
  );
}

export function methodNotAllowed() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    { status: 405, headers: { Allow: "POST", ...mcpCorsHeaders } },
  );
}

// Stateless: every POST gets a fresh server bound to the signed-in person, so
// it runs on serverless functions without sticky sessions.
export async function serveMcp(
  request: Request,
  store: Store,
  userId: string,
  authInfo?: AuthInfo,
) {
  const server = createBudgetMcpServer(store, userId);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  return transport.handleRequest(request, { authInfo });
}

// Clerk issues and verifies the OAuth access token; its user is the same
// account the person signs in with on the web.
export async function handleMcpPost(
  request: Request,
  authenticate: () => Promise<OAuthSession> = () =>
    auth({ acceptsToken: "oauth_token" }),
  loadStore: () => Store = getStore,
) {
  const token = bearerToken(request);

  if (!token) return withMcpCors(unauthorized(request));

  const session = await authenticate();

  if (!session.isAuthenticated) return withMcpCors(unauthorized(request));

  // Clerk's OAuth tokens carry no audience to check: with dynamic client
  // registration every agent is its own OAuth app, so the person's consent
  // on Clerk's screen is what grants access.
  const authInfo = verifyClerkToken(session, token);

  if (!authInfo) return withMcpCors(unauthorized(request));

  return withMcpCors(
    await serveMcp(request, loadStore(), session.userId, authInfo),
  );
}

export function protectedResourceMetadata(
  request: Request,
  publishableKey: string,
) {
  return Response.json(
    generateClerkProtectedResourceMetadata({
      publishableKey,
      resourceUrl: new URL(MCP_PATH, request.url).href,
    }),
    { headers: corsHeaders },
  );
}

async function fetchAuthorizationServer(
  publishableKey: string,
  fetcher: typeof fetch,
) {
  const [issuer] = generateClerkProtectedResourceMetadata({
    publishableKey,
    resourceUrl: "",
  }).authorization_servers;

  const response = await fetcher(
    `${issuer}/.well-known/oauth-authorization-server`,
    { signal: AbortSignal.timeout(METADATA_TIMEOUT_MS) },
  );

  if (!response.ok)
    throw new Error(`Clerk OAuth metadata returned ${response.status}`);

  return authorizationServerSchema.parse(await response.json());
}

// Older MCP clients look for the authorization server on the resource's own
// origin instead of following the protected resource metadata. Clerk's
// metadata rarely changes, so successful answers are cached.
export function authorizationServerMetadataHandler(
  fetcher: typeof fetch = fetch,
  now: () => number = () => clockNow().getTime(),
) {
  let cached:
    | {
        publishableKey: string;
        expires: number;
        metadata: z.infer<typeof authorizationServerSchema>;
      }
    | undefined;

  return async (publishableKey: string) => {
    try {
      if (
        cached?.publishableKey !== publishableKey ||
        cached.expires <= now()
      ) {
        cached = {
          publishableKey,
          expires: now() + METADATA_TTL_MS,
          metadata: await fetchAuthorizationServer(publishableKey, fetcher),
        };
      }

      return Response.json(cached.metadata, { headers: corsHeaders });
    } catch (cause) {
      reportError(cause, { context: "Clerk OAuth metadata unavailable" });

      return Response.json(
        {
          error: "temporarily_unavailable",
          error_description: "Try again shortly.",
        },
        { status: 503, headers: { ...corsHeaders, "Retry-After": "60" } },
      );
    }
  };
}

export const authorizationServerMetadata = authorizationServerMetadataHandler();

export function corsPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
