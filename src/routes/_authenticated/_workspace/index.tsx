import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyViewHref } from "@/features/budget";
import { OverviewScreen } from "@/features/budget/components/screens/overview-screen";

export const Route = createFileRoute("/_authenticated/_workspace/")({
  beforeLoad: ({ location }) => {
    const href = legacyViewHref(location.searchStr);

    if (href) throw redirect({ href, replace: true });
  },
  component: OverviewScreen,
});
