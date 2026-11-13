import { expect, test } from "@playwright/test";

test.describe("usage filters", () => {
  test("filters requests by source and billing status", async ({ page }) => {
    await page.goto("/app/usage");
    await expect(
      page.getByRole("heading", { name: "Usage Analytics" }),
    ).toBeVisible();

    await expect(page.getByText("Total pengeluaran")).toBeVisible();
    await expect(page.getByText("Total request")).toBeVisible();
    await expect(page.getByText("Token input")).toBeVisible();
    await expect(page.getByText("Token output")).toBeVisible();

    await page.getByLabel("Filter sumber").selectOption("api-key");
    await expect(
      page.getByRole("cell", { name: "API key" }).first(),
    ).toBeVisible();

    await page.getByLabel("Filter status billing").selectOption("settled");
    await expect(
      page.getByRole("cell", { name: "Settled" }).first(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "30 hari terakhir" }).click();
    await expect(page.getByText("Total pengeluaran")).toBeVisible();
  });
});
