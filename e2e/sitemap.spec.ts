import { expect, test } from "@playwright/test";

const STATIC_ROUTES = [
  "/",
  "/models",
  "/pricing",
  "/docs",
  "/docs/quickstart",
  "/help",
  "/blog",
  "/status",
  "/changelog",
  "/terms",
  "/privacy",
  "/login",
  "/register",
  "/forgot-password",
  "/app/overview",
  "/app/chat",
  "/app/models",
  "/app/usage",
  "/app/transactions",
  "/app/wallet",
  "/app/api-keys",
  "/app/playground",
  "/app/settings/profile",
  "/app/settings/security",
  "/app/settings/preferences",
  "/app/notifications",
  "/admin/overview",
  "/admin/users",
  "/admin/models",
  "/admin/providers",
  "/admin/pricing",
  "/admin/wallets",
  "/admin/payments",
  "/admin/usage",
  "/admin/upstream",
  "/admin/support",
  "/admin/content",
  "/admin/audit-logs",
  "/admin/settings",
] as const;

const DYNAMIC_ROUTES = [
  "/models/aurora-labs/azalea-chat-1",
  "/docs/ide/ide-vscode",
  "/docs/cli/cli-azalea",
  "/help/account-security",
  "/blog/product-update-demo",
] as const;

test.describe("sitemap route rendering", () => {
  for (const route of [...STATIC_ROUTES, ...DYNAMIC_ROUTES]) {
    test(`renders ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      expect(response?.status()).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.getByText("Halaman tidak ditemukan")).toHaveCount(0);
    });
  }

  test("renders the designed not-found state for an unknown route", async ({
    page,
  }) => {
    const response = await page.goto("/route-yang-tidak-ada");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
    ).toBeVisible();
  });
});
