import { redirect } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import { useActionRun } from "@/features/auth/hooks/use-action-run";
import type { MutationResult } from "@/server/mutation-result";
import { renderWithProviders } from "@/test/render";

type Step = () => Promise<MutationResult>;

function RunHarness({
  step,
  onResult,
}: {
  step: Step;
  onResult: (value: MutationResult | null) => void;
}) {
  const { run, busy, error } = useActionRun("Sem conexão. Tente novamente.");

  async function go() {
    onResult(await run(step));
  }

  return (
    <>
      <button onClick={() => void go()}>run</button>
      <p role="status">{busy ? "busy" : error || "idle"}</p>
    </>
  );
}

async function renderRun(step: Step) {
  const onResult = vi.fn();

  const view = await renderWithProviders(
    <RunHarness step={step} onResult={onResult} />,
    "/entrar",
  );

  return { ...view, onResult };
}

describe("useActionRun", () => {
  test("a successful step reloads the route and returns its result", async () => {
    const { screen, user, onResult, router } = await renderRun(() =>
      Promise.resolve({ ok: true }),
    );

    const invalidate = vi.spyOn(router, "invalidate");

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith({ ok: true }));
    expect(invalidate).toHaveBeenCalled();
  });

  test("a failure result is shown and returns nothing", async () => {
    const { screen, user, onResult } = await renderRun(() =>
      Promise.resolve({
        ok: false,
        code: "expired",
        message: "Convite expirado.",
      }),
    );

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(screen.getByRole("status").textContent).toBe("Convite expirado.");
  });

  test("errors show a message and redirects navigate", async () => {
    const steps: Step[] = [
      async () => {
        throw new TypeError("fetch failed");
      },
      async () => {
        throw redirect({ to: "/", search: { month: "2026-09" } });
      },
    ];

    const { screen, user, onResult, router } = await renderRun(() => {
      const next = steps.shift();

      return next ? next() : Promise.resolve({ ok: true });
    });

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toBe(
      "Sem conexão. Tente novamente.",
    );

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(router.state.location.pathname).toBe("/");
    expect(onResult).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("status").textContent).toBe("idle");
  });

  test("a second run while busy is ignored", async () => {
    let finish: (value: MutationResult) => void = () => undefined;

    const step = vi.fn<Step>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    const { screen, user, onResult } = await renderRun(step);

    await user.click(screen.getByRole("button", { name: "run" }));
    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    expect(screen.getByRole("status").textContent).toBe("busy");
    finish({ ok: true });
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(step).toHaveBeenCalledTimes(1);
  });
});
