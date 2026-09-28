import { describe, expect, test, vi } from "vitest";
import { RecurrencePanel } from "@/features/budget/components/recurrence-panel/recurrence-panel";
import { renderPlain } from "@/test/render";

describe("RecurrencePanel", () => {
  test("hides the month count until recurrence is switched on", async () => {
    const onRecurringChange = vi.fn();

    const { screen, user } = renderPlain(
      <RecurrencePanel
        recurring={false}
        occurrences={12}
        onRecurringChange={onRecurringChange}
        onOccurrencesChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Por quantos meses?")).toBeNull();
    await user.click(
      screen.getByRole("switch", { name: "Repetir mensalmente" }),
    );
    expect(onRecurringChange).toHaveBeenCalledWith(true);
  });

  test("edits the month count and links the error to the input", async () => {
    const onOccurrencesChange = vi.fn();

    const { screen, user } = renderPlain(
      <RecurrencePanel
        recurring
        occurrences={Number.NaN}
        error="Escolha de 2 a 120 meses."
        onRecurringChange={vi.fn()}
        onOccurrencesChange={onOccurrencesChange}
      />,
    );

    const input = screen.getByLabelText("Por quantos meses?");

    expect(input).toHaveProperty("value", "");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      "recurrence-hint occurrences-error",
    );
    await user.type(input, "6");
    expect(onOccurrencesChange).toHaveBeenLastCalledWith(6);
  });
});
