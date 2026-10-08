import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { auth } from "@clerk/tanstack-react-start/server";
import {
  corsHeaders,
  fetchClerkAuthorizationServerMetadata,
  generateClerkProtectedResourceMetadata,
  verifyClerkToken,
} from "@clerk/mcp-tools/server";
import {
  getBudgetStore,
  type BudgetStore,
} from "@/features/budget/budget.server";
import { createBudgetMcpServer } from "@/features/mcp/tools.server";

const MCP_PATH = "/mcp";

const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

export function bearerToken(request: Request) {
  const [scheme, token] = (request.headers.get("Authorization") ?? "").split(
    " ",
  );

  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
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
    { status: 405, headers: { Allow: "POST" } },
  );
}

// Stateless: every POST gets a fresh server bound to the signed-in person, so
// it runs on serverless functions without sticky sessions.
export async function serveMcp(
  request: Request,
  store: BudgetStore,
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
export async function handleMcpPost(request: Request) {
  const token = bearerToken(request);

  if (!token) return unauthorized(request);

  const session = await auth({ acceptsToken: "oauth_token" });
  const authInfo = verifyClerkToken(session, token);

  if (!authInfo || !session.isAuthenticated) return unauthorized(request);

  return serveMcp(request, getBudgetStore(), session.userId, authInfo);
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

// Older MCP clients look for the authorization server on the resource's own
// origin instead of following the protected resource metadata.
export async function authorizationServerMetadata(publishableKey: string) {
  return Response.json(
    await fetchClerkAuthorizationServerMetadata({ publishableKey }),
    { headers: corsHeaders },
  );
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
