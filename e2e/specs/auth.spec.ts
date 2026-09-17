import { expect, test } from "@playwright/test";
import {
  commandBus,
  createHousehold,
  loginDev,
  onboard,
  openCouple,
  sessionCookie,
  setName,
  uniqueEmail,
  waitForGate,
  waitForHydrated,
  withMobile,
  expectNoHorizontalOverflow,
} from "../fixtures/app";
import { randomToken, seedMagicLink } from "../fixtures/sqlite";

test.describe("auth", () => {
  test("M1 cold load shows the gate and private cache headers", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toContain("private, no-store");
    await waitForGate(page);
    expect(new URL(page.url()).pathname).toBe("/entrar");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page).toHaveTitle("twogether — Orçamento a dois");
    await expect(page.getByText("DUAS PESSOAS. UM ORÇAMENTO.")).toBeVisible();
    await expect(page.getByLabel("Seu e-mail")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar localmente" }),
    ).toBeVisible();
    await expect(
      page.getByText("Modo desenvolvimento: o acesso local não envia e-mail."),
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "Aparência" })).toBeVisible();
    await expect(page.locator("footer").getByText("twogether.")).toBeVisible();
    await expect(page.getByText("Orçamento a dois, com leveza.")).toBeVisible();
    expect(urls.some((url) => url.includes(commandBus))).toBe(false);

    await withMobile(page, async () => {
      await expect(page.getByLabel("Seu e-mail")).toBeEnabled();
      await expect(
        page.getByRole("group", { name: "Aparência" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Tema escuro" }),
      ).toBeEnabled();
      await expectNoHorizontalOverflow(page);
    });
  });

  test("M2 dev-login names the person and creates a household", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    const email = uniqueEmail("ana");
    await loginDev(page, email);
    await expect(
      page.getByRole("heading", { name: "Como chamamos você?" }),
    ).toBeVisible();
    await setName(page, "Ana");
    await createHousehold(page);
    await expect(
      page.getByRole("heading", { name: "Visão geral" }),
    ).toBeVisible();
    await expect(
      page.getByText("Saldo, entradas, despesas e metas do mês."),
    ).toBeVisible();
    await expect(page.locator("header").getByText("Visão geral")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nós", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Eu", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir nosso espaço: 1 pessoa" }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.has("access")).toBe(false);
    const cookie = await sessionCookie(page);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    await expect(
      page.getByText("Nenhuma entrada registrada neste mês."),
    ).toBeVisible();
    await expect(page.getByText("Nenhuma transação neste mês.")).toBeVisible();
    await expect(page.getByText("30%").first()).toBeVisible();
    expect(urls.some((url) => url.includes(commandBus))).toBe(false);
    expect(
      urls.some((url) => url.includes("_serverFn") || url.includes("serverFn")),
    ).toBe(true);
    expect(new URL(page.url()).searchParams.get("month")).toMatch(
      /^\d{4}-(0[1-9]|1[0-2])$/,
    );
    await expect(page.getByLabel("Selecionar mês e ano")).toHaveValue(
      new URL(page.url()).searchParams.get("month") ?? "",
    );
  });

  test("M3 magic-link consume strips access and keeps convite", async ({
    page,
  }) => {
    const convite = randomToken();
    await page.goto(`/?convite=${convite}`);
    await waitForGate(page);
    expect(new URL(page.url()).pathname).toBe("/entrar");
    expect(new URL(page.url()).searchParams.get("convite")).toBe(convite);
    await expect(page.getByText("Seu par convidou você")).toBeVisible();

    const email = uniqueEmail("bia");
    const token = await seedMagicLink(email);
    await page.goto(`/?access=${token}&convite=${convite}`);
    await waitForHydrated(page);
    await expect(
      page.getByRole("heading", { name: "Como chamamos você?" }),
    ).toBeVisible();
    const after = new URL(page.url());
    expect(after.pathname).toBe("/entrar");
    expect(after.searchParams.has("access")).toBe(false);
    expect(after.searchParams.get("convite")).toBe(convite);
    const cookie = await sessionCookie(page);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    await setName(page, "Bia");
    await expect(
      page.getByText("Ao aceitar, vocês dois poderão ver"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aceitar convite" }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("convite")).toBe(convite);

    const expired = await seedMagicLink(
      uniqueEmail("expired"),
      Date.now() - 60_000,
    );
    const guest = await page.context().browser()?.newContext();
    if (!guest) throw new Error("browser missing");
    const expiredPage = await guest.newPage();
    await expiredPage.goto(`/?access=${expired}`);
    await waitForGate(expiredPage);
    expect(new URL(expiredPage.url()).searchParams.has("access")).toBe(false);
    const expiredCookie = await sessionCookie(expiredPage);
    expect(expiredCookie?.value ?? "").toBeFalsy();
    await guest.close();
  });

  test("M12 logout clears the session from the workspace and the gate", async ({
    page,
  }) => {
    const email = uniqueEmail("logout");
    await loginDev(page, email);
    await setName(page, "Ana");
    await page.getByRole("button", { name: `Sair de ${email}` }).click();
    await waitForGate(page);
    expect((await sessionCookie(page))?.value ?? "").toBeFalsy();

    await onboard(page, "Ana", email);
    await openCouple(page);
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await waitForGate(page);
    expect((await sessionCookie(page))?.value ?? "").toBeFalsy();
  });
});
