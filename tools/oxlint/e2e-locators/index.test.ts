import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";
import plugin from "./index.ts";

RuleTester.describe = describe;

RuleTester.it = it;

new RuleTester().run(
  "no-ambiguous-locator",
  plugin.rules["no-ambiguous-locator"],
  {
    valid: [
      'list.getByRole("listitem").filter({ hasText: "Custo fixo" });',
      'page.getByRole("button", { name: "Adicionar transação" }).first();',
      'page.locator("[data-slot=toast]").getByText("Salvo");',
      'page.locator("html");',
      "row.getByText(label);",
      "page.locator(`${tag}`);",
    ],
    invalid: [
      {
        // e2e/specs/transactions.spec.ts:66 on red main before #106.
        code: 'list.locator("span").getByText("Custo fixo", { exact: true });',
        errors: [{ messageId: "bareTag" }],
      },
      {
        code: 'list.locator(`span`).getByText("Custo fixo");',
        errors: [{ messageId: "bareTag" }],
      },
      {
        code: 'summary(page).locator("p").nth(1);',
        errors: [{ messageId: "bareTag" }],
      },
      {
        code: 'page.getByText("R$ ••••").first();',
        errors: [{ messageId: "pick" }],
      },
      {
        code: "page.getByText(/R\\$/).filter({ visible: true }).nth(2);",
        errors: [{ messageId: "pick" }],
      },
      {
        code: 'region.getByText("dividida").last();',
        errors: [{ messageId: "pick" }],
      },
    ],
  },
);
