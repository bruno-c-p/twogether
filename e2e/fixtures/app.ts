import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { createClient } from "@libsql/client";

test.beforeEach(async () => {
  if (test.info().retry === 0) return;

  const databasePath = process.env.E2E_DATABASE_PATH;

  if (!databasePath) throw new Error("E2E_DATABASE_PATH is missing");
  const database = createClient({ url: `file:${databasePath}` });

  try {
    // A retry keeps the Clerk identity but must repeat onboarding from scratch.
    await database.batch(
      ["transactions", "invites", "users", "households"].map(
        (table) => `DELETE FROM ${table}`,
      ),
      "write",
    );
  } finally {
    database.close();
  }
});

export const desktop = { width: 1280, height: 800 };

export const mobile = { width: 320, height: 720 };

export const commandBus = ["/api", "budget"].join("/");

export function randomToken() {
  return randomBytes(32).toString("hex");
}

export function uniqueEmail(label: string) {
  const info = test.info();

  const key = createHash("sha1")
    .update(`${info.project.name}:${info.title}`)
    .digest("hex")
    .slice(0, 12);

  return `e2e.${key}.${label}+clerk_test@example.com`;
}

export async function waitForHydrated(page: Page) {
  await page.waitForFunction(
    () =>
      document.body !== null &&
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

export async function waitForInvite(page: Page, token: string) {
  await expect(page).toHaveURL(new RegExp(`/convite/${token}(?:\\?|$)`));
  await expect(
    page.getByRole("heading", { name: /A vida a dois/ }),
  ).toBeVisible();
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
  const path = new URL(page.url()).pathname;

  if (path.startsWith("/convite/")) {
    await expect(
      page.getByRole("heading", { name: /A vida a dois/ }),
    ).toBeVisible();
    await waitForHydrated(page);
  } else {
    if (!path.startsWith("/entrar")) await page.goto("/entrar");
    await waitForGate(page);
  }

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
  await waitForHydrated(page);
}

// Glaze stacks identical toasts, so each one is closed before the next action.
// Base UI keeps the close button out of the accessibility tree until the
// stack is hovered or focused, as a pointer user would do first.
export async function expectToast(page: Page, message: string) {
  const toast = page
    .locator('[data-slot="toast"]')
    .filter({ hasText: message });

  await expect(toast).toBeVisible();
  await toast.hover();
  await toast.getByRole("button", { name: "Dispensar" }).click();
  await expect(toast).toHaveCount(0);
}

export async function expectNoHorizontalOverflow(page: Page, screen = "page") {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(
    box.scrollWidth,
    `${screen} overflows at ${box.innerWidth}px`,
  ).toBeLessThanOrEqual(box.innerWidth);
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
  const year = Number(month.slice(0, 4));

  await monthTrigger(page).click();

  const shown = page.getByRole("dialog").locator("strong[aria-live]");

  while (Number(await shown.textContent()) !== year)
    await page
      .getByRole("button", {
        name:
          Number(await shown.textContent()) < year
            ? "Próximo ano"
            : "Ano anterior",
      })
      .click();
  await page
    .getByRole("button", { name: monthText(month), exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(monthTrigger(page)).toHaveAccessibleName(
    `Selecionar mês e ano: ${monthText(month)}`,
  );
}

export function monthText(month: string) {
  const [year, number] = month.split("-").map(Number);

  return `${new Date(year, number - 1, 1).toLocaleDateString("pt-BR", { month: "long" })} ${year}`;
}

export function monthTrigger(page: Page) {
  return page.getByRole("button", { name: /^Selecionar mês e ano/ });
}

export async function sessionCookie(page: Page) {
  const cookies = await page.context().cookies();

  return cookies.find((cookie) => cookie.name === "__session");
}

export function nav(page: Page, kind: "desktop" | "mobile") {
  const label = kind === "desktop" ? "Navegação principal" : "Navegação mobile";

  return page.getByRole("navigation", { name: label });
}

// Phones and desktops render a row's goal and split status in different
// places, so assert on the row's visible text (useInnerText) instead of
// picking one copy.
export function transactionRow(page: Page, description: string) {
  return page
    .getByRole("region", { name: "Transações do mês" })
    .getByRole("listitem")
    .filter({
      has: page.getByRole("button", { name: description, exact: true }),
    });
}

export function monthSummary(page: Page) {
  return page.getByRole("region", { name: "Resumo mensal" });
}

export function personFilter(page: Page) {
  return page.getByRole("button", { name: /^Filtrar por pessoa/ });
}

export async function choosePerson(page: Page, name: string) {
  await personFilter(page).click();
  await page.getByRole("radio", { name, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function expectPersonOptions(page: Page, names: string[]) {
  await personFilter(page).click();

  for (const name of names)
    await expect(page.getByRole("radio", { name, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function expectPerson(page: Page, name: string) {
  await expect(personFilter(page)).toHaveAccessibleName(
    `Filtrar por pessoa: ${name}`,
  );
}

export async function openView(page: Page, name: string) {
  await nav(page, "desktop").getByRole("link", { name }).click();
}

export async function openNewTransaction(page: Page) {
  await openView(page, "Transações");
  await page
    .getByRole("button", { name: "Adicionar transação" })
    .first()
    .click();

  return page.getByRole("dialog", { name: "Nova transação" });
}

const monthCaption = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const dayName = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Glaze's date picker is a button that opens a calendar; it takes no typing.
export async function pickDate(scope: Locator, label: string, iso: string) {
  const page = scope.page();
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(year, month - 1, day);

  await scope
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(label)} `) })
    .click();

  const grid = page.getByRole("grid", { name: monthCaption.format(target) });

  for (let step = 0; step < 36 && !(await grid.isVisible()); step++) {
    const shown = await page.getByRole("grid").evaluate((table) => {
      const caption = document.getElementById(
        table.getAttribute("aria-labelledby") ?? "",
      );

      return caption?.textContent ?? "";
    });

    const shownIndex = Array.from({ length: 12 * 5 }, (_, offset) => {
      const date = new Date(year - 2, offset, 1);

      return { date, caption: monthCaption.format(date) };
    }).find(({ caption }) => caption === shown)?.date;

    const forward = !shownIndex || shownIndex < target;

    await page
      .getByRole("button", { name: forward ? "Próximo mês" : "Mês anterior" })
      .click();
  }

  await grid
    .getByRole("button", {
      name: new RegExp(`^${escapeRegExp(dayName.format(target))}(, hoje)?$`),
    })
    .click();
  await expect(page.getByRole("grid")).toHaveCount(0);
}
