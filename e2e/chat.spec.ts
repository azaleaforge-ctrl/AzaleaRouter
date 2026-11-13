import { expect, test } from "@playwright/test";

test.describe("mock chat", () => {
  test("sends a message and completes the local stream", async ({ page }) => {
    await page.goto("/app/chat");

    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByText("Simulasi").first()).toBeVisible();

    const composer = page.getByLabel("Pesan");
    await composer.fill("Halo dari E2E");
    await page.getByRole("button", { name: "Kirim" }).click();

    await expect(page.getByText("Halo dari E2E")).toBeVisible();
    await expect(
      page.getByText(/Ini adalah respons demo dari AzaleaRouter/).last(),
    ).toBeVisible();
    await expect(page.getByText(/estimasi demo/).last()).toBeVisible();
    await expect(
      page.getByText(/Respons dihasilkan simulator lokal/),
    ).toBeVisible();
  });
});
