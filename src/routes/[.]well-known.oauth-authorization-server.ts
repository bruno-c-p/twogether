import { createFileRoute } from "@tanstack/react-router";
import {
  authorizationServerMetadata,
  clerkPublishableKey,
  corsPreflight,
} from "@/features/mcp/endpoint.server";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")(
  {
    server: {
      handlers: {
        GET: () => authorizationServerMetadata(clerkPublishableKey()),
        OPTIONS: () => corsPreflight(),
      },
    },
  },
);
