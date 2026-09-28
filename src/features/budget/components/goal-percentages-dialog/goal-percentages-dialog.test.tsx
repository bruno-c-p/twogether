import { describe, expect, test, vi } from "vitest";
import { GoalPercentagesDialog } from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { renderPlain } from "@/test/render";

function setup(saved = true, error = "") {
  const onSave = vi.fn<(values: GoalPercentages) => Promise<boolean>>(() =>
    Promise.resolve(saved),
  );

  const onClose = vi.fn();

  const view = renderPlain(
    <GoalPercentagesDialog
      percentages={{ ...DEFAULT_PERCENTAGES }}
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
  const input = view.screen.getByRole("spinbutton", {
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

  test("saves a valid split and closes", async () => {
    const view = setup();

    await setPercentage(view, "Custo fixo", "35");
    await setPercentage(view, "Liberdade financeira", "20");
    await view.user.click(
      view.screen.getByRole("button", { name: "Salvar percentuais" }),
    );

    expect(view.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fixed: 35, freedom: 20 }),
    );
    expect(view.onClose).toHaveBeenCalled();
  });

  test("stays open when saving fails, then the default can be restored", async () => {
    const view = setup(false, "Conflito.");

    await setPercentage(view, "Custo fixo", "35");
    await setPercentage(view, "Liberdade financeira", "20");
    await view.user.click(
      view.screen.getByRole("button", { name: "Salvar percentuais" }),
    );

    expect(view.onClose).not.toHaveBeenCalled();
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
      view.screen.getByRole("spinbutton", { name: /^Custo fixo/ }),
    ).toHaveProperty("value", "30");
  });
});
