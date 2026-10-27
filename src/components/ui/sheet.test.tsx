import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Sheet, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { renderPlain } from "@/test/render";

describe("Sheet", () => {
  test("a tap before the drawer loads opens the sheet once it arrives", async () => {
    const { screen } = renderPlain(
      <QueryClientProvider client={new QueryClient()}>
        <Sheet trigger={<SheetTrigger>Abrir</SheetTrigger>}>
          <SheetHeader title="Escolher mês" />
        </Sheet>
      </QueryClientProvider>,
    );

    // The drawer is lazy, so on the first render the trigger is the plain
    // stand-in; tap it before the drawer resolves.
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));

    expect(
      await screen.findByRole("dialog", { name: "Escolher mês" }),
    ).toBeTruthy();
  });
});
