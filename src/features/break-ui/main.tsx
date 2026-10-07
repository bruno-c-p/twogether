import { createRoot } from "react-dom/client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { AccountSettingsView } from "@/features/auth/components/account-settings";
import { NameForm } from "@/features/auth/components/name-form";
import { InviteForm } from "@/features/auth/components/invite-form";
import { Sheet, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
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
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      trigger={<SheetTrigger>Conta</SheetTrigger>}
    >
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
        busy={false}
        error=""
        name={{
          notice,
          save: async (name) => {
            await setName({ data: { name } });
            await queryClient.invalidateQueries({
              queryKey: workspaceQueryKey,
            });
            setNotice("Nome atualizado.");
          },
        }}
        invite={{
          link,
          copied: false,
          status: "",
          makeInvite: () => {
            setLink(
              `${location.origin}/convite/${"0123456789abcdef".repeat(4)}`,
            );

            return Promise.resolve();
          },
          copyInvite: () => navigator.clipboard.writeText(link),
          cancelInvites: () => {
            setLink("");

            return Promise.resolve();
          },
        }}
        onLeave={() => setOpen(false)}
        onManage={() => setNotice("Clerk fora deste ambiente isolado.")}
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
  const [status, setStatus] = useState("");

  return (
    <main className="max-w-[440px] mx-auto p-6">
      <h1>Onboarding</h1>
      <NameForm
        busy={false}
        onSubmit={(name) => {
          setStatus(name);

          return Promise.resolve();
        }}
      />
      <InviteForm
        busy={false}
        onJoin={() => {
          setStatus("Convite validado localmente.");

          return Promise.resolve();
        }}
      />
      <p role="status">{status}</p>
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
    <>
      <Outlet />
      <DataToggle />
      <Toaster />
    </>
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
