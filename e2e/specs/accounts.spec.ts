import { expect, test } from "@playwright/test";
import {
  dismissToast,
  expectNoHorizontalOverflow,
  expectToast,
  nav,
  onboard,
  withMobile,
} from "../fixtures/app";

test.describe("accounts", () => {
  test("M6 cannot launch a transação without a conta", async ({ page }) => {
    await onboard(page, "Ana");
    await nav(page, "desktop")
      .getByRole("link", { name: "Transações" })
      .click();
    await page.getByRole("button", { name: "Nova transação" }).click();
    await expectToast(page, "Cadastre uma conta para lançar transações.");
    expect(new URL(page.url()).searchParams.get("view")).toBe("accounts");
    await expect(
      page.getByRole("heading", { name: "Nova transação" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Contas", exact: true }),
    ).toBeVisible();
  });

  test("M5 empty contas create a Nubank row", async ({ page }) => {
    await onboard(page, "Ana");
    await nav(page, "desktop").getByRole("link", { name: "Contas" }).click();
    await expect(
      page.getByRole("heading", { name: "Contas", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Selecionar mês e ano")).toBeVisible();
    await expect(
      page.getByText("Inclui as transações do casal.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("Nenhuma conta cadastrada.")).toBeVisible();
    await page
      .getByRole("button", { name: "Adicionar primeira conta" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Nova conta" }),
    ).toBeVisible();
    await page.getByLabel("Nome da conta").fill("Nubank");
    await page.getByLabel("Saldo inicial").fill("1.250,00");
    await page.getByRole("button", { name: "Adicionar conta" }).click();
    await expectToast(page, "Conta adicionada.");
    await expect(
      page.getByRole("heading", { name: "Nubank", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Total nas contas")).toBeVisible();
    await expect(page.getByText(/R\$\s*1\.250,00/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editar Nubank" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nova conta" })).toHaveCount(
      0,
    );

    await withMobile(page, async () => {
      await dismissToast(page);
      await expect(
        page.getByRole("button", { name: "Nova conta" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Nubank", exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/R\$\s*1\.250,00/).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
});
