import { expect, test } from "@playwright/test";

test.describe("API key demo", () => {
  test("reveals a clearly fake secret once, then keeps the listing masked", async ({
    page,
  }) => {
    await page.goto("/app/api-keys");
    await expect(page.getByRole("heading", { name: "API Keys" })).toBeVisible();

    await page.getByRole("button", { name: "Buat API key" }).click();
    await expect(
      page.getByRole("heading", { name: "Buat API key (demo)" }),
    ).toBeVisible();

    await page.getByLabel("Label key").fill("E2E demo key");
    await page.getByRole("button", { name: "Buat key" }).click();

    await expect(
      page.getByRole("heading", { name: "Simpan secret sekarang" }),
    ).toBeVisible();
    await expect(
      page.getByText(/AZL-DEMO-[A-Z0-9]+-NOT-A-REAL-KEY/),
    ).toBeVisible();
    await expect(
      page.getByText(/tidak dapat digunakan untuk autentikasi nyata/),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText(/tokenKind: demo-non-usable/),
    ).toBeVisible();

    await page
      .getByLabel("Saya sudah menyimpan secret ini di tempat aman.")
      .check();
    await page
      .getByRole("button", { name: "Saya sudah simpan — tutup" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Simpan secret sekarang" }),
    ).toBeHidden();
    await expect(
      page.getByText(/AZL-DEMO-[A-Z0-9]+-NOT-A-REAL-KEY/),
    ).toHaveCount(0);
    await expect(page.getByText("AZL-Ab12Cd34••••")).toBeVisible();
  });
});
