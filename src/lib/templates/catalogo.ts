import catalogo from "../../generated/catalogo.json";
import type { TemplateCatalogo } from "./schema";

export const TEMPLATES = catalogo as unknown as TemplateCatalogo[];

export function buscarTemplate(id: string): TemplateCatalogo | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
