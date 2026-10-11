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
import { PostHogProvider } from "posthog-js/react";
import { PostHog } from "posthog-js";
import { BudgetWorkspace } from "@/features/budget/components/budget-app/budget-app";
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
import {
  Sheet,
  SheetHeader,
  SheetTrigger,
  type SheetActions,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
import { toastManager } from "@/components/ui/toast-manager";
import { ThemeToggle } from "@/features/theme";
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
import {
  readSnapshot,
  resetFixture,
  setName,
} from "@/features/break-ui/actions";
import { workspaceQueryKey } from "@/features/budget/workspace";
import "@/styles.css";
import "virtual:uno.css";

if (!import.meta.env.DEV) throw new Error("Break UI is development-only.");

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

queryClient.setQueryData(workspaceQueryKey, readSnapshot());

const workspaceApi = getRouteApi("/_authenticated/_workspace");

function FixtureAccount() {
  const budget = useBudget();
  const sheet = useRef<SheetActions>(null);
  const { run, busy, error } = useActionRun();

  const name = useNameForm({
    run,
    saveName: async (value) => {
      await setName({ data: { name: value } });
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
    <Sheet actions={sheet} trigger={<SheetTrigger>Conta</SheetTrigger>}>
      <SheetHeader title="Sua conta" description="Dados isolados de teste" />
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
        onManage={() =>
          toastManager.add({ title: "Clerk fora deste ambiente isolado." })
        }
      />
    </Sheet>
  );
}

function FixtureLayout() {
  const budget = useBudget();
  const { month } = workspaceApi.useSearch();

  return (
    <BudgetWorkspace
      budget={budget}
      month={month ?? fixtureMonth}
      account={<FixtureAccount />}
    />
  );
}

function GateForms() {
  // Each form reports what it would have sent, without a server.
  const step = useMutation({
    mutationFn: (status: string) => Promise.resolve(status),
  });

  return (
    <main className="max-w-[440px] mx-auto p-6">
      <h1>Onboarding</h1>
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
  const selected = readDataset();
  const labels = ["Demo data", "Worst case", "Empty", "One", "1,000 rows"];

  return (
    <div
      role="group"
      aria-label="Stress-test data"
      className="fixed bottom-[92px] left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center gap-1 w-[min(440px,calc(100vw-16px))] rounded-md p-1 bg-surface-3 border border-solid border-border font-sans"
    >
      {datasets.map((dataset, index) => (
        <button
          key={dataset}
          type="button"
          aria-pressed={selected === dataset}
          className={`border-0 rounded-sm px-2 py-1 text-xs text-text ${selected === dataset ? "bg-surface" : "bg-transparent"}`}
          onClick={() => {
            const url = new URL(location.href);
            url.searchParams.set("data", dataset);
            location.assign(url);
          }}
        >
          {labels[index]}
        </button>
      ))}
      <button
        type="button"
        onClick={resetFixture}
        className="border-0 rounded-sm px-2 py-1 text-xs bg-transparent text-text"
      >
        Reset
      </button>
    </div>
  );
}

function Root() {
  return (
    <NuqsAdapter>
      <Outlet />
      <DataToggle />
      <Toaster />
    </NuqsAdapter>
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

// An uninitialized client keeps production analytics hooks inert in fixtures.
const analytics = new PostHog();

if (!container) throw new Error("Break UI root missing.");

const reactRoot = createRoot(container);

import.meta.hot?.dispose(() => reactRoot.unmount());

reactRoot.render(
  <QueryClientProvider client={queryClient}>
    <PostHogProvider client={analytics}>
      <RouterProvider router={router} />
    </PostHogProvider>
  </QueryClientProvider>,
);
