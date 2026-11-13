import { expect, test } from "@playwright/test";

test.describe("catalog", () => {
  test("filters by search and category", async ({ page }) => {
    await page.goto("/models");
    await expect(
      page.getByRole("heading", { name: "Model Marketplace" }),
    ).toBeVisible();

    const search = page.getByLabel("Cari model");
    await search.fill("azalea");
    await expect(page.getByText(/Menampilkan 3 dari 3 model/)).toBeVisible();

    await search.fill("");
    await expect(page.getByText(/Menampilkan 9 dari 12 model/)).toBeVisible();

    await page.getByLabel("Kategori").selectOption("coding");
    await expect(page.getByText(/Menampilkan 2 dari 2 model/)).toBeVisible();
    await expect(page.getByText("Azalea Code 1").first()).toBeVisible();
    await expect(page.getByText("Kopi Code Mini").first()).toBeVisible();
  });

  test("renders a model detail page with demo pricing and endpoints", async ({
    page,
  }) => {
    await page.goto("/models/aurora-labs/azalea-chat-1");

    await expect(
      page.getByRole("heading", { name: /Azalea Chat 1/ }),
    ).toBeVisible();
    await expect(page.getByText(/Model ID:/)).toBeVisible();
    await expect(
      page.getByText("aurora-labs/azalea-chat-1").first(),
    ).toBeVisible();
    await expect(page.getByText("Harga (snapshot demo)")).toBeVisible();
    await expect(page.getByText("Endpoint & routing")).toBeVisible();
    await expect(page.getByText("Data demo").first()).toBeVisible();
  });
});
