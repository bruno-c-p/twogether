import { expect, test } from "@playwright/test";
import {
  desktop,
  expectNoHorizontalOverflow,
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
  pickDate,
} from "../fixtures/app";

test("V1 key screens have no horizontal overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize(mobile);
  await page.goto("/conheca");
  await expectNoHorizontalOverflow(page, "/conheca");
  await page.goto("/entrar");
  await waitForGate(page);
  await expectNoHorizontalOverflow(page, "/entrar");

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
  await pickDate(dialog, "Data", "2026-09-14");
  await dialog
    .getByRole("radio", { name: "Transferência", exact: true })
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
    await expectNoHorizontalOverflow(page, heading);
  }

  await nav(page, "mobile")
    .getByRole("button", { name: "Registrar transação" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Nova transação" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "Nova transação");

  const kinds = page
    .getByRole("dialog", { name: "Nova transação" })
    .getByRole("radiogroup", { name: "Tipo da transação" });

  // The kind radios wrap instead of shrinking, so every label stays whole.
  for (const width of [mobile.width, 360, 619, 620, 768]) {
    await page.setViewportSize({ ...mobile, width });
    await expectNoHorizontalOverflow(page, `Nova transação at ${width}px`);

    expect(
      await kinds.evaluate((group) => group.scrollWidth - group.clientWidth),
      `kind radios clip at ${width}px`,
    ).toBeLessThanOrEqual(0);

    for (const name of ["Despesa", "Receita", "Transferência"])
      await expect(
        kinds.getByRole("radio", { name, exact: true }),
      ).toBeInViewport();
  }

  await page.setViewportSize(mobile);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await monthTrigger(page).click();
  await expect(
    page.getByRole("dialog", { name: "Escolher mês" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "Escolher mês");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await nav(page, "mobile").getByRole("button", { name: "Conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Nosso espaço" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "Nosso espaço");
});
