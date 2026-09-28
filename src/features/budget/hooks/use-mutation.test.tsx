import { redirect } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { workspaceQueryKeyFor } from "@/features/budget/workspace";
import type { MutationResult } from "@/server/mutation-result";
import { ana } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const snapshot: WorkspaceSnapshot = {
  user: { id: "ana", name: "Ana" },
  household: { id: "home", members: [ana] },
  budget: {
    transactions: [],
    accounts: [],
    percentages: { ...DEFAULT_PERCENTAGES },
  },
};

const renamed = (current: WorkspaceSnapshot): WorkspaceSnapshot => ({
  ...current,
  user: { ...current.user, name: "Ana otimista" },
});

type Run = (label: string) => Promise<MutationResult>;

function Harness({
  fn,
  optimistic,
  onResult,
}: {
  fn: Run;
  optimistic?: typeof renamed;
  onResult: (value: MutationResult | null) => void;
}) {
  const mutation = useMutation(fn, optimistic);

  return (
    <>
      <button onClick={() => void mutation.run("go").then(onResult)}>
        run
      </button>
      <p role="status">
        {mutation.pending ? "pending" : mutation.error || "idle"}
      </p>
    </>
  );
}

async function setup(fn: Run, optimistic?: typeof renamed) {
  const onResult = vi.fn();

  const view = await renderWithProviders(
    <Harness fn={fn} optimistic={optimistic} onResult={onResult} />,
    "/?month=2026-09",
  );

  view.queryClient.setQueryData(workspaceQueryKeyFor("ana"), snapshot);

  const cachedName = () =>
    view.queryClient.getQueryData<WorkspaceSnapshot>(
      workspaceQueryKeyFor("ana"),
    )?.user.name;

  return { ...view, onResult, cachedName };
}

describe("useMutation", () => {
  test("returns the server result and forwards the arguments", async () => {
    const fn = vi.fn<Run>(() => Promise.resolve({ ok: true }));
    const { screen, user, onResult } = await setup(fn);

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith({ ok: true }));
    expect(fn).toHaveBeenCalledWith("go");
    expect(screen.getByRole("status").textContent).toBe("idle");
  });

  test("applies the optimistic snapshot and keeps it on success", async () => {
    const { screen, user, onResult, cachedName } = await setup(
      () => Promise.resolve({ ok: true }),
      renamed,
    );

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalled());
    expect(cachedName()).toBe("Ana otimista");
  });

  test("a failure result shows its message and rolls the snapshot back", async () => {
    const { screen, user, onResult, cachedName } = await setup(
      () => Promise.resolve({ ok: false, code: "conflict", message: "Mudou." }),
      renamed,
    );

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(screen.getByRole("status").textContent).toBe("Mudou.");
    expect(cachedName()).toBe("Ana");
  });

  test("a thrown error shows its message; a network TypeError shows the offline hint", async () => {
    const errors = [
      new Error("Falhou no servidor."),
      new TypeError("fetch failed"),
    ];

    const { screen, user, onResult, cachedName } = await setup(async () => {
      throw errors.shift() ?? new Error("no more errors");
    }, renamed);

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toBe("Falhou no servidor.");
    expect(cachedName()).toBe("Ana");

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("status").textContent).toMatch(/^Sem conexão/);
  });

  test("a redirect navigates instead of showing an error", async () => {
    const { screen, user, onResult, router } = await setup(async () => {
      throw redirect({
        to: "/",
        search: { month: "2026-09", view: "accounts" },
      });
    });

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(router.state.location.search).toMatchObject({ view: "accounts" });
    expect(screen.getByRole("status").textContent).toBe("idle");
  });

  test("ignores a second run while one is in flight", async () => {
    let finish: (value: MutationResult) => void = () => undefined;

    const fn = vi.fn<Run>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    const { screen, user, onResult } = await setup(fn);

    await user.click(screen.getByRole("button", { name: "run" }));
    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(screen.getByRole("status").textContent).toBe("pending");
    finish({ ok: true });
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith({ ok: true }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
