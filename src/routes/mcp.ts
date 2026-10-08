import { createFileRoute } from "@tanstack/react-router";
import {
  handleMcpPost,
  methodNotAllowed,
} from "@/features/mcp/endpoint.server";

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handleMcpPost(request),
      GET: () => methodNotAllowed(),
      DELETE: () => methodNotAllowed(),
    },
  },
});
