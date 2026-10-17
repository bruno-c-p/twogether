import { expect, test, type Page } from "@playwright/test";
import {
  desktop,
  expectToast,
  mobile,
  monthTrigger,
  nav,
  onboard,
  openNewTransaction,
  setMonth,
  uniqueEmail,
  waitForGate,
  waitForHydrated,
} from "../fixtures/app";

async function expectFits(page: Page, screen: string) {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect
    .soft(box.scrollWidth, `${screen} overflows at ${box.innerWidth}px`)
    .toBeLessThanOrEqual(box.innerWidth);
}

test("V1 key screens have no horizontal overflow at 320px", async ({
  page,
}) => {
  await page.goto("/");
  await waitForGate(page);
  await page.setViewportSize(mobile);
  await expectFits(page, "/entrar");

  await page.setViewportSize(desktop);
  await onboard(
    page,
    "Maria Aparecida dos Santos Albuquerque",
    uniqueEmail("viewport"),
  );
  await setMonth(page, "2026-09");
  const dialog = await openNewTransaction(page);
  await dialog.getByLabel("Valor").fill("123456,78");
  await dialog
    .getByLabel("Descrição")
    .fill("Supermercado Extraordinariamente Comprido Ltda Filial Centro");
  await dialog.getByLabel("Data").fill("2026-09-14");
  await dialog
    .getByRole("button", { name: "Liberdade financeira", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Adicionar transação" }).click();
  await expectToast(page, "Transação adicionada.");
  await page.setViewportSize(mobile);

  for (const [path, heading] of [
    ["/?month=2026-09", "Visão geral"],
    ["/orcamento?month=2026-09", "Orçamento"],
    ["/transacoes?month=2026-09", "Transações"],
  ] as const) {
    await page.goto(path);
    await waitForHydrated(page);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    await expectFits(page, heading);
  }

  await nav(page, "mobile")
    .getByRole("button", { name: "Registrar transação" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Nova transação" }),
  ).toBeVisible();
  await expectFits(page, "Nova transação");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await monthTrigger(page).click();
  await expect(
    page.getByRole("dialog", { name: "Escolher mês" }),
  ).toBeVisible();
  await expectFits(page, "Escolher mês");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await nav(page, "mobile").getByRole("button", { name: "Conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Nosso espaço" }),
  ).toBeVisible();
  await expectFits(page, "Nosso espaço");
});
