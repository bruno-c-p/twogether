import { describe, expect, test } from "vitest";
import { GoalCards } from "@/features/budget/components/goal-cards";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import { money } from "@/features/budget/domain/format";
import { ana, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const salary = transaction({
  id: "s",
  kind: "income",
  goal: null,
  amount: 100000,
  tags: [],
});

const rent = transaction({ id: "r", goal: "fixed", amount: 40000 });

function renderTable({ hidden = false, withIncome = true } = {}) {
  const monthly = withIncome ? [salary, rent] : [rent];

  return renderWithProviders(
    <GoalCards
      summary={summarize(monthly)}
      plans={planGoals(monthly, [ana])}
      members={[ana]}
      hidden={hidden}
      displayMoney={(value) => (hidden ? "R$ ••••" : money(value))}
    />,
    "/orcamento?month=2026-09",
  );
}

describe("GoalCards", () => {
  test("flags a goal over its plan and links to its transactions", async () => {
    const { screen, user, router } = await renderTable();
    const fixed = screen.getByRole("link", { name: /^Custo fixo:/ });

    expect(fixed.getAttribute("aria-label")).toMatch(/acima do planejado$/);
    expect(fixed.textContent).toMatch(/30%/);
    expect(fixed.textContent).toMatch(/133% · R\$\s100,00 acima/);
    expect(
      screen.getByRole("link", { name: /^Prazeres:/ }).textContent,
    ).toMatch(/0 transações/);
    await user.click(fixed);
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(router.state.location.search).toEqual({
      month: "2026-09",
      goal: "fixed",
    });
  });

  test("shows what remains and the total row", async () => {
    const { container } = await renderTable();

    expect(container.textContent).toMatch(/0% · restam R\$\s100,00/);
    expect(container.textContent).toMatch(/Total\s100%/);
  });

  test("without income nothing is planned, so spending fills the bar", async () => {
    const { container, screen } = await renderTable({ withIncome: false });

    const widths = [
      ...container.querySelectorAll<HTMLElement>("a span[style]"),
    ].flatMap((bar) => bar.style.width || []);

    expect(widths).toContain("100%");
    expect(widths).toContain("0%");
    expect(container.textContent).not.toMatch(/null/);
    expect(
      screen.getByRole("link", { name: /^Prazeres:/ }).textContent,
    ).toMatch(/restam R\$\s0,00$/);
  });

  test("hidden values keep the warning but not the amounts", async () => {
    const { screen } = await renderTable({ hidden: true });
    const fixed = screen.getByRole("link", { name: /^Custo fixo:/ });

    expect(fixed.textContent).toMatch(/Acima do planejado/);
    expect(fixed.textContent).not.toMatch(/\d{3},\d{2}/);
  });

  test("as a couple, each card shows how much of the plan each person funds", async () => {
    const bia = {
      ...ana,
      id: "bia",
      name: "Bia",
      percentages: { ...ana.percentages, fixed: 40 },
    };

    const biaSalary = transaction({
      id: "b",
      memberId: "bia",
      kind: "income",
      goal: null,
      amount: 50000,
      tags: [],
    });

    const monthly = [salary, biaSalary, rent];

    const { screen } = await renderWithProviders(
      <GoalCards
        summary={summarize(monthly)}
        plans={planGoals(monthly, [ana, bia])}
        members={[ana, bia]}
        hidden={false}
        displayMoney={money}
      />,
      "/orcamento?month=2026-09",
    );

    const fixed = screen.getByRole("link", { name: /^Custo fixo:/ });

    expect(fixed.textContent).toMatch(/Ana:\s*R\$\s300,00\s*\(30%\)/);
    expect(fixed.textContent).toMatch(/Bia:\s*R\$\s200,00\s*\(40%\)/);
  });

  test("a single person's card has no per-person line", async () => {
    const { screen } = await renderTable();

    expect(
      screen.getByRole("link", { name: /^Custo fixo:/ }).textContent,
    ).not.toMatch(/Ana:/);
  });
});
