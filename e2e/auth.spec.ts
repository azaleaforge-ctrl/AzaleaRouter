import { expect, test } from "@playwright/test";

test.describe("auth entry and validation", () => {
  test("home CTA opens the registration screen", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Mulai Sekarang" }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: "Buat akun demo" }),
    ).toBeVisible();
  });

  test("login shows required-field validation", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByText("Email wajib diisi.")).toBeVisible();
    await expect(page.getByText("Password wajib diisi.")).toBeVisible();
  });

  test("login rejects a malformed email", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByText("Format email belum valid.")).toBeVisible();
  });

  test("register shows required-field and terms validation", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByRole("button", { name: "Buat akun" }).click();

    await expect(page.getByText("Nama lengkap wajib diisi.")).toBeVisible();
    await expect(page.getByText("Email wajib diisi.")).toBeVisible();
    await expect(page.getByText("Password wajib diisi.")).toBeVisible();
    await expect(
      page.getByText(/Kamu harus menyetujui Terms/),
    ).toBeVisible();
  });
});
