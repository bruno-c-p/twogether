import { describe, expect, test, vi } from "vitest";
import { TagPicker } from "@/features/budget/components/tag-picker/tag-picker";
import { renderPlain } from "@/test/render";

function setup(overrides: Partial<Parameters<typeof TagPicker>[0]> = {}) {
  const props = {
    tags: ["casa"],
    input: "",
    existingTags: ["casa", "mercado", "viagem"],
    onInput: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };

  return { props, ...renderPlain(<TagPicker {...props} />) };
}

describe("TagPicker", () => {
  test("suggests only tags that are not selected yet", () => {
    const { screen } = setup();

    expect(screen.getByRole("button", { name: "#mercado" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "#casa" })).toBeNull();
  });

  test("adds the typed tag on Enter and removes a selected tag", async () => {
    const { user, props, screen } = setup({ input: "feira" });

    await user.type(screen.getByLabelText(/Tags/), "{Enter}");
    await user.click(screen.getByRole("button", { name: "Remover tag casa" }));

    expect(props.onAdd).toHaveBeenCalledWith("feira");
    expect(props.onRemove).toHaveBeenCalledWith("casa");
  });

  test("disables input and add button once eight tags are chosen", () => {
    const { screen } = setup({
      tags: ["a", "b", "c", "d", "e", "f", "g", "h"],
      input: "x",
    });

    expect(screen.getByLabelText(/Tags/).hasAttribute("disabled")).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Adicionar tag" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
