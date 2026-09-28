import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  expectToast,
  nav,
  onboard,
  openCouple,
  person,
  reloadApp,
  setMonth,
  setName,
  signInClerk,
  uniqueEmail,
} from "../fixtures/app";

async function addAccount(page: Page, name: string, first: boolean) {
  await nav(page, "desktop").getByRole("link", { name: "Contas" }).click();
  await page
    .getByRole("button", {
      name: first ? "Adicionar primeira conta" : "Nova conta",
    })
    .click();
  await page.getByLabel("Nome da conta").fill(name);
  await page.getByLabel("Saldo inicial").fill("0,00");
  await page.getByRole("button", { name: "Adicionar conta" }).click();
  await expectToast(page, "Conta adicionada.");
}

async function joinPartner(page: Page, browser: Browser) {
  await openCouple(page);
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const invite = page.getByLabel("Link para seu par");
  await expect(invite).toHaveValue(/\/convite\/[0-9a-f]{64}$/);
  const inviteUrl = await invite.inputValue();
  await page.getByRole("link", { name: "twogether — início" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
  const context = await browser.newContext();
  const partner = await context.newPage();
  await partner.goto(inviteUrl);
  await signInClerk(partner, uniqueEmail("bia"));
  await setName(partner, "Bia");
  await partner.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(
    partner.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();

  return { context, partner };
}

function debtCard(page: Page) {
  return page.getByRole("region", { name: /Despesas divididas/ });
}

test.describe("split expenses", () => {
  test("M15 partner settles a split rent with repayment entries", async ({
    page,
    browser,
  }) => {
    await onboard(page, "Ana");
    await addAccount(page, "Nubank", true);
    await addAccount(page, "Itaú", false);
    await nav(page, "desktop")
      .getByRole("link", { name: "Visão geral" })
      .click();
    const { context, partner } = await joinPartner(page, browser);
    await reloadApp(page);
    await setMonth(page, "2026-09");

    await page.getByRole("button", { name: "Nova transação" }).click();
    const dialog = page.getByRole("dialog", { name: "Nova transação" });
    await dialog.getByLabel("Valor").fill("2000,00");
    await dialog.getByLabel("Descrição").fill("Aluguel");
    await dialog.getByLabel("Data").fill("2026-09-05");
    await dialog.getByLabel("Conta").selectOption({ label: "Nubank" });
    await dialog
      .getByRole("button", { name: "Custo fixo", exact: true })
      .click();
    await dialog.getByRole("switch", { name: /Dividir com Bia/ }).check();
    await expect(
      dialog.getByText("Bia deve R$ 1.000,00 a você."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Adicionar transação" }).click();
    await expectToast(page, "Transação adicionada.");

    await expect(
      debtCard(page).getByText("Bia te deve R$ 1.000,00"),
    ).toBeVisible();
    await expect(debtCard(page).getByText("Aguardando Bia")).toBeVisible();
    await expect(
      debtCard(page).getByRole("button", { name: "Marcar como pago" }),
    ).toHaveCount(0);
    await expect(page.getByText("Dividida · a receber").first()).toBeVisible();

    await reloadApp(partner);
    await setMonth(partner, "2026-09");
    const card = debtCard(partner);
    await expect(card.getByText("Você deve R$ 1.000,00 a Ana")).toBeVisible();
    await card.getByRole("button", { name: "Marcar como pago" }).click();
    const settle = partner.getByRole("dialog", { name: "Marcar como pago" });
    await settle.getByLabel("Data do pagamento").fill("2026-09-10");
    await settle
      .getByLabel("Conta de onde você pagou")
      .selectOption({ label: "Itaú" });
    await settle
      .getByLabel("Conta onde Ana recebeu")
      .selectOption({ label: "Nubank" });
    await settle.getByRole("button", { name: "Confirmar pagamento" }).click();
    await expectToast(partner, "Pagamento registrado.");
    await expect(card.getByText("Nada pendente entre vocês")).toBeVisible();

    await reloadApp(partner);
    await expect(partner.getByText("Nosso saldo do mês")).toBeVisible();
    await expect(
      partner.getByText(/-\s?R\$\s*2\.000,00/).first(),
    ).toBeVisible();
    await expect(
      partner.getByRole("button", { name: "Reembolso: Aluguel", exact: true }),
    ).toHaveCount(0);
    await person(partner, "Eu").click();
    await expect(
      partner.getByRole("button", { name: "Aluguel (sua parte)", exact: true }),
    ).toBeVisible();
    await expect(
      partner.getByText(/-\s?R\$\s*1\.000,00/).first(),
    ).toBeVisible();

    await reloadApp(page);
    await person(page, "Eu").click();
    await expect(
      page.getByRole("button", { name: "Reembolso: Aluguel", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Editar Reembolso: Aluguel/ }),
    ).toBeDisabled();
    await expect(page.getByText("Dividida · paga").first()).toBeVisible();

    await person(partner, "Nós").click();
    await partner.getByRole("button", { name: "Aluguel", exact: true }).click();
    const edit = partner.getByRole("dialog", { name: "Editar transação" });
    await expect(edit.getByText(/Pago por você em/)).toBeVisible();
    await edit.getByRole("button", { name: "Desmarcar pagamento" }).click();
    await expectToast(partner, "Pagamento desmarcado.");
    await reloadApp(partner);
    await expect(card.getByText("Você deve R$ 1.000,00 a Ana")).toBeVisible();
    await person(partner, "Eu").click();
    await expect(
      partner.getByRole("button", { name: "Aluguel (sua parte)", exact: true }),
    ).toHaveCount(0);

    await context.close();
  });
});
