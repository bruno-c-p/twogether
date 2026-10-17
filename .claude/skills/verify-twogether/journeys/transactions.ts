// Transactions journey: add, persist, edit, filter, search, month switch,
// delete and undo, value hiding, then the responsive/theme sweep.
// Run: .claude/skills/verify-twogether/scripts/verify.ts drive "$RUN" .claude/skills/verify-twogether/journeys/transactions.ts
import type { Kit } from "../scripts/verify.ts";

export default async function transactions(kit: Kit) {
  const { page, expect, step, shot } = kit;
  const list = page.getByRole("region", { name: "Transações do mês" });
  const row = (description: string) =>
    list.getByRole("button", { name: description, exact: true });

  async function add(
    kind: "Receita" | "Despesa",
    amount: string,
    description: string,
    date: string,
  ) {
    await page.getByRole("button", { name: "Adicionar transação" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Nova transação" });

    await dialog.getByRole("button", { name: kind }).click();
    await dialog.getByLabel("Valor").fill(amount);
    await dialog.getByLabel("Descrição").fill(description);
    await dialog.getByLabel("Data").fill(date);

    if (kind === "Despesa")
      await dialog.getByRole("button", { name: "Custo fixo", exact: true }).click();
    await dialog.getByRole("button", { name: "Adicionar transação" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async function toast(message: string) {
    await expect(
      page.locator('[data-slot="toast"]').filter({ hasText: message }),
    ).toBeVisible();
  }

  step("signed-out / redirects to the gate");
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar(?:\?|$)/);
  await shot(page, "01-gate");

  step("sign in as the solo test user and create a household");
  await kit.onboard(page, "solo", "Ana");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Transações" })
    .click();
  await kit.setMonth(page, "2026-09");
  await expect(list.getByText("Nenhuma transação neste mês.")).toBeVisible();
  await kit.sweep(page, "02-empty");

  step("add Salário (receita 5000,00) and Mercado (despesa 45,90)");
  await add("Receita", "5000,00", "Salário", "2026-09-01");
  await toast("Transação adicionada.");
  await add("Despesa", "45,90", "Mercado", "2026-09-14");
  await expect(row("Salário")).toBeVisible();
  await expect(row("Mercado")).toBeVisible();
  await shot(page, "03-added");

  step("reload: both rows persist");
  await kit.reload(page);
  await expect(page).toHaveURL(/month=2026-09/);
  await expect(row("Salário")).toBeVisible();
  await expect(row("Mercado")).toBeVisible();

  step("edit Mercado to 60,00");
  await row("Mercado").click();
  const edit = page.getByRole("dialog", { name: "Editar transação" });

  await edit.getByLabel("Valor").fill("60,00");
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await toast("Transação atualizada.");
  await kit.reload(page);
  await expect(
    list.getByRole("listitem").filter({
      has: page.getByRole("button", { name: "Mercado", exact: true }),
    }),
  ).toContainText(/R\$\s*60,00/);
  await shot(page, "04-edited");

  step("filter Despesas, then search, then clear");
  await list.getByRole("button", { name: "Despesas" }).click();
  await expect(row("Mercado")).toBeVisible();
  await expect(row("Salário")).toHaveCount(0);
  await list.getByRole("button", { name: "Todas" }).click();
  await page.getByLabel("Buscar transações").fill("salá");
  await expect(row("Salário")).toBeVisible();
  await expect(row("Mercado")).toHaveCount(0);
  await shot(page, "05-search");
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(row("Mercado")).toBeVisible();

  step("month switch: 2026-10 is empty, 2026-09 keeps its rows");
  await kit.setMonth(page, "2026-10");
  await expect(page).toHaveURL(/month=2026-10/);
  await expect(list.getByText("Nenhuma transação neste mês.")).toBeVisible();
  await kit.setMonth(page, "2026-09");
  await expect(row("Salário")).toBeVisible();

  step("delete Mercado, then undo");
  await page.getByRole("button", { name: "Excluir Mercado" }).click();
  await toast("Transação excluída.");
  await expect(row("Mercado")).toHaveCount(0);
  await page
    .locator('[data-slot="toast"]')
    .filter({ hasText: "Transação excluída." })
    .getByRole("button", { name: "Desfazer" })
    .click();
  await toast("Alteração desfeita.");
  await expect(row("Mercado")).toBeVisible();

  step("overview balance is 5000,00 - 60,00 = 4.940,00");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Visão geral" })
    .click();
  const summary = page.getByRole("region", { name: "Resumo mensal" });

  await expect(summary).toContainText(/R\$\s*4\.940,00/);

  step("hide values masks money; reload shows them again");
  await page.getByRole("button", { name: "Ocultar valores" }).click();
  await expect(summary).toContainText("R$ ••••");
  await shot(page, "06-hidden");
  await kit.reload(page);
  await expect(summary).toContainText(/R\$\s*4\.940,00/);

  step("filled-state sweep: phone/tablet/desktop x light/dark");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Transações" })
    .click();
  await expect(row("Mercado")).toBeVisible();
  await kit.sweep(page, "07-filled");
}
