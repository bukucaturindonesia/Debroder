import { expect, type APIResponse, type Page } from "@playwright/test";
import type { Credentials } from "./env";

export async function loginCustomer(page: Page, credentials: Credentials, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(credentials.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === new URL(next, page.url()).pathname),
    page.locator("form").getByRole("button", { name: "Masuk", exact: true }).click()
  ]);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function loginAdmin(page: Page, credentials: Credentials) {
  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(credentials.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/admin/") && !url.pathname.startsWith("/admin/login")),
    page.locator("form").getByRole("button", { name: "Masuk", exact: true }).click()
  ]);
}

export async function customerAccessToken(page: Page) {
  const token = await page.evaluate(() => {
    const raw = window.localStorage.getItem("debroder-customer-auth-v1");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { access_token?: unknown };
      return typeof parsed.access_token === "string" ? parsed.access_token : null;
    } catch {
      return null;
    }
  });
  if (!token) throw new Error("Authenticated browser session did not expose a customer access token.");
  return token;
}

export async function adminAccessToken(page: Page) {
  const token = await page.evaluate(() => {
    for (const [key, raw] of Object.entries(window.localStorage)) {
      if (!key.includes("auth-token")) continue;
      try {
        const parsed = JSON.parse(raw) as { access_token?: unknown };
        if (typeof parsed.access_token === "string") return parsed.access_token;
      } catch {
        // Ignore non-auth local storage values.
      }
    }
    return null;
  });
  if (!token) throw new Error("Authenticated browser session did not expose an admin access token.");
  return token;
}

export async function jsonResponse(response: APIResponse) {
  return response.json() as Promise<Record<string, unknown>>;
}

export function absolute(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}
