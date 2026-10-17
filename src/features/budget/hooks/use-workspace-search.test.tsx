import { defaultRateLimit } from "nuqs";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { useWorkspaceSearch } from "@/features/budget/hooks/use-workspace-search";
import { workspaceQueryOptions } from "@/features/budget/workspace";
import { ana } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const snapshot: WorkspaceSnapshot = {
  user: { id: "ana", name: "Ana" },
  household: { id: "home", members: [ana] },
  budget: { transactions: [], percentages: { ...DEFAULT_PERCENTAGES } },
};

function Harness() {
  const search = useWorkspaceSearch();

  return (
    <>
      <button onClick={() => search.setMonth("2026-10")}>outubro</button>
      <p role="status">{search.monthPending ? "pending" : "idle"}</p>
      <p role="alert">{search.monthError}</p>
    </>
  );
}

const october = workspaceQueryOptions("2026-10").queryKey;

describe("useWorkspaceSearch", () => {
  // The test has no server, so loading a month not in memory fails.
  test("a month that fails to load keeps the current month in the URL", async () => {
    const { screen, user, router, queryClient } = await renderWithProviders(
      <Harness />,
      "/?month=2026-09",
    );

    await user.click(screen.getByRole("button", { name: "outubro" }));
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(october)?.status).toBe("error"),
    );
    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("idle"),
    );
    // nuqs writes the URL on a throttle; wait the window out so a write
    // queued by a wrong navigation would have landed.
    await new Promise((resolve) =>
      setTimeout(resolve, defaultRateLimit.timeMs + 10),
    );
    expect(router.state.location.search).toMatchObject({ month: "2026-09" });
    expect(screen.getByRole("alert").textContent).not.toBe("");

    // The next pick that lands clears the message.
    queryClient.setQueryData(october, snapshot);
    await user.click(screen.getByRole("button", { name: "outubro" }));
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  test("a month already in memory shows at once", async () => {
    const { screen, user, router, queryClient } = await renderWithProviders(
      <Harness />,
      "/?month=2026-09",
    );

    queryClient.setQueryData(october, snapshot);
    await user.click(screen.getByRole("button", { name: "outubro" }));
    expect(screen.getByRole("status").textContent).toBe("idle");
    await vi.waitFor(() =>
      expect(router.state.location.search).toMatchObject({ month: "2026-10" }),
    );
  });
});
