import { describe, expect, test, vi } from "vitest";
import { RegisterSheet } from "@/features/budget/components/register-sheet";
import type { PhraseDraft } from "@/features/budget/domain/phrase";
import { nubank } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function setup() {
  const onParsed = vi.fn<(draft: PhraseDraft) => void>();
  const onManual = vi.fn();
  const onClose = vi.fn();

  const view = renderPlain(
    <RegisterSheet
      accounts={[nubank]}
      onParsed={onParsed}
      onManual={onManual}
      onClose={onClose}
    />,
  );

  return { ...view, onParsed, onManual, onClose };
}

describe("RegisterSheet", () => {
  test("reports parse errors and hands a parsed phrase over", async () => {
    const { screen, user, onParsed } = setup();

    const input = screen.getByRole("textbox", {
      name: "Descreva o que aconteceu",
    });

    await user.type(input, "comprei pão");
    await user.click(screen.getByRole("button", { name: "Enviar frase" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/valor/);
    expect(onParsed).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "Gastei 300 reais de condomínio #casa");
    await user.click(screen.getByRole("button", { name: "Enviar frase" }));

    expect(onParsed).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 30000,
        description: "Condomínio",
        goal: "fixed",
        accountId: nubank.id,
        tags: ["casa"],
      }),
    );
  });

  test("opens as a named modal that a backdrop click closes", async () => {
    const { screen, user, onClose } = setup();
    const sheet = screen.getByRole("dialog", { name: "Registrar transação" });

    expect(sheet).toHaveProperty("open", true);
    await user.click(screen.getByRole("heading", { name: "O que aconteceu?" }));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(sheet);
    expect(onClose).toHaveBeenCalled();
  });

  test("offers manual entry", async () => {
    const { screen, user, onManual } = setup();

    await user.click(
      screen.getByRole("button", { name: "Preencher manualmente" }),
    );
    expect(onManual).toHaveBeenCalled();
  });
});
