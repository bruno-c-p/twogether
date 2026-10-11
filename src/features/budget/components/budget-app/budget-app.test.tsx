import { getRouteApi } from "@tanstack/react-router";
import { within } from "@testing-library/react";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { BudgetWorkspace } from "@/features/budget/components/budget-app/budget-app";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { Transaction } from "@/features/budget/domain/types";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { ana, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

function budget({
  transactions = [transaction()],
  syncError = "",
}: {
  transactions?: Transaction[];
  syncError?: string;
} = {}): BudgetController {
  return {
    state: {
      transactions,
      percentages: { ...DEFAULT_PERCENTAGES },
    },
    user: { id: "ana", name: "Ana" },
    household: { id: "home", members: [ana] },
    syncError,
  };
}

const workspaceRoute = getRouteApi("/_authenticated/_workspace");

// Stands in for the layout route, which renders the workspace once the URL
// carries a month.
function Layout({ controller }: { controller: BudgetController }) {
  const { month } = workspaceRoute.useSearch();

  if (!month) return null;

  return (
    <BudgetWorkspace
      budget={controller}
      month={month}
      account={<span>conta</span>}
    />
  );
}

async function renderWorkspace(
  controller = budget(),
  path = "/?month=2026-09",
) {
  window.scrollTo = vi.fn();

  return renderWithProviders(<Layout controller={controller} />, path);
}

describe("BudgetWorkspace", () => {
  test("opens on the month overview with the couple's explanation", async () => {
    const { screen } = await renderWorkspace();

    expect(
      screen.getByRole("heading", { level: 1, name: "Visão geral" }),
    ).toBeTruthy();
    expect(screen.getByText(/Sobra de\s+setembro/)).toBeTruthy();
    expect(screen.getByText("conta")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar Mercado" })).toBeTruthy();
  });

  test("moves between months through the URL", async () => {
    // "Voltar para este mês" only shows away from the current month.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 15));
    onTestFinished(() => void vi.useRealTimers());

    const { screen, user, router } = await renderWorkspace();

    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "outubro 2026" }),
    );
    expect(router.state.location.search).toMatchObject({ month: "2026-10" });
    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Voltar para este mês" }),
    );
    expect(router.state.location.search).not.toMatchObject({
      month: "2026-10",
    });
  });

  test("shows the month in Portuguese on the drawer trigger", async () => {
    const { screen } = await renderWorkspace();

    expect(screen.getByText("setembro 2026")).toBeTruthy();
    expect(screen.getByText("set 2026")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Selecionar mês e ano: setembro 2026",
      }),
    ).toBeTruthy();
  });

  test("hides values from the top bar", async () => {
    const { screen, user } = await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Ocultar valores" }));
    expect(
      screen.getByRole("button", { name: "Mostrar valores" }),
    ).toBeTruthy();
    expect(screen.getAllByText("R$ ••••").length).toBeGreaterThan(0);
  });

  test("editing a transaction opens it prefilled", async () => {
    const { screen, user } = await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Editar Mercado" }));
    expect(
      await screen.findByRole("heading", { name: "Editar transação" }),
    ).toBeTruthy();
  });

  test("deleting a recurring transaction asks which occurrences to remove", async () => {
    const series = [0, 1, 2].map((index) =>
      transaction({
        id: `r${index}`,
        description: "Aluguel",
        recurrenceId: "rent",
        recurrenceIndex: index,
        date: `2026-${String(9 + index).padStart(2, "0")}-05`,
      }),
    );

    const { screen, user } = await renderWorkspace(
      budget({ transactions: series }),
      "/transacoes?month=2026-09",
    );

    await user.click(screen.getByRole("button", { name: "Excluir Aluguel" }));
    expect(
      await screen.findByText("3 transações desta recorrência."),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await vi.waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Excluir transação" }),
      ).toBeNull();
    });
  });

  test("goals open the percentages editor; filtering by a goal opens its transactions", async () => {
    const { screen, user, router } = await renderWorkspace(
      budget(),
      "/orcamento?month=2026-09",
    );

    await user.click(
      screen.getByRole("button", { name: "Editar meus percentuais" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Divisão da minha renda" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Fechar percentuais" }),
    );
    await user.click(screen.getByRole("link", { name: /^Custo fixo:/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(router.state.location.search).toEqual({
      month: "2026-09",
      goal: "fixed",
    });
  });

  test("the person filter and a sync error update the page", async () => {
    const { screen, user } = await renderWorkspace(
      budget({ syncError: "Sem conexão." }),
    );

    expect(screen.getByRole("alert").textContent).toBe("Sem conexão.");
    await user.click(
      screen.getByRole("button", { name: "Filtrar por pessoa: Nós" }),
    );
    await user.click(await screen.findByRole("radio", { name: "Eu" }));
    expect(
      screen.getByRole("button", { name: "Filtrar por pessoa: Eu" }),
    ).toBeTruthy();
  });

  test("the transactions list links from the overview to the full view", async () => {
    const { screen, user, router } = await renderWorkspace();

    await user.click(screen.getByRole("link", { name: /Ver todas/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Transações" }),
    ).toBeTruthy();
  });

  test("month, person and filter changes keep the scroll; page links reset it", async () => {
    const { screen, user, router } = await renderWorkspace(
      budget(),
      "/transacoes?month=2026-09",
    );

    const scrollTo = vi.mocked(window.scrollTo);

    scrollTo.mockClear();
    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "outubro 2026" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Filtrar por pessoa: Nós" }),
    );
    await user.click(await screen.findByRole("radio", { name: "Eu" }));
    await user.type(screen.getByLabelText("Buscar transações"), "a");
    await vi.waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        month: "2026-10",
        member: "ana",
        query: "a",
      }),
    );
    expect(scrollTo).not.toHaveBeenCalled();

    const nav = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    await user.click(within(nav).getByRole("link", { name: "Orçamento" }));
    await vi.waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0 }),
      ),
    );
  });

  test("page links keep month and person and drop transaction filters", async () => {
    const { screen, user, router } = await renderWorkspace(
      budget(),
      "/transacoes?month=2026-08&member=ana&goal=fixed",
    );

    const nav = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Transações" }).ariaCurrent,
    ).toBe("page");
    await user.click(within(nav).getByRole("link", { name: "Orçamento" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Orçamento" }),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/orcamento");
    expect(router.state.location.search).toEqual({
      month: "2026-08",
      member: "ana",
    });
    expect(
      within(nav).getByRole("link", { name: "Orçamento" }).ariaCurrent,
    ).toBe("page");
    expect(
      within(nav).getByRole("link", { name: "Transações" }).ariaCurrent,
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "outubro 2026" }),
    );
    expect(router.state.location.pathname).toBe("/orcamento");
    expect(router.state.location.search).toEqual({
      month: "2026-10",
      member: "ana",
    });
  });
});
