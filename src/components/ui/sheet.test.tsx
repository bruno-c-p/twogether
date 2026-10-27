import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderPlain } from "@/test/render";

// Each test loads a fresh copy of the sheet module: its lazy drawer resolves
// once per module, and these tests need the plain stand-in trigger that
// shows before it does.
async function renderSheet() {
  const { Sheet, SheetHeader, SheetTrigger } =
    await import("@/components/ui/sheet");

  const view = renderPlain(
    <QueryClientProvider client={new QueryClient()}>
      <Sheet trigger={<SheetTrigger>Abrir</SheetTrigger>}>
        <SheetHeader title="Escolher mês" />
      </Sheet>
    </QueryClientProvider>,
  );

  return { ...view, plain: view.screen.getByRole("button", { name: "Abrir" }) };
}

beforeEach(() => {
  vi.resetModules();
});

describe("Sheet", () => {
  test("a tap before the drawer loads opens the sheet once it arrives", async () => {
    const { screen, plain } = await renderSheet();

    fireEvent.click(plain);

    expect(
      await screen.findByRole("dialog", { name: "Escolher mês" }),
    ).toBeTruthy();
  });

  test("a press the drawer swaps out mid-tap opens it on release", async () => {
    const { screen, plain } = await renderSheet();

    fireEvent.pointerDown(plain, { button: 0 });
    await vi.waitFor(() => expect(plain.isConnected).toBe(false));
    fireEvent.pointerUp(document, { button: 0 });

    expect(
      await screen.findByRole("dialog", { name: "Escolher mês" }),
    ).toBeTruthy();
  });

  test("a cancelled press, such as a scroll, does not open it", async () => {
    const { screen, plain } = await renderSheet();

    fireEvent.pointerDown(plain, { button: 0 });
    await vi.waitFor(() => expect(plain.isConnected).toBe(false));
    fireEvent.pointerCancel(document);
    fireEvent.pointerUp(document, { button: 0 });
    // An open would land on the next render; give it one.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
