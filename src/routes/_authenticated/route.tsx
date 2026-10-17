import { createFileRoute, Outlet } from "@tanstack/react-router";
import { guardWorkspace } from "@/features/auth";
import { hasCachedWorkspace } from "@/features/budget";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location, context }) =>
    guardWorkspace(
      location.searchStr,
      typeof window !== "undefined" && hasCachedWorkspace(context.queryClient),
    ),
  component: Outlet,
});
