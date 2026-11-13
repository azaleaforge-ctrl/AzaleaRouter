import { expect, test } from "@playwright/test";

const ADMIN_LINKS = [
  { label: "Users", path: "/admin/users" },
  { label: "Models", path: "/admin/models" },
  { label: "Providers", path: "/admin/providers" },
  { label: "Pricing", path: "/admin/pricing" },
  { label: "Wallets", path: "/admin/wallets" },
  { label: "Payments", path: "/admin/payments" },
  { label: "Usage", path: "/admin/usage" },
  { label: "Upstream", path: "/admin/upstream" },
  { label: "Support", path: "/admin/support" },
  { label: "Content", path: "/admin/content" },
  { label: "Audit Logs", path: "/admin/audit-logs" },
  { label: "Settings", path: "/admin/settings" },
] as const;

test.describe("admin demo navigation", () => {
  test("navigates every admin section and switches demo role", async ({
    page,
  }) => {
    await page.goto("/admin/overview");

    await expect(
      page.getByText("Panel admin demo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Overview" }),
    ).toBeVisible();

    for (const item of ADMIN_LINKS) {
      await page.getByRole("link", { name: item.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${item.path}$`));
      await expect(
        page.getByRole("heading", { name: item.label, exact: true }),
      ).toBeVisible();
    }

    await page.getByLabel("Pilih peran demo").selectOption("user");
    await expect(page).toHaveURL(/\/app\/overview$/);
  });
});
