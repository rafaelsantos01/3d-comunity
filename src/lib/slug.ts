/** "JP Personalizados" → "jp-personalizados"; vazio → "letreiro". */
export function gerarSlug(...textos: string[]): string {
  const s = textos
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "letreiro";
}
