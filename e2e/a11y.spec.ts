import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const axe = (page: import("@playwright/test").Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude("canvas");

test("galeria sem violações de acessibilidade", async ({ page }) => {
  await page.goto("/");
  expect((await axe(page).analyze()).violations).toEqual([]);
});

test("editor e modal sem violações, operáveis por teclado", async ({ page, isMobile }) => {
  test.skip(isMobile, "navegação por teclado verificada no desktop");
  // sem animação de entrada: o axe mede as cores finais, não o meio do fade
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor/letreiro-2-linhas");
  await expect(page.getByTestId("previa")).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
  expect((await axe(page).analyze()).violations).toEqual([]);

  // cards de estilo de base navegáveis com setas
  // o Radix move o foco num setTimeout e só marca se a seta ainda estiver pressionada (como numa tecla real)
  await page.getByRole("radio", { name: "Retângulo" }).focus();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowRight");
  await expect(page.getByRole("radio", { name: "Degrau" })).toBeChecked();

  // modal abre e fecha pelo teclado
  await page.getByRole("button", { name: "Baixar", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await axe(page).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
