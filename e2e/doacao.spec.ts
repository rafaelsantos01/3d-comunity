import { expect, test } from "@playwright/test";

test("link Apoie do header leva à página de doação", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Apoie" }).click();
  await expect(page).toHaveURL(/\/apoie$/);
  await expect(page).toHaveTitle(/Me pague um café/);
  await expect(page.getByRole("heading", { level: 1, name: "Me pague um café ☕" })).toBeVisible();
});

test("/apoie mostra QR e botão de copiar sem rolagem horizontal", async ({ page }) => {
  await page.goto("/apoie");
  await expect(page.getByRole("heading", { level: 1, name: "Me pague um café ☕" })).toBeVisible();
  const semRolagem = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

  if (await page.getByText("As doações estão temporariamente indisponíveis").isVisible()) {
    expect(await semRolagem()).toBe(true);
    test.skip(true, "Pix não configurado no build (ver README, Doações)");
  }
  await expect(page.getByRole("img", { name: "QR Code Pix para doação" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar chave Pix" })).toBeVisible();
  expect(await semRolagem()).toBe(true);
});
