import { createFileRoute } from "@tanstack/react-router";
import {
  authorizationServerMetadata,
  corsPreflight,
} from "@/features/mcp/endpoint.server";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")(
  {
    server: {
      handlers: {
        GET: () =>
          authorizationServerMetadata(
            import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
          ),
        OPTIONS: () => corsPreflight(),
      },
    },
  },
);
