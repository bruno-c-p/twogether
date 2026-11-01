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
  await dialog.getByLabel("Data").fill("2026-09-14");
  await dialog
    .getByRole("button", { name: "Transferência", exact: true })
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
    .getByRole("group", { name: "Tipo da transação" });

  // Rect widths, unlike the integer scrollWidth, see sub-pixel overflow.
  for (const width of [mobile.width, 360, 619, 620, 768]) {
    await page.setViewportSize({ ...mobile, width });

    const headroom = await kinds.evaluate((group) => {
      const px = (element: Element, ...properties: string[]) => {
        const style = getComputedStyle(element);

        return properties.reduce(
          (sum, property) => sum + parseFloat(style.getPropertyValue(property)),
          0,
        );
      };

      const buttons = [...group.querySelectorAll("button")];

      const needed = buttons.reduce(
        (sum, button) => {
          const content = document.createRange();

          content.selectNodeContents(button);

          return (
            sum +
            content.getBoundingClientRect().width +
            px(button, "padding-left", "padding-right")
          );
        },
        px(group, "column-gap") * (buttons.length - 1),
      );

      const inner =
        group.getBoundingClientRect().width -
        px(
          group,
          "padding-left",
          "padding-right",
          "border-left-width",
          "border-right-width",
        );

      return inner - needed;
    });

    expect(headroom, `kind toggle headroom at ${width}px`).toBeGreaterThan(0);
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
