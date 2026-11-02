import { describe, expect, test, vi } from "vitest";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { renderPlain } from "@/test/render";

// jsdom has no ResizeObserver; Glaze's dialog body watches its own size.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function setup({ busy = false, error = "" } = {}) {
  const onSave = vi.fn<(values: GoalPercentages) => Promise<void>>(() =>
    Promise.resolve(),
  );

  const onClose = vi.fn();

  const view = renderPlain(
    <GoalPercentagesDialog
      percentages={{ ...DEFAULT_PERCENTAGES }}
      busy={busy}
      error={error}
      onSave={onSave}
      onClose={onClose}
    />,
  );

  return { ...view, onSave, onClose };
}

async function setPercentage(
  view: ReturnType<typeof setup>,
  goal: string,
  value: string,
) {
  const input = view.screen.getByRole("textbox", {
    name: new RegExp(`^${goal}`),
  });

  await view.user.clear(input);
  await view.user.type(input, value);
}

describe("GoalPercentagesDialog", () => {
  test("blocks saving while the total is not 100%", async () => {
    const view = setup();

    await setPercentage(view, "Custo fixo", "40");

    expect(view.screen.getByRole("status").textContent).toMatch(/Total: 110%/);
    expect(
      view.screen
        .getByRole("button", { name: "Salvar percentuais" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  test("saves a valid split and leaves closing to the caller", async () => {
    const view = setup();

    await setPercentage(view, "Custo fixo", "35");
    await setPercentage(view, "Liberdade financeira", "20");
    await view.user.click(
      view.screen.getByRole("button", { name: "Salvar percentuais" }),
    );

    expect(view.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fixed: 35, freedom: 20 }),
    );
    expect(view.onClose).not.toHaveBeenCalled();
  });

  test("while saving every control is locked", () => {
    const view = setup({ busy: true });

    // A pending button stays focusable, so it is aria-disabled instead.
    for (const name of ["Salvar percentuais", "Restaurar padrão"]) {
      const button = view.screen.getByRole("button", { name });

      expect(
        button.hasAttribute("disabled") ||
          button.getAttribute("aria-disabled") === "true",
      ).toBe(true);
    }
  });

  test("shows the server's error, then the default can be restored", async () => {
    const view = setup({ error: "Conflito." });

    expect(view.screen.getByText("Conflito.")).toBeTruthy();
    expect(
      view.screen
        .getByRole("button", { name: "Salvar percentuais" })
        .hasAttribute("disabled"),
    ).toBe(false);

    await view.user.click(
      view.screen.getByRole("button", { name: "Restaurar padrão" }),
    );
    expect(
      view.screen.getByRole("textbox", { name: /^Custo fixo/ }),
    ).toHaveProperty("value", "30");
  });
});
