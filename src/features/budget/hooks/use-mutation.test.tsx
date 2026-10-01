import { redirect } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { workspaceQueryKey } from "@/features/budget/workspace";
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

type Run = (label: string) => Promise<void>;

function Harness({
  fn,
  optimistic,
  onResult,
}: {
  fn: Run;
  optimistic?: typeof renamed;
  onResult: (value: boolean) => void;
}) {
  const mutation = useMutation(fn, optimistic);

  async function go() {
    onResult(await mutation.run("go"));
  }

  return (
    <>
      <button onClick={() => void go()}>run</button>
      <button onClick={mutation.reset}>reset</button>
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

  view.queryClient.setQueryData(workspaceQueryKey, snapshot);

  const cachedName = () =>
    view.queryClient.getQueryData<WorkspaceSnapshot>(workspaceQueryKey)?.user
      .name;

  return { ...view, onResult, cachedName };
}

describe("useMutation", () => {
  test("returns the server result and forwards the arguments", async () => {
    const fn = vi.fn<Run>(() => Promise.resolve());
    const { screen, user, onResult } = await setup(fn);

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(fn).toHaveBeenCalledWith("go");
    expect(screen.getByRole("status").textContent).toBe("idle");
  });

  test("applies the optimistic snapshot and keeps it on success", async () => {
    const { screen, user, onResult, cachedName } = await setup(
      () => Promise.resolve(),
      renamed,
    );

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalled());
    expect(cachedName()).toBe("Ana otimista");
  });

  test("a rejected change shows its message and rolls the snapshot back", async () => {
    const { screen, user, onResult, cachedName } = await setup(
      () => Promise.reject(new Error("Mudou.")),
      renamed,
    );

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
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

  test("reset clears the last error without running again", async () => {
    const fn = vi.fn<Run>(() => Promise.reject(new Error("Mudou.")));

    const { screen, user, onResult } = await setup(fn);

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.getByRole("status").textContent).toBe("Mudou.");

    await user.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByRole("status").textContent).toBe("idle");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("a redirect navigates instead of showing an error", async () => {
    const { screen, user, onResult, router } = await setup(async () => {
      throw redirect({ to: "/contas", search: { month: "2026-09" } });
    });

    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(router.state.location.pathname).toBe("/contas");
    expect(screen.getByRole("status").textContent).toBe("idle");
  });

  test("ignores a second run while one is in flight", async () => {
    let finish: () => void = () => undefined;

    const fn = vi.fn<Run>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    const { screen, user, onResult } = await setup(fn);

    await user.click(screen.getByRole("button", { name: "run" }));
    await user.click(screen.getByRole("button", { name: "run" }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.getByRole("status").textContent).toBe("pending");
    finish();
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
