import { createRoot } from "react-dom/client";
import { useRef } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import {
  createRootRoute,
  createRoute,
  createRouter,
  getRouteApi,
  Outlet,
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";
import { Icon, UserAvatar } from "@/components/glaze/icon";
import { Button } from "@/components/glaze/ui/button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/glaze/ui/segmented-control";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/glaze/ui/sheet";
import { toast } from "@/components/glaze/ui/toast";
import { BudgetWorkspace } from "@/features/budget/components/budget-app/budget-app";
import type { AccountPlacement } from "@/features/budget/components/workspace-shell";
import { MobileTabContent } from "@/components/app/mobile-tab-content";
import { mobileTabClass } from "@/components/app/mobile-tab";
import { OverviewScreen } from "@/features/budget/components/screens/overview-screen";
import { TransactionsScreen } from "@/features/budget/components/screens/transactions-screen";
import { BudgetScreen } from "@/features/budget/components/screens/budget-screen";
import {
  AccountSettingsView,
  useInviteLink,
  useNameForm,
} from "@/features/auth/components/account-settings";
import { useActionRun } from "@/features/auth/hooks/use-action-run";
import { NameForm } from "@/features/auth/components/name-form";
import { InviteForm } from "@/features/auth/components/invite-form";
import { AppToaster } from "@/components/app/toaster";
import { ThemeToggle } from "@/features/theme/components/theme-toggle/theme-toggle";
import { useBudget } from "@/features/budget/hooks/use-budget";
import {
  validateTransactionFilters,
  validateWorkspaceSearch,
  type WorkspaceSearch,
} from "@/features/budget/search";
import {
  datasets,
  fixtureMonth,
  readDataset,
  type Dataset,
} from "@/features/break-ui/fixtures";
import { authActions, resetFixture } from "@/features/break-ui/actions";
import { workspaceQueryKey } from "@/features/budget/workspace";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@/styles.css";
import "@/components/glaze/styles.css";
import { GlazePortalProvider } from "@/lib/glaze/portal";
import { overlaySurface } from "@/lib/glaze/overlay";
import { cn } from "@/lib/glaze/utils";

if (!import.meta.env.DEV) throw new Error("Break UI is development-only.");

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const workspaceApi = getRouteApi("/_authenticated/_workspace");

function FixtureAccount({ placement }: { placement: AccountPlacement }) {
  const { month } = workspaceApi.useSearch();
  const budget = useBudget(month ?? fixtureMonth);
  const sheet = useRef<{ close: () => void; unmount: () => void }>(null);
  const { run, busy, error } = useActionRun();

  const name = useNameForm({
    run,
    saveName: async (value) => {
      await authActions.setName({ data: { name: value } });
    },
    onSaved: () =>
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey }),
  });

  const invite = useInviteLink({
    run,
    create: () =>
      Promise.resolve({ inviteToken: "0123456789abcdef".repeat(4) }),
    revoke: () => Promise.resolve(),
    onCreated: () => undefined,
  });

  return (
    <Sheet actionsRef={sheet}>
      {placement === "header" ? (
        <SheetTrigger render={<Button variant="secondary" size="sm" />}>
          Conta
        </SheetTrigger>
      ) : (
        <SheetTrigger className={mobileTabClass}>
          <MobileTabContent active={false} label="Conta">
            <Icon icon={UserAvatar} size={20} />
          </MobileTabContent>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sua conta</SheetTitle>
          <SheetDescription>Dados isolados de teste</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ThemeToggle />
          <AccountSettingsView
            user={budget.user}
            members={budget.household.members}
            email={
              readDataset() === "worst"
                ? "bartholomew.fitzgerald@northwind-industries-holdings.example.com"
                : "ana@example.com"
            }
            busy={busy}
            error={error}
            name={name}
            invite={invite}
            onLeave={() => sheet.current?.close()}
            onManage={() => toast("Clerk fora deste ambiente isolado.")}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function FixtureLayout() {
  const { month } = workspaceApi.useSearch();
  const budget = useBudget(month ?? fixtureMonth);

  return (
    <BudgetWorkspace
      budget={budget}
      month={month ?? fixtureMonth}
      account={(placement) => <FixtureAccount placement={placement} />}
    />
  );
}

function GateForms() {
  // Each form reports what it would have sent, without a server.
  const step = useMutation({
    mutationFn: (status: string) => Promise.resolve(status),
  });

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="type-title">Onboarding</h1>
      <NameForm
        busy={false}
        onSubmit={async (name) => {
          await step.mutateAsync(name);
        }}
      />
      <InviteForm
        busy={false}
        onJoin={async () => {
          await step.mutateAsync("Convite validado localmente.");
        }}
      />
      <p role="status">{step.data ?? ""}</p>
      <ThemeToggle />
    </main>
  );
}

function DataToggle() {
  const labels = ["Demo data", "Worst case", "Empty", "One", "1,000 rows"];

  return (
    <div
      className={cn(
        overlaySurface,
        "fixed bottom-[calc(var(--mobile-nav-height)+var(--space-3))] left-1/2 z-(--z-overlay) flex max-w-[calc(100vw-var(--space-4))] -translate-x-1/2 flex-wrap items-center justify-center gap-1 p-1",
      )}
    >
      <SegmentedControl
        size="sm"
        aria-label="Stress-test data"
        value={readDataset()}
        onValueChange={(dataset) => {
          const url = new URL(location.href);
          url.searchParams.set("data", dataset);
          location.assign(url);
        }}
      >
        {datasets.map((dataset, index) => (
          <SegmentedControlItem key={dataset} value={dataset}>
            {labels[index]}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <Button variant="ghost" size="sm" onClick={resetFixture}>
        Reset
      </Button>
    </div>
  );
}

function Root() {
  return (
    <GlazePortalProvider>
      <NuqsAdapter>
        <Outlet />
        <DataToggle />
        <AppToaster />
      </NuqsAdapter>
    </GlazePortalProvider>
  );
}

const root = createRootRoute({ component: Root });

const authenticated = createRoute({
  getParentRoute: () => root,
  id: "_authenticated",
  component: Outlet,
});

const workspace = createRoute({
  getParentRoute: () => authenticated,
  id: "_workspace",
  component: FixtureLayout,
  validateSearch: (search): WorkspaceSearch & { data?: Dataset } => ({
    ...validateWorkspaceSearch(search),
    data: datasets.find((dataset) => dataset === search.data) ?? "demo",
  }),
  search: {
    middlewares: [
      retainSearchParams<WorkspaceSearch & { data?: Dataset }>([
        "month",
        "member",
        "data",
      ]),
    ],
  },
});

const overview = createRoute({
  getParentRoute: () => workspace,
  path: "/",
  component: OverviewScreen,
});

const transactions = createRoute({
  getParentRoute: () => workspace,
  path: "/transacoes",
  component: TransactionsScreen,
  validateSearch: validateTransactionFilters,
});

const goals = createRoute({
  getParentRoute: () => workspace,
  path: "/orcamento",
  component: BudgetScreen,
});

const onboarding = createRoute({
  getParentRoute: () => root,
  path: "/entrar",
  component: GateForms,
});

const router = createRouter({
  routeTree: root.addChildren([
    authenticated.addChildren([
      workspace.addChildren([overview, transactions, goals]),
    ]),
    onboarding,
  ]),
  scrollRestoration: true,
});

const container = document.getElementById("root");

if (!container) throw new Error("Break UI root missing.");

const reactRoot = createRoot(container);

import.meta.hot?.dispose(() => reactRoot.unmount());

reactRoot.render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
