import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  onboard,
  openCouple,
  signInClerk,
  setName,
  uniqueEmail,
  withMobile,
  reloadApp,
  expectPersonOptions,
} from "../fixtures/app";

test.describe("household", () => {
  test("M4 invite brings a second person into Nosso espaço", async ({
    page,
    browser,
  }) => {
    await onboard(page, "Ana");
    await openCouple(page);
    await expect(
      page.getByText("Tudo aqui é dos dois. Ambos podem ver e editar"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Gerar convite" }).click();
    const invite = page.getByLabel("Link para seu par");
    await expect(invite).toHaveValue(/\/convite\/[0-9a-f]{64}$/);
    await expect(page.getByText("Expira em 48 horas")).toBeVisible();
    await page.getByRole("button", { name: "Copiar convite" }).click();
    const copied = page.getByRole("button", { name: "Link copiado" });
    const fallback = page.getByText("Selecione e copie o link acima.");
    await expect(copied.or(fallback)).toBeVisible();
    const inviteUrl = await invite.inputValue();
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Visão geral" }),
    ).toBeVisible();

    const bia = await browser.newContext();
    const biaPage = await bia.newPage();
    await biaPage.goto(inviteUrl);
    await signInClerk(biaPage, uniqueEmail("bia"));
    await setName(biaPage, "Bia");
    await expect(
      biaPage.getByText(
        "Ao aceitar, vocês dois poderão ver e editar todo o orçamento.",
      ),
    ).toBeVisible();
    await biaPage.getByRole("button", { name: "Aceitar convite" }).click();
    await expect(
      biaPage.getByRole("heading", { name: "Visão geral" }),
    ).toBeVisible();
    expect(new URL(biaPage.url()).pathname).toBe("/");
    await expect(
      biaPage.getByRole("button", { name: "Abrir nosso espaço: 2 pessoas" }),
    ).toBeVisible();
    await expectPersonOptions(biaPage, ["Nós", "Eu", "Ana"]);

    await reloadApp(page);
    await expect(
      page.getByRole("button", { name: "Abrir nosso espaço: 2 pessoas" }),
    ).toBeVisible();
    await expectPersonOptions(page, ["Nós", "Eu", "Bia"]);
    await openCouple(page);
    await expect(
      page.getByText("Vocês dois já estão aqui. O espaço está completo."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gerar convite" }),
    ).toHaveCount(0);

    await withMobile(page, async () => {
      await expect(
        page.getByRole("heading", { name: "Nosso espaço" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Gerar convite" }),
      ).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    });

    await bia.close();
  });
});
