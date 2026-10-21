import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { readFileSync } from "node:fs";

async function esperarPrevia(page: Page) {
  await expect(page.getByTestId("previa")).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
  await expect(page.getByTestId("dimensoes")).not.toHaveText("—");
}

async function abrirControles(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: "Personalizar" }).click();
}

test("abrir modelo → editar texto → ver prévia → baixar zip (Multicor)", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Personalizar Letreiro 1 linha" }).click();
  await expect(page).toHaveURL(/\/editor\/letreiro-1-linha/);
  await esperarPrevia(page);
  const antes = await page.getByTestId("dimensoes").textContent();

  await abrirControles(page, isMobile);
  const campo = page.getByRole("textbox", { name: "Texto", exact: true });
  await campo.fill("Café da Ana");
  if (isMobile) await page.getByRole("button", { name: "Fechar" }).click();

  const inicio = Date.now();
  await expect(page.getByTestId("dimensoes")).not.toHaveText(antes!, { timeout: 30_000 });
  await esperarPrevia(page);
  const tempo = Date.now() - inicio;
  console.log(`[${test.info().project.name}] prévia atualizada em ${tempo} ms (inclui 600 ms de debounce)`);
  expect(tempo).toBeLessThan(600 + 3000);
  await expect(page).toHaveURL(/texto=Caf/);

  await page.getByRole("button", { name: "Baixar", exact: true }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Multicor (AMS/MMU)")).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 90_000 }), dialogo.getByRole("button", { name: "Baixar .zip" }).click()]);
  expect(download.suggestedFilename()).toBe("cafe-da-ana_multicor.zip");

  const zip = await JSZip.loadAsync(readFileSync((await download.path())!));
  const nomes = Object.keys(zip.files).sort();
  expect(nomes).toEqual(["cafe-da-ana.3mf", "cafe-da-ana_base.stl", "cafe-da-ana_letras_fixas.stl"]);
  for (const n of nomes) expect((await zip.file(n)!.async("uint8array")).byteLength).toBeGreaterThan(84);
});

test("estado da URL é restaurado e fonte inválida volta ao padrão com aviso", async ({ page, isMobile }) => {
  await page.goto("/editor/letreiro-2-linhas?linha1=AB&estilo_base=degrau&fonte1=Arial%20Black");
  await expect(page.getByText(/A fonte "Arial Black" não está disponível/)).toBeVisible();
  await esperarPrevia(page);
  await abrirControles(page, isMobile);
  await expect(page.getByRole("textbox", { name: "Linha 1", exact: true })).toHaveValue("AB");
  await expect(page.getByRole("radio", { name: "Degrau" })).toBeChecked();
});

test("caractere fora da fonte mostra erro amigável e mantém a prévia", async ({ page, isMobile }) => {
  await page.goto("/editor/letreiro-1-linha");
  await esperarPrevia(page);
  await abrirControles(page, isMobile);
  await page.getByRole("textbox", { name: "Texto", exact: true }).fill("Olá ✿");
  if (isMobile) await page.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByTestId("previa").getByRole("alert")).toContainText("Fonte não suporta este caractere");
  await expect(page.locator("canvas")).toBeVisible();
  // a prévia anterior continua, mas a exportação fica bloqueada (o STL sairia com .notdef)
  const baixar = page.getByRole("button", { name: "Baixar", exact: true });
  await expect(baixar).toBeDisabled();
  await expect(page.getByText("Corrija o texto para baixar")).toBeVisible();
});

test("modelo inexistente mostra página de não encontrado", async ({ page }) => {
  await page.goto("/editor/xyz");
  await expect(page.getByRole("heading", { name: "Modelo não encontrado" })).toBeVisible();
});
