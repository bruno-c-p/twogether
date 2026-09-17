import { expect, test, type Page } from "@playwright/test";
import {
  expectToast,
  nav,
  onboard,
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
    await expect(dialog.getByRole("heading", { name: "Nova transação" })).toBeVisible();
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
    await expense.getByRole("button", { name: "Custo fixo", exact: true }).click();
    await expense.getByPlaceholder("Digite uma tag e pressione Enter").fill("casa");
    await expense.getByPlaceholder("Digite uma tag e pressione Enter").press("Enter");
    await expense.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    await expect(page.getByText("Nosso saldo do mês")).toBeVisible();
    await expect(page.getByText(/R\$\s*4\.954,10/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Salário" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mercado" })).toBeVisible();
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
      await expect(page.getByRole("dialog", { name: "Nova transação" })).toBeVisible();
      await page.locator("dialog").click({ position: { x: 4, y: 4 } });
      await expect(page.getByRole("dialog", { name: "Nova transação" })).toHaveCount(
        0,
      );
    });
  });
});
