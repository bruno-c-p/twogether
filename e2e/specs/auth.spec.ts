import { expect, test } from "@playwright/test";
import {
  commandBus,
  createHousehold,
  onboard,
  openCouple,
  randomToken,
  sessionCookie,
  setName,
  signInClerk,
  uniqueEmail,
  waitForGate,
  waitForInvite,
  waitForHydrated,
  withMobile,
  expectNoHorizontalOverflow,
} from "../fixtures/app";

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
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.getByRole("group", { name: "Aparência" })).toBeVisible();
    await expect(page.locator("footer").getByText("twogether.")).toBeVisible();
    await expect(page.getByText("Orçamento a dois, com leveza.")).toBeVisible();
    expect(urls.some((url) => url.includes(commandBus))).toBe(false);

    await withMobile(page, async () => {
      await expect(page.locator('input[name="identifier"]')).toBeEnabled();
      await expect(
        page.getByRole("group", { name: "Aparência" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Tema escuro" }),
      ).toBeEnabled();
      await expectNoHorizontalOverflow(page);
    });
  });

  test("M2 clerk sign-in names the person and creates a household", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    const email = uniqueEmail("ana");
    await signInClerk(page, email);
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
      page.getByRole("link", { name: "Abrir nosso espaço: 1 pessoa" }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.has("access")).toBe(false);
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === "twogether_session")).toBe(
      false,
    );
    const cookie = await sessionCookie(page);
    expect(cookie?.value).toBeTruthy();
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

  test("M3 legacy invite links land on the invite route and survive sign-in", async ({
    page,
  }) => {
    const convite = randomToken();
    await page.goto(`/?convite=${convite}`);
    await waitForInvite(page, convite);
    expect(new URL(page.url()).pathname).toBe(`/convite/${convite}`);
    await expect(page.getByText("Seu par convidou você")).toBeVisible();

    const email = uniqueEmail("bia");
    await signInClerk(page, email);
    const after = new URL(page.url());
    expect(after.pathname).toBe(`/convite/${convite}`);
    expect(after.searchParams.has("access")).toBe(false);
    await setName(page, "Bia");
    await expect(
      page.getByText("Ao aceitar, vocês dois poderão ver"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aceitar convite" }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/convite/${convite}`);
  });

  test("M14 private routes send signed-out visitors to the gate", async ({
    page,
  }) => {
    await page.goto("/conta");
    await waitForGate(page);
    await page.goto("/?month=2026-09");
    await waitForGate(page);
  });

  test("M12 logout clears the session from the workspace and the gate", async ({
    page,
  }) => {
    const email = uniqueEmail("logout");
    await signInClerk(page, email);
    await setName(page, "Ana");
    await page.getByRole("button", { name: /^Sair de / }).click();
    await waitForGate(page);
    expect((await sessionCookie(page))?.value ?? "").toBeFalsy();

    await signInClerk(page, email);
    await expect(
      page.getByRole("heading", { name: "Vamos começar, Ana?" }),
    ).toBeVisible();
    await createHousehold(page);
    await openCouple(page);
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await waitForGate(page);
    expect((await sessionCookie(page))?.value ?? "").toBeFalsy();
  });
});

test("M1b gate keeps the signed-in person after a hydrated reload", async ({
  page,
}) => {
  const email = await onboard(page, "Ana");
  await waitForHydrated(page);
  await page.reload();
  await waitForHydrated(page);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Abrir nosso espaço/ }),
  ).toBeVisible();
  expect(email).toContain("+clerk_test@example.com");
});
