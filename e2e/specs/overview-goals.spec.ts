import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectToast,
  loginDev,
  nav,
  onboard,
  openCouple,
  setMonth,
  setName,
  uniqueEmail,
  withMobile,
} from "../fixtures/app";

async function addAccount(page: Page, name = "Nubank") {
  await nav(page, "desktop").getByRole("link", { name: "Contas" }).click();
  await page.getByRole("button", { name: "Adicionar primeira conta" }).click();
  await page.getByLabel("Nome da conta").fill(name);
  await page.getByLabel("Saldo inicial").fill("0,00");
  await page.getByRole("button", { name: "Adicionar conta" }).click();
  await expectToast(page, "Conta adicionada.");
}

async function addExpense(
  page: Page,
  description: string,
  date: string,
) {
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
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
  await page.getByRole("button", { name: "Fechar nosso espaço" }).click();
  const bia = await browser.newContext();
  const biaPage = await bia.newPage();
  await biaPage.goto(inviteUrl);
  await loginDev(biaPage, uniqueEmail("bia"));
  await setName(biaPage, "Bia");
  await biaPage.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(biaPage.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await page.reload();
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
    await addAccount(page);
    await nav(page, "desktop").getByRole("link", { name: "Visão geral" }).click();
    await setMonth(page, "2026-09");
    await addExpense(page, "Ana mercado", "2026-09-10");

    await biaPage.reload();
    await setMonth(biaPage, "2026-09");
    await addExpense(biaPage, "Bia café", "2026-09-11");

    await page.reload();
    await setMonth(page, "2026-09");
    await expect(
      page.getByText("O planejado soma as metas individuais de cada pessoa."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ana mercado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bia café" })).toBeVisible();

    await page.getByRole("button", { name: "Eu" }).click();
    const eu = new URL(page.url());
    const member = eu.searchParams.get("member");
    expect(member).toBeTruthy();
    await expect(page.getByText("Saldo desta pessoa")).toBeVisible();
    await expect(
      page.getByText("Renda, gastos e metas da pessoa selecionada."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ana mercado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bia café" })).toHaveCount(0);

    await page.getByRole("button", { name: "Bia" }).click();
    await expect(page.getByRole("button", { name: "Bia café" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ana mercado" })).toHaveCount(0);

    await page.getByRole("button", { name: "Próximo mês" }).click();
    expect(new URL(page.url()).searchParams.get("month")).toBe("2026-10");
    await expect(page.getByText("Nenhuma transação neste mês.")).toBeVisible();
    const currentMonth = await page.evaluate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    if (currentMonth !== "2026-10") {
      await expect(
        page.getByRole("button", { name: "Voltar para este mês" }),
      ).toBeVisible();
    }

    await nav(page, "desktop").getByRole("link", { name: "Contas" }).click();
    await expect(
      page.getByText(
        "O saldo de cada conta considera só as transações da pessoa selecionada.",
      ),
    ).toBeVisible();

    const memberId = new URL(page.url()).searchParams.get("member");
    await nav(page, "desktop").getByRole("link", { name: "Transações" }).click();
    const kept = new URL(page.url()).searchParams;
    expect(kept.get("view")).toBe("transactions");
    expect(kept.get("month")).toBe("2026-10");
    expect(kept.get("member")).toBe(memberId);

    await page.reload();
    const restored = new URL(page.url()).searchParams;
    expect(restored.get("view")).toBe("transactions");
    expect(restored.get("month")).toBe("2026-10");
    expect(restored.get("member")).toBe(memberId);

    await setMonth(page, "2026-09");
    await expect(page.getByRole("button", { name: "Bia café" })).toBeVisible();
    await page.getByRole("button", { name: "Ocultar valores" }).click();
    await expect(page.getByText("R$ ••••").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("R$ ••••")).toHaveCount(0);
    await expect(page.getByText(/R\$\s*10,00/).first()).toBeVisible();

    await withMobile(page, async () => {
      await expect(page.getByRole("button", { name: "Nós" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    await bia.close();
  });

  test("M11 four views, desktop and mobile nav", async ({ page, browser }) => {
    const { bia } = await onboardCouple(page, browser);
    await addAccount(page);
    await nav(page, "desktop").getByRole("link", { name: "Visão geral" }).click();
    await setMonth(page, "2026-09");
    await addExpense(page, "Farmácia", "2026-09-02");

    const views = [
      { name: "Visão geral", heading: "Visão geral", view: undefined },
      { name: "Transações", heading: "Transações", view: "transactions" },
      { name: "Contas", heading: "Contas", view: "accounts" },
      { name: "Metas", heading: "Metas", view: "goals" },
    ] as const;

    for (const item of views) {
      await nav(page, "desktop").getByRole("link", { name: item.name }).click();
      await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
      await expect(
        nav(page, "desktop").getByRole("link", { name: item.name }),
      ).toHaveAttribute("aria-current", "page");
      if (item.view) {
        expect(new URL(page.url()).searchParams.get("view")).toBe(item.view);
      }
    }

    await nav(page, "desktop").getByRole("link", { name: "Visão geral" }).click();
    await expect(page.getByRole("region", { name: "Resumo mensal" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Gráficos de despesas do mês" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Histórico financeiro" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ver todas/ })).toBeVisible();

    await nav(page, "desktop").getByRole("link", { name: "Metas" }).click();
    await expect(
      page.getByText("Despesas essenciais do dia a dia."),
    ).toBeVisible();
    await expect(page.getByText("Lazer e experiências.")).toBeVisible();
    await expect(page.getByText("Conforto e bem-estar.")).toBeVisible();
    await expect(page.getByText("Objetivos de curto e longo prazo.")).toBeVisible();
    await expect(page.getByText("Cursos e desenvolvimento.")).toBeVisible();
    await expect(page.getByText("Reserva e investimentos.")).toBeVisible();
    await page.getByRole("button", { name: "Nós" }).click();
    await expect(
      page.getByRole("button", { name: "Editar meus percentuais" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Eu" }).click();
    await expect(
      page.getByRole("button", { name: "Editar meus percentuais" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Bia" }).click();
    await expect(
      page.getByRole("button", { name: "Editar meus percentuais" }),
    ).toBeHidden();

    await nav(page, "desktop").getByRole("link", { name: "Contas" }).click();
    await expect(page.getByLabel("Selecionar mês e ano")).toHaveCount(0);

    await withMobile(page, async () => {
      await expect(nav(page, "desktop")).toBeHidden();
      await expect(nav(page, "mobile")).toBeVisible();
      for (const item of views) {
        await nav(page, "mobile").getByRole("link", { name: item.name }).click();
        await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
        await expect(
          nav(page, "mobile").getByRole("link", { name: item.name }),
        ).toHaveAttribute("aria-current", "page");
      }
      const padding = await page.locator("#main-content").evaluate((el) =>
        getComputedStyle(el).paddingBottom,
      );
      expect(Number.parseFloat(padding)).toBeGreaterThanOrEqual(68);
      await expectNoHorizontalOverflow(page);
    });

    await bia.close();
  });
});
