import { createFileRoute } from "@tanstack/react-router";
import {
  corsPreflight,
  protectedResourceMetadata,
} from "@/features/mcp/endpoint.server";

export const Route = createFileRoute(
  "/.well-known/oauth-protected-resource/mcp",
)({
  server: {
    handlers: {
      GET: ({ request }) =>
        protectedResourceMetadata(
          request,
          import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
        ),
      OPTIONS: () => corsPreflight(),
    },
  },
});
