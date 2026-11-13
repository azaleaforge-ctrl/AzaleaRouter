import { expect, test } from "@playwright/test";

test.describe("simulated wallet", () => {
  test("shows demo balances and a simulated top-up result", async ({
    page,
  }) => {
    await page.goto("/app/wallet");
    await expect(
      page.getByRole("heading", { name: "Wallet & Top-up" }),
    ).toBeVisible();

    await expect(page.getByText("Saldo tersedia")).toBeVisible();
    await expect(page.getByText("Saldo tertahan")).toBeVisible();
    await expect(page.getByText("Total top-up")).toBeVisible();
    await expect(page.getByText("Total debit")).toBeVisible();
    await expect(page.getByText("Simulasi").first()).toBeVisible();

    await page.getByRole("button", { name: "Top-up saldo" }).click();
    await expect(
      page.getByRole("heading", { name: "Top-up saldo (simulasi)" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /100\.000/ }).click();
    await page.getByRole("button", { name: "Lanjutkan (simulasi)" }).click();

    await expect(page.getByText("Status top-up demo")).toBeVisible();
    await expect(page.getByText("Menunggu (simulasi)")).toBeVisible();
    await expect(
      page.getByText(/Tidak ada pembayaran, charge, atau kredit saldo nyata/),
    ).toBeVisible();
  });
});
