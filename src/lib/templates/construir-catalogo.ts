// Monta o catálogo de templates a partir de uma pasta (só roda em Node: build script e testes).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { VALORES_FONTES } from "../../config/fontes";
import { mesclarTemplate } from "./merge";
import { parseCustomizer } from "./parser";
import type { TemplateCatalogo } from "./schema";

export interface ResultadoCatalogo {
  templates: TemplateCatalogo[];
  avisos: string[];
  arquivos: { id: string; scad: string; thumbnail: string }[];
}

export function construirCatalogo(dir: string): ResultadoCatalogo {
  const avisos: string[] = [];
  const templates: TemplateCatalogo[] = [];
  const arquivos: ResultadoCatalogo["arquivos"] = [];
  for (const id of readdirSync(dir).sort()) {
    const pasta = join(dir, id);
    const scadPath = join(pasta, "modelo.scad");
    const jsonPath = join(pasta, "template.json");
    if (!existsSync(scadPath) || !existsSync(jsonPath)) continue;
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Pasta de template "${id}": use só letras minúsculas, números e hífen`);
    const scad = readFileSync(scadPath, "utf8");
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(jsonPath, "utf8"));
    } catch (e) {
      throw new Error(`${jsonPath}: JSON inválido (${(e as Error).message})`);
    }
    const t = mesclarTemplate({
      id,
      brutos: parseCustomizer(scad),
      json,
      fontes: VALORES_FONTES,
      scadHash: createHash("sha256").update(scad).digest("hex").slice(0, 16),
      avisar: (m) => avisos.push(m),
    });
    const thumb = join(pasta, t.thumbnail.split("/").pop()!);
    if (!existsSync(thumb)) throw new Error(`${jsonPath}: thumbnail "${thumb}" não encontrada`);
    templates.push(t);
    arquivos.push({ id, scad: scadPath, thumbnail: thumb });
  }
  templates.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  return { templates, avisos, arquivos };
}
