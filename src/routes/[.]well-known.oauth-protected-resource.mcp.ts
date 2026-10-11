import { createFileRoute } from "@tanstack/react-router";
import {
  clerkPublishableKey,
  corsPreflight,
  protectedResourceMetadata,
} from "@/features/mcp/endpoint.server";

export const Route = createFileRoute(
  "/.well-known/oauth-protected-resource/mcp",
)({
  server: {
    handlers: {
      GET: ({ request }) =>
        protectedResourceMetadata(request, clerkPublishableKey()),
      OPTIONS: () => corsPreflight(),
    },
  },
});
