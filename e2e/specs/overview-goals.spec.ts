import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectToast,
  signInClerk,
  nav,
  onboard,
  openCouple,
  openNewTransaction,
  openView,
  setName,
  uniqueEmail,
  withMobile,
  reloadApp,
  choosePerson,
  personFilter,
  monthTrigger,
  setMonth,
  transactionRow,
} from "../fixtures/app";

async function addExpense(page: Page, description: string, date: string) {
  const dialog = await openNewTransaction(page);
  await dialog.getByRole("button", { name: "Despesa" }).click();
  await dialog.getByLabel("Valor").fill("10,00");
  await dialog.getByLabel("Descrição").fill(description);
  await dialog.getByLabel("Data").fill(date);
  await dialog.getByRole("button", { name: "Custo fixo", exact: true }).click();
  await dialog.getByRole("button", { name: "Adicionar transação" }).click();
  await expectToast(page, "Transação adicionada.");
}

async function onboardCouple(page: Page, browser: Browser) {
  await onboard(page, "Ana");
  await openCouple(page);
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const inviteUrl = await page.getByLabel("Link para seu par").inputValue();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
  const bia = await browser.newContext();
  const biaPage = await bia.newPage();
  await biaPage.goto(inviteUrl);
  await signInClerk(biaPage, uniqueEmail("bia"));
  await setName(biaPage, "Bia");
  await biaPage.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(
    biaPage.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
  await reloadApp(page);
  await expect(
    page.getByRole("button", { name: "Abrir nosso espaço: 2 pessoas" }),
  ).toBeVisible();

  return { bia, biaPage };
}

test.describe("overview and goals", () => {
  test("M8 person toggle and month keep search as source of truth", async ({
    page,
    browser,
  }) => {
    const { bia, biaPage } = await onboardCouple(page, browser);
    await setMonth(page, "2026-09");
    await addExpense(page, "Ana mercado", "2026-09-10");

    await reloadApp(biaPage);
    await setMonth(biaPage, "2026-09");
    await addExpense(biaPage, "Bia café", "2026-09-11");

    await reloadApp(page);
    await setMonth(page, "2026-09");
    await expect(
      page.getByRole("button", { name: "Ana mercado", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bia café", exact: true }),
    ).toBeVisible();
    await openView(page, "Orçamento");
    await expect(
      page.getByText("O planejado soma as metas de cada pessoa."),
    ).toBeVisible();

    await choosePerson(page, "Eu");
    const eu = new URL(page.url());
    const member = eu.searchParams.get("member");
    expect(member).toBeTruthy();
    await expect(
      page.getByText("Renda, gastos e metas da pessoa selecionada."),
    ).toBeVisible();
    await openView(page, "Visão geral");
    await expect(page.getByText(/^Sobra desta pessoa em /)).toBeVisible();
    await openView(page, "Transações");
    await expect(
      page.getByRole("button", { name: "Ana mercado", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bia café", exact: true }),
    ).toHaveCount(0);

    await choosePerson(page, "Bia");
    await expect(
      page.getByRole("button", { name: "Bia café", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ana mercado", exact: true }),
    ).toHaveCount(0);

    await setMonth(page, "2026-10");
    expect(new URL(page.url()).searchParams.get("month")).toBe("2026-10");
    await expect(page.getByText("Nenhuma transação neste mês.")).toBeVisible();

    const currentMonth = await page.evaluate(() => {
      const now = new Date();

      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    if (currentMonth !== "2026-10") {
      await monthTrigger(page).click();
      await expect(
        page.getByRole("button", { name: "Voltar para este mês" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("heading", { name: "Sua conta" }),
      ).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await openView(page, "Orçamento");

    const memberId = new URL(page.url()).searchParams.get("member");
    await nav(page, "desktop")
      .getByRole("link", { name: "Transações" })
      .click();
    await expect(page).toHaveURL(/\/transacoes\?/);
    const kept = new URL(page.url()).searchParams;
    expect(kept.get("month")).toBe("2026-10");
    expect(kept.get("member")).toBe(memberId);

    await reloadApp(page);
    expect(new URL(page.url()).pathname).toBe("/transacoes");
    const restored = new URL(page.url()).searchParams;
    expect(restored.get("month")).toBe("2026-10");
    expect(restored.get("member")).toBe(memberId);

    await setMonth(page, "2026-09");
    await expect(
      page.getByRole("button", { name: "Bia café", exact: true }),
    ).toBeVisible();
    await openView(page, "Visão geral");
    await page.getByRole("button", { name: "Ocultar valores" }).click();
    await openView(page, "Transações");
    await expect(transactionRow(page, "Bia café")).toContainText("R$ ••••");
    await reloadApp(page);
    await expect(page.getByText("R$ ••••")).toHaveCount(0);
    await expect(transactionRow(page, "Bia café")).toContainText(/R\$\s*10,00/);

    await withMobile(page, async () => {
      await expect(personFilter(page)).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    await bia.close();
  });

  test("M11 three views, desktop and mobile nav", async ({ page, browser }) => {
    const { bia } = await onboardCouple(page, browser);
    await setMonth(page, "2026-09");
    await addExpense(page, "Farmácia", "2026-09-02");

    const views = [
      {
        name: "Visão geral",
        mobileName: "Início",
        heading: "Visão geral",
        path: "/",
      },
      {
        name: "Transações",
        mobileName: "Transações",
        heading: "Transações",
        path: "/transacoes",
      },
      {
        name: "Orçamento",
        mobileName: "Orçamento",
        heading: "Orçamento",
        path: "/orcamento",
      },
    ] as const;

    for (const item of views) {
      await nav(page, "desktop").getByRole("link", { name: item.name }).click();
      await expect(page.locator("#main-content h1")).toHaveText(item.heading);
      await expect(
        nav(page, "desktop").getByRole("link", { name: item.name }),
      ).toHaveAttribute("aria-current", "page");
      expect(new URL(page.url()).pathname).toBe(item.path);
    }

    // Old bookmarks kept the page in ?view=.
    await page.goto("/?view=goals&month=2026-09");
    await expect(page).toHaveURL(/\/orcamento\?month=2026-09$/);
    await expect(page.locator("#main-content h1")).toHaveText("Orçamento");

    await nav(page, "desktop")
      .getByRole("link", { name: "Visão geral" })
      .click();
    await expect(
      page.getByRole("region", { name: "Resumo mensal" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Acerto entre vocês" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Contas da casa" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Últimas transações" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editar Farmácia" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver todas/ })).toBeVisible();

    await openView(page, "Orçamento");
    await expect(
      page.getByRole("heading", { name: "Distribuição da renda" }),
    ).toBeVisible();
    await expect(
      page.getByText("Despesas essenciais do dia a dia."),
    ).toBeVisible();
    await expect(page.getByText("Lazer e experiências.")).toBeVisible();
    await expect(page.getByText("Conforto e bem-estar.")).toBeVisible();
    await expect(
      page.getByText("Objetivos de curto e longo prazo."),
    ).toBeVisible();
    await expect(page.getByText("Cursos e desenvolvimento.")).toBeVisible();
    await expect(page.getByText("Reserva e investimentos.")).toBeVisible();
    await choosePerson(page, "Nós");
    await expect(
      page.getByRole("button", { name: "Editar meus percentuais" }),
    ).toBeVisible();
    await choosePerson(page, "Eu");
    await expect(
      page.getByRole("button", { name: "Editar meus percentuais" }),
    ).toBeVisible();
    await choosePerson(page, "Bia");
    await expect(
      page.getByRole("button", { name: "Editar meus percentuais" }),
    ).toBeHidden();

    await openView(page, "Transações");
    await expect(monthTrigger(page)).toBeVisible();
    await expect(personFilter(page)).toBeVisible();

    await withMobile(page, async () => {
      await expect(nav(page, "desktop")).toBeHidden();
      await expect(nav(page, "mobile")).toBeVisible();

      await expect(
        nav(page, "mobile").getByRole("button", {
          name: "Registrar transação",
        }),
      ).toBeVisible();

      for (const item of views) {
        await nav(page, "mobile")
          .getByRole("link", { name: item.mobileName })
          .click();
        await expect(page.locator("#main-content h1")).toHaveText(item.heading);
        await expect(
          nav(page, "mobile").getByRole("link", { name: item.mobileName }),
        ).toHaveAttribute("aria-current", "page");
      }

      await nav(page, "mobile").getByRole("button", { name: "Conta" }).click();
      await expect(
        page.getByRole("heading", { name: "Sua conta" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("heading", { name: "Sua conta" }),
      ).toHaveCount(0);

      const clearance = await page
        .locator("footer")
        .evaluate(
          (el) =>
            Number.parseFloat(getComputedStyle(el).paddingBottom) +
            Number.parseFloat(
              getComputedStyle(el.parentElement ?? el).paddingBottom,
            ),
        );

      expect(clearance).toBeGreaterThanOrEqual(68);
      await expectNoHorizontalOverflow(page);
    });

    await bia.close();
  });

  test("saving my percentages updates planned amounts to the cent", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await setMonth(page, "2026-09");

    const income = await openNewTransaction(page);
    await income.getByRole("button", { name: "Receita" }).click();
    await income.getByLabel("Valor").fill("5000,00");
    await income.getByLabel("Descrição").fill("Salário");
    await income.getByLabel("Data").fill("2026-09-01");
    await income.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    await openView(page, "Orçamento");
    await expect(
      page.getByRole("link", {
        name: /Custo fixo: R\$\s*0,00 de R\$\s*1\.500,00 planejados/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Metas: R\$\s*0,00 de R\$\s*750,00 planejados/,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Editar meus percentuais" }).click();
    const dialog = page.getByRole("dialog", { name: "Divisão da minha renda" });
    await dialog.getByLabel("Custo fixo").fill("20");
    await dialog.getByLabel("Metas").fill("25");
    await expect(dialog.getByRole("status")).toContainText("100%");
    await dialog.getByRole("button", { name: "Salvar percentuais" }).click();
    await expectToast(page, "Percentuais atualizados.");

    await expect(
      page.getByRole("link", {
        name: /Custo fixo: R\$\s*0,00 de R\$\s*1\.000,00 planejados/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Metas: R\$\s*0,00 de R\$\s*1\.250,00 planejados/,
      }),
    ).toBeVisible();
  });
});
