import { expect, test, type Page } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectToast,
  nav,
  onboard,
  openNewTransaction,
  openView,
  setMonth,
  waitForGate,
  reloadApp,
  withMobile,
  monthText,
  monthTrigger,
  monthSummary,
} from "../fixtures/app";

async function seedMoney(page: Page) {
  await onboard(page, "Ana");
  await setMonth(page, "2026-09");
  const dialog = await openNewTransaction(page);
  await dialog.getByRole("button", { name: "Receita" }).click();
  await dialog.getByLabel("Valor").fill("5000,00");
  await dialog.getByLabel("Descrição").fill("Salário");
  await dialog.getByLabel("Data").fill("2026-09-01");
  await dialog.getByRole("button", { name: "Adicionar transação" }).click();
  await expectToast(page, "Transação adicionada.");
  await openNewTransaction(page);
  const expense = page.getByRole("dialog", { name: "Nova transação" });
  await expense.getByRole("button", { name: "Despesa" }).click();
  await expense.getByLabel("Valor").fill("45,90");
  await expense.getByLabel("Descrição").fill("Mercado");
  await expense.getByLabel("Data").fill("2026-09-14");
  await expense
    .getByRole("button", { name: "Custo fixo", exact: true })
    .click();
  await expense.getByRole("button", { name: "Adicionar transação" }).click();
  await expectToast(page, "Transação adicionada.");
  await openView(page, "Visão geral");
}

test.describe("chrome", () => {
  test("M9 hide values masks money until shown again", async ({ page }) => {
    await seedMoney(page);
    await page.getByRole("button", { name: "Ocultar valores" }).click();
    await expect(monthSummary(page)).toContainText("R$ ••••");

    await openView(page, "Orçamento");

    const barWidth = await page
      .getByRole("link", { name: /Custo fixo:/ })
      .evaluate((card) => {
        const fill = [...card.querySelectorAll("span")].find((span) =>
          span.getAttribute("style")?.includes("width"),
        );

        return fill?.style.width ?? "";
      });

    expect(barWidth).toBe("0%");
    expect(new URL(page.url()).search).not.toMatch(/hidden/);
    await openView(page, "Visão geral");

    await page.getByRole("button", { name: "Mostrar valores" }).click();
    await expect(monthSummary(page)).toContainText(/R\$\s*4\.954,10/);
    await expect(page.getByText("R$ ••••")).toHaveCount(0);

    await withMobile(page, async () => {
      await expect(
        page.getByRole("button", { name: "Ocultar valores" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Ocultar valores" }).click();
      await expect(monthSummary(page)).toContainText("R$ ••••");
      await expectNoHorizontalOverflow(page);
    });
  });

  test("M10 theme persists on the gate and workspace", async ({ page }) => {
    await page.goto("/");
    await waitForGate(page);
    await expect(page.getByRole("group", { name: "Aparência" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-preference",
      "system",
    );

    await page.getByRole("button", { name: "Tema escuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-preference",
      "dark",
    );
    expect(
      await page.evaluate(() => localStorage.getItem("twogether.theme.v1")),
    ).toBe("dark");
    await reloadApp(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Tema claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await reloadApp(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page.evaluate(() => localStorage.getItem("twogether.theme.v1")),
    ).toBe("light");

    await page.getByRole("button", { name: "Tema sistema" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-preference",
      "system",
    );

    const readable = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const text = styles.getPropertyValue("--text").trim();
      const surface = styles.getPropertyValue("--surface").trim();

      return { text, surface, body: getComputedStyle(document.body).color };
    });

    expect(readable.text).toBeTruthy();
    expect(readable.surface).toBeTruthy();
    expect(readable.text).not.toBe(readable.surface);
    expect(readable.body).toBeTruthy();

    await onboard(page, "Ana");
    await expect(page.getByRole("group", { name: "Aparência" })).toBeHidden();

    await withMobile(page, async () => {
      await nav(page, "mobile").getByRole("button", { name: "Conta" }).click();
      await expect(
        page.getByRole("group", { name: "Aparência" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Tema escuro" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(
        page.getByRole("button", { name: "Tema escuro" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Tema claro" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Tema sistema" }),
      ).toBeEnabled();
    });
  });

  test("M13 month default follows the browser time zone", async ({ page }) => {
    await onboard(page, "Ana");
    await expect(
      page.getByRole("heading", { name: "Visão geral" }),
    ).toBeVisible();

    const stored = (await page.context().cookies()).find(
      (cookie) => cookie.name === "twogether.tz.v1",
    );

    expect(decodeURIComponent(stored?.value ?? "")).toBe("America/Sao_Paulo");

    const browserMonth = await page.evaluate(() => {
      const now = new Date();

      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    await page.context().clearCookies({ name: "twogether.tz.v1" });
    await page.goto("/");
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
    expect(new URL(page.url()).searchParams.get("month")).toBe(browserMonth);
    await expect(monthTrigger(page)).toHaveAccessibleName(
      `Selecionar mês e ano: ${monthText(browserMonth)}`,
    );

    await expect
      .poll(async () =>
        (await page.context().cookies()).some(
          (cookie) => cookie.name === "twogether.tz.v1",
        ),
      )
      .toBe(true);

    const redirected = await page.context().request.get("/", {
      maxRedirects: 0,
    });

    expect(redirected.status()).toBe(307);
    expect(redirected.headers()["location"] ?? "").toContain(
      `month=${browserMonth}`,
    );

    await page.context().clearCookies({ name: "twogether.tz.v1" });
    const fallback = await page.context().request.get("/", { maxRedirects: 0 });
    expect(fallback.status()).toBe(200);
    expect(await fallback.text()).toContain("Carregando orçamento…");

    const oldMonth = "2026-01";
    const serverHtml = await page.context().request.get(`/?month=${oldMonth}`);
    expect(await serverHtml.text()).not.toContain("Voltar para este mês");
    await page.goto(`/?month=${oldMonth}`);
    await monthTrigger(page).click();
    await expect(
      page.getByRole("button", { name: "Voltar para este mês" }),
    ).toBeVisible();
  });

  test("header shows the brand once on desktop and mobile", async ({
    page,
  }) => {
    await onboard(page, "Ana");

    const brand = page.getByRole("link", { name: "twogether — início" });

    await expect(brand).toHaveCount(1);
    await expect(brand).toContainText("twogether.");
    await expect(brand).toBeVisible();
    await expect(nav(page, "desktop")).toBeVisible();

    await withMobile(page, async () => {
      await expect(brand).toHaveCount(1);
      await expect(brand).toBeVisible();
      await expect(nav(page, "desktop")).toBeHidden();
      await expect(nav(page, "mobile")).toBeVisible();

      const clearance = await nav(page, "mobile").evaluate((element) => {
        const controls = [...element.querySelectorAll("a, button")];

        const lowest = Math.max(
          ...controls.map((control) => control.getBoundingClientRect().bottom),
        );

        return Math.round(window.innerHeight - lowest);
      });

      expect(clearance).toBeGreaterThanOrEqual(20);
    });
  });
});
