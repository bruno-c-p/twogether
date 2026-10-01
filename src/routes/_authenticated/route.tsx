import { createFileRoute, Outlet } from "@tanstack/react-router";
import { guardWorkspace } from "@/features/auth/gate";
import { workspaceQueryKey } from "@/features/budget/workspace";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location, context }) =>
    guardWorkspace(
      location.searchStr,
      typeof window !== "undefined" &&
        context.queryClient.getQueryData(workspaceQueryKey) != null,
    ),
  component: Outlet,
});
