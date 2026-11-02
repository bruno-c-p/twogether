import { redirect } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import { useActionRun } from "@/features/auth/hooks/use-action-run";
import { Button } from "@/components/glaze/ui/button";
import { renderWithProviders } from "@/test/render";

type Step = () => Promise<string>;

function RunHarness({
  step,
  onResult,
}: {
  step: Step;
  onResult: (value: { data: string } | null) => void;
}) {
  const { run, busy, error } = useActionRun("Sem conexão. Tente novamente.");

  async function go() {
    onResult(await run(step));
  }

  return (
    <>
      <Button onClick={() => void go()}>run</Button>
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
      Promise.resolve("done"),
    );

    const invalidate = vi.spyOn(router, "invalidate");

    await user.click(screen.getByRole("button", { name: "run" }));
    await vi.waitFor(() =>
      expect(onResult).toHaveBeenCalledWith({ data: "done" }),
    );
    expect(invalidate).toHaveBeenCalled();
  });

  test("a rejected action shows its message and returns null", async () => {
    const { screen, user, onResult } = await renderRun(() =>
      Promise.reject(new Error("Convite expirado.")),
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

      return next ? next() : Promise.resolve("done");
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
    let finish: (value: string) => void = () => undefined;

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
    finish("done");
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(step).toHaveBeenCalledTimes(1);
  });
});
