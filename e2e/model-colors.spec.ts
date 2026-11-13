import { expect, test } from "@playwright/test";

test.describe("model color persistence", () => {
  test("keeps a manual color after a page reload", async ({ page }) => {
    await page.goto("/app/usage");
    await expect(
      page.getByRole("heading", { name: "Usage Analytics" }),
    ).toBeVisible();

    const input = page.getByLabel("Ganti warna untuk Azalea Chat 1");
    await expect(input).toBeVisible();

    await input.focus();
    await input.evaluate((element: HTMLInputElement) => {
      element.value = "#123456";
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await input.blur();

    const row = page.locator("li").filter({ has: input });
    const colorDot = row.locator('span[aria-hidden="true"]').first();
    await expect(colorDot).toHaveCSS("background-color", "rgb(18, 52, 86)");

    await page.reload();
    await expect(
      page.getByLabel("Ganti warna untuk Azalea Chat 1"),
    ).toHaveValue("#123456");
  });
});
