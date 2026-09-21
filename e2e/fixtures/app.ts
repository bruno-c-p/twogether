import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

export const desktop = { width: 1280, height: 800 };
export const mobile = { width: 320, height: 720 };
export const commandBus = ["/api", "budget"].join("/");

export function randomToken() {
  return randomBytes(32).toString("hex");
}

export function uniqueEmail(label: string) {
  const info = test.info();
  const worker = info.workerIndex;
  const key = createHash("sha1")
    .update(`${info.file}:${info.title}`)
    .digest("hex")
    .slice(0, 12);
  return `e2e.${worker}.${key}.${label}+clerk_test@example.com`;
}

export async function waitForHydrated(page: Page) {
  await page.waitForFunction(() =>
    Object.keys(document.body).some((key) => key.startsWith("__react")),
  );
}

export async function reloadApp(page: Page) {
  await page.reload();
  await waitForHydrated(page);
}

export async function waitForGate(page: Page) {
  await expect(page).toHaveURL(/\/entrar(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: /A vida a dois/ }),
  ).toBeVisible();
  await expect(page.getByText("Carregando orçamento…")).toHaveCount(0);
  await waitForHydrated(page);
}

async function ensureClerkUser(email: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is missing");
  const client = createClerkClient({ secretKey });
  const existing = await client.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0];
  return client.users.createUser({
    emailAddress: [email],
    skipPasswordRequirement: true,
  });
}

export async function signInClerk(page: Page, email: string) {
  await setupClerkTestingToken({ page });
  if (!new URL(page.url()).pathname.startsWith("/entrar"))
    await page.goto("/entrar");
  await waitForGate(page);
  const user = await ensureClerkUser(email);
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is missing");
  const client = createClerkClient({ secretKey });
  const signInToken = await client.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 600,
  });
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInToken.token },
  });
  await expect(
    page.getByRole("heading", {
      name: /Como chamamos você\?|Vamos começar,/,
    }),
  ).toBeVisible({ timeout: 20000 });
}

export async function setName(page: Page, name: string) {
  await waitForHydrated(page);
  const field = page.getByLabel("Seu nome");
  if (await field.isVisible()) {
    await field.fill(name);
    await page.getByRole("button", { name: "Continuar" }).click();
  }
  await expect(
    page.getByRole("heading", { name: `Vamos começar, ${name}?` }),
  ).toBeVisible();
}

export async function createHousehold(page: Page) {
  await page.getByRole("button", { name: "Começar nosso orçamento" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
}

export async function onboard(
  page: Page,
  name: string,
  email = uniqueEmail(name),
) {
  await signInClerk(page, email);
  await setName(page, name);
  await createHousehold(page);
  return email;
}

export async function openCouple(page: Page) {
  await page.getByRole("button", { name: /Abrir nosso espaço/ }).click();
  await expect(
    page.getByRole("heading", { name: "Nosso espaço" }),
  ).toBeVisible();
}

export async function dismissToast(page: Page) {
  const close = page.getByRole("button", { name: "Fechar aviso" });
  if (await close.isVisible()) await close.click();
}

export async function expectToast(page: Page, message: string) {
  await expect(
    page.getByRole("status").filter({ hasText: message }),
  ).toBeVisible();
  await dismissToast(page);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(box.scrollWidth).toBeLessThanOrEqual(box.innerWidth);
}

export async function withMobile(page: Page, run: () => Promise<void>) {
  await page.setViewportSize(mobile);
  try {
    await run();
  } finally {
    await page.setViewportSize(desktop);
  }
}

export async function setMonth(page: Page, month: string) {
  await page.getByLabel("Selecionar mês e ano").fill(month);
}

export async function sessionCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "__session");
}

export function nav(page: Page, kind: "desktop" | "mobile") {
  const label = kind === "desktop" ? "Navegação principal" : "Navegação mobile";
  return page.getByRole("navigation", { name: label });
}

export function person(page: Page, name: string) {
  return page
    .getByLabel("Filtrar por pessoa")
    .getByRole("button", { name, exact: true });
}
