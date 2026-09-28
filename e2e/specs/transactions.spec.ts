import { expect, test, type Page } from "@playwright/test";
import {
  expectToast,
  nav,
  onboard,
  reloadApp,
  setMonth,
  withMobile,
} from "../fixtures/app";

async function addNubank(page: Page) {
  await nav(page, "desktop").getByRole("link", { name: "Contas" }).click();
  await page.getByRole("button", { name: "Adicionar primeira conta" }).click();
  await page.getByLabel("Nome da conta").fill("Nubank");
  await page.getByLabel("Saldo inicial").fill("1.250,00");
  await page.getByRole("button", { name: "Adicionar conta" }).click();
  await expectToast(page, "Conta adicionada.");
  await nav(page, "desktop").getByRole("link", { name: "Visão geral" }).click();
}

test.describe("transactions", () => {
  test("M7 receita and despesa land on the month overview", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await addNubank(page);
    await setMonth(page, "2026-09");

    await page.getByRole("button", { name: "Nova transação" }).click();
    const dialog = page.getByRole("dialog", { name: "Nova transação" });
    await expect(
      dialog.getByRole("heading", { name: "Nova transação" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Receita" }).click();
    await dialog.getByLabel("Valor").fill("5000,00");
    await dialog.getByLabel("Descrição").fill("Salário");
    await dialog.getByLabel("Data").fill("2026-09-01");
    await dialog.getByLabel("Conta").selectOption({ label: "Nubank" });
    await expect(dialog.getByText("Para qual meta?")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    await page.getByRole("button", { name: "Nova transação" }).click();
    const expense = page.getByRole("dialog", { name: "Nova transação" });
    await expense.getByRole("button", { name: "Despesa" }).click();
    await expense.getByLabel("Valor").fill("45,90");
    await expense.getByLabel("Descrição").fill("Mercado");
    await expense.getByLabel("Data").fill("2026-09-14");
    await expense.getByLabel("Conta").selectOption({ label: "Nubank" });
    await expense
      .getByRole("button", { name: "Custo fixo", exact: true })
      .click();
    await expense
      .getByPlaceholder("Digite uma tag e pressione Enter")
      .fill("casa");
    await expense
      .getByPlaceholder("Digite uma tag e pressione Enter")
      .press("Enter");
    await expense.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    await expect(page.getByText("Nosso saldo do mês")).toBeVisible();
    await expect(page.getByText(/R\$\s*4\.954,10/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Salário", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mercado", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Ana · Nubank").first()).toBeVisible();
    await expect(page.getByText("Custo fixo").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "#casa" })).toBeVisible();
    await expect(page.getByText(/R\$\s*4\.954,10/).first()).toBeVisible();

    await withMobile(page, async () => {
      await page.getByRole("button", { name: "Nova transação" }).click();
      const mobileDialog = page.getByRole("dialog", { name: "Nova transação" });
      await expect(mobileDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(mobileDialog).toHaveCount(0);

      await page.getByRole("button", { name: "Nova transação" }).click();
      await expect(
        page.getByRole("dialog", { name: "Nova transação" }),
      ).toBeVisible();
      const box = await page.locator("dialog").boundingBox();
      await page.mouse.click(
        Math.max(2, (box?.x ?? 16) - 8),
        (box?.y ?? 80) + 24,
      );
      await expect(
        page.getByRole("dialog", { name: "Nova transação" }),
      ).toHaveCount(0);
    });
  });

  test("monthly recurrence lands on three months and deletes from an occurrence onward", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await addNubank(page);
    await setMonth(page, "2026-09");

    await page.getByRole("button", { name: "Nova transação" }).click();
    const dialog = page.getByRole("dialog", { name: "Nova transação" });
    await dialog.getByRole("button", { name: "Despesa" }).click();
    await dialog.getByLabel("Valor").fill("100,00");
    await dialog.getByLabel("Descrição").fill("Aluguel");
    await dialog.getByLabel("Data").fill("2026-09-14");
    await dialog.getByLabel("Conta").selectOption({ label: "Nubank" });
    await dialog
      .getByRole("button", { name: "Custo fixo", exact: true })
      .click();
    await dialog.getByLabel("Repetir mensalmente").check();
    await dialog.getByLabel("Por quantos meses?").fill("3");
    await dialog.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "3 transações mensais adicionadas.");
    await reloadApp(page);
    await setMonth(page, "2026-09");

    const summary = page.getByRole("region", { name: "Resumo mensal" });
    await expect(summary.getByText(/-R\$\s*100,00/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aluguel", exact: true }),
    ).toBeVisible();
    await expect(page.locator("time[datetime='2026-09-14']")).toBeVisible();

    await setMonth(page, "2026-10");
    await expect(
      page.getByRole("button", { name: "Aluguel", exact: true }),
    ).toBeVisible();
    await expect(page.locator("time[datetime='2026-10-14']")).toBeVisible();
    await expect(summary.getByText(/-R\$\s*100,00/)).toBeVisible();

    await setMonth(page, "2026-11");
    await expect(
      page.getByRole("button", { name: "Aluguel", exact: true }),
    ).toBeVisible();
    await expect(page.locator("time[datetime='2026-11-14']")).toBeVisible();

    await setMonth(page, "2026-10");
    await page.getByRole("button", { name: "Excluir Aluguel" }).click();
    const remove = page.getByRole("dialog", { name: "Excluir transação" });
    await expect(remove.getByText("Aluguel")).toBeVisible();
    await remove.getByRole("radio", { name: /Esta e as seguintes/ }).check();
    await expect(
      remove.getByText("Esta exclusão não pode ser desfeita."),
    ).toBeVisible();
    await remove.getByRole("button", { name: "Excluir 2 transações" }).click();
    await expectToast(page, "2 transações excluídas.");

    await expect(
      page.getByRole("button", { name: "Aluguel", exact: true }),
    ).toHaveCount(0);
    await setMonth(page, "2026-11");
    await expect(
      page.getByRole("button", { name: "Aluguel", exact: true }),
    ).toHaveCount(0);
    await setMonth(page, "2026-09");
    await expect(
      page.getByRole("button", { name: "Aluguel", exact: true }),
    ).toBeVisible();
    await expect(summary.getByText(/-R\$\s*100,00/)).toBeVisible();
  });

  test("delete and undo restore the month balance to the cent", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await addNubank(page);
    await setMonth(page, "2026-09");

    await page.getByRole("button", { name: "Nova transação" }).click();
    const income = page.getByRole("dialog", { name: "Nova transação" });
    await income.getByRole("button", { name: "Receita" }).click();
    await income.getByLabel("Valor").fill("200,00");
    await income.getByLabel("Descrição").fill("Salário");
    await income.getByLabel("Data").fill("2026-09-01");
    await income.getByLabel("Conta").selectOption({ label: "Nubank" });
    await income.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    await page.getByRole("button", { name: "Nova transação" }).click();
    const expense = page.getByRole("dialog", { name: "Nova transação" });
    await expense.getByRole("button", { name: "Despesa" }).click();
    await expense.getByLabel("Valor").fill("45,90");
    await expense.getByLabel("Descrição").fill("Mercado");
    await expense.getByLabel("Data").fill("2026-09-14");
    await expense.getByLabel("Conta").selectOption({ label: "Nubank" });
    await expense
      .getByRole("button", { name: "Custo fixo", exact: true })
      .click();
    await expense.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    const summary = page.getByRole("region", { name: "Resumo mensal" });
    await expect(summary.locator('[class*="balanceAmount"]')).toHaveText(
      /R\$\s*154,10/,
    );
    await expect(
      page.getByRole("button", { name: "Mercado", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Excluir Mercado" }).click();

    const toast = page
      .getByRole("status")
      .filter({ hasText: "Transação excluída." });

    await expect(toast).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mercado", exact: true }),
    ).toHaveCount(0);
    await expect(summary.locator('[class*="balanceAmount"]')).toHaveText(
      /R\$\s*200,00/,
    );

    await toast.getByRole("button", { name: "Desfazer" }).click();
    await expectToast(page, "Alteração desfeita.");
    await expect(
      page.getByRole("button", { name: "Mercado", exact: true }),
    ).toBeVisible();
    await expect(summary.locator('[class*="balanceAmount"]')).toHaveText(
      /R\$\s*154,10/,
    );
  });
});
