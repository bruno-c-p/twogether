import { expect, test, type Page } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectToast,
  nav,
  onboard,
  openView,
  reloadApp,
  withMobile,
} from "../fixtures/app";

async function addNubank(page: Page) {
  await openView(page, "Contas");
  await page.getByRole("button", { name: "Adicionar primeira conta" }).click();
  await page.getByLabel("Nome da conta").fill("Nubank");
  await page.getByLabel("Saldo inicial").fill("1.250,00");
  await page.getByRole("button", { name: "Adicionar conta" }).click();
  await expectToast(page, "Conta adicionada.");
  await openView(page, "Visão geral");
}

test.describe("phrase", () => {
  test("a sentence opens the confirm sheet and saves the transaction", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await addNubank(page);

    await page
      .getByRole("textbox", { name: "Registrar com uma frase" })
      .fill("Gastei 300 reais de condomínio");
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    const sheet = page.getByRole("dialog", { name: "Registrar transação" });
    await expect(sheet.getByLabel("Valor")).toHaveValue("300,00");
    await expect(sheet.getByLabel("Descrição")).toHaveValue("Condomínio");
    await expect(
      sheet.getByRole("button", { name: "Custo fixo", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(sheet.getByRole("status")).not.toBeEmpty();
    await sheet.getByRole("button", { name: "Confirmar R$ 300,00" }).click();
    await expectToast(page, "Transação adicionada.");
    await expect(sheet).toHaveCount(0);

    await openView(page, "Transações");
    await reloadApp(page);
    await expect(
      page.getByRole("button", { name: "Condomínio", exact: true }),
    ).toBeVisible();
  });

  test("an expense sentence without a goal needs one before confirming", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await addNubank(page);

    await page
      .getByRole("textbox", { name: "Registrar com uma frase" })
      .fill("Gastei 42 reais de padaria");
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    const sheet = page.getByRole("dialog", { name: "Registrar transação" });
    const confirm = sheet.getByRole("button", { name: "Confirmar R$ 42,00" });
    await expect(sheet.getByLabel("Descrição")).toHaveValue("Padaria");
    await expect(
      sheet.getByRole("button", { name: "Custo fixo", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(confirm).toBeDisabled();

    await sheet
      .getByRole("button", { name: "Custo fixo", exact: true })
      .click();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expectToast(page, "Transação adicionada.");
  });

  test("a sentence without a value shows guidance", async ({ page }) => {
    await onboard(page, "Ana");
    await addNubank(page);

    await page
      .getByRole("textbox", { name: "Registrar com uma frase" })
      .fill("comprei pão");
    await page.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Não encontrei o valor",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await withMobile(page, async () => {
      await expectNoHorizontalOverflow(page);
    });
  });

  test("the mobile button registers by sentence or falls back to the manual form", async ({
    page,
  }) => {
    await onboard(page, "Ana");
    await addNubank(page);

    await withMobile(page, async () => {
      const fab = nav(page, "mobile").getByRole("button", {
        name: "Registrar transação",
      });

      await fab.click();

      const sheet = page.getByRole("dialog", { name: "Registrar transação" });
      await expect(sheet).toBeVisible();
      await sheet
        .getByRole("textbox", { name: "Descreva o que aconteceu" })
        .fill("Gastei 300 reais de condomínio");
      await sheet.getByRole("button", { name: "Enviar frase" }).click();
      await expect(sheet.getByLabel("Valor")).toHaveValue("300,00");
      await expectNoHorizontalOverflow(page);
      await sheet.getByRole("button", { name: "Confirmar R$ 300,00" }).click();
      await expectToast(page, "Transação adicionada.");
      await expect(sheet).toHaveCount(0);

      await nav(page, "mobile")
        .getByRole("link", { name: "Transações" })
        .click();
      await expect(
        page.getByRole("button", { name: "Condomínio", exact: true }),
      ).toBeVisible();

      await fab.click();
      await page.getByRole("button", { name: "Preencher manualmente" }).click();
      await expect(
        page.getByRole("dialog", { name: "Nova transação" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
});
