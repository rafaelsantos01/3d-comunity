// Gera src/generated/catalogo.json e cobertura-fontes.json e copia os .scad/thumbnails para public/templates.
// Uso: npm run templates:build   (TEMPLATES_DIR=outra/pasta para usar outra origem)
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import opentype from "opentype.js";
import { FONTES } from "../src/config/fontes";
import { construirCatalogo } from "../src/lib/templates/construir-catalogo";

const raiz = process.cwd();
const dirTemplates = process.env.TEMPLATES_DIR ?? join(raiz, "templates");
const dirGerado = join(raiz, "src", "generated");
const dirPublico = join(raiz, "public", "templates");

try {
  const { templates, avisos, arquivos } = construirCatalogo(dirTemplates);
  avisos.forEach((a) => console.warn("aviso:", a));

  mkdirSync(dirGerado, { recursive: true });
  writeFileSync(join(dirGerado, "catalogo.json"), JSON.stringify(templates, null, 2));

  rmSync(dirPublico, { recursive: true, force: true });
  for (const a of arquivos) {
    const d = join(dirPublico, a.id);
    mkdirSync(d, { recursive: true });
    copyFileSync(a.scad, join(d, "modelo.scad"));
    copyFileSync(a.thumbnail, join(d, basename(a.thumbnail)));
  }

  // Cobertura de caracteres (cmap) de cada fonte, em faixas [início, fim].
  const cobertura: Record<string, [number, number][]> = {};
  for (const f of FONTES) {
    const buf = readFileSync(join(raiz, "public", f.arquivo));
    const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const cps = Object.keys(font.tables.cmap.glyphIndexMap).map(Number).sort((a, b) => a - b);
    const faixas: [number, number][] = [];
    for (const cp of cps) {
      const ult = faixas[faixas.length - 1];
      if (ult && cp === ult[1] + 1) ult[1] = cp;
      else faixas.push([cp, cp]);
    }
    cobertura[f.valor] = faixas;
  }
  writeFileSync(join(dirGerado, "cobertura-fontes.json"), JSON.stringify(cobertura));

  console.log(`templates: ${templates.map((t) => t.id).join(", ")}`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
