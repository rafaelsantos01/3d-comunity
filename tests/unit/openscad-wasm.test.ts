// Renderiza com o OpenSCAD WASM real (em Node): fontes, dimensões de referência e alinhamento.
import refJson from "../fixtures/referencias-bbox.json";
import { FONTES } from "@/config/fontes";
import { CONFIG_RENDER } from "@/config/render";
import { bboxStl, type BBox } from "@/lib/geometria/bbox";
import { construirCatalogo } from "@/lib/templates/construir-catalogo";
import { padroes } from "@/lib/templates/validador-params";
import { renderNode } from "../wasm-node";

const { templates } = construirCatalogo("templates");
const [t1] = templates;
const TOL = 0.1;
const referencias = refJson as unknown as { origem: string; fn: number; pecas: Record<string, BBox> };

async function bbox(id: string, parte: string, overrides: Record<string, string | number | boolean>, extra: Record<string, string | number | boolean> = {}, fn = CONFIG_RENDER.fnExportacao) {
  const t = templates.find((x) => x.id === id)!;
  const r = await renderNode(t, { ...padroes(t), ...extra }, parte, overrides, fn);
  return bboxStl(r.stl!)!;
}

describe("fontes no WASM", () => {
  it("cada fonte empacotada resolve para uma face diferente (nenhuma cai no fallback de outra)", async () => {
    // O fontconfig nunca falha: fonte desconhecida cai numa fonte qualquer. Por isso exigimos que as
    // N fontes gerem N larguras distintas, ou seja, cada `valor` resolve para um arquivo próprio.
    const larguras = new Map<string, number>();
    for (const f of FONTES) {
      const b = await bbox("letreiro-1-linha", "letras_fixas", {}, { fonte: f.valor }, 8);
      larguras.set(f.valor, Math.round((b.max[0] - b.min[0]) * 100) / 100);
    }
    expect(new Set(larguras.values()).size, JSON.stringify([...larguras])).toBe(FONTES.length);
    // :style=Bold resolve para o peso certo (largura diferente do Regular)
    expect(larguras.get("Montserrat:style=Bold")).not.toBeCloseTo(larguras.get("Montserrat")!, 1);
    expect(larguras.get("Montserrat:style=Black")).not.toBeCloseTo(larguras.get("Montserrat:style=Bold")!, 1);
    expect(larguras.get("Playfair Display:style=Bold")).not.toBeCloseTo(larguras.get("Playfair Display")!, 1);
  });
});

describe(`dimensões de referência (origem: ${referencias.origem}, $fn=${referencias.fn})`, () => {
  const casos = Object.entries(referencias.pecas as Record<string, BBox>);
  it.each(casos)("%s", async (chave, ref) => {
    const [id, modo, parte] = chave.split("/");
    const t = templates.find((x) => x.id === id)!;
    const b = await bbox(id, parte, t.exportacao[modo as keyof typeof t.exportacao].overrides);
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(b.min[k] - ref.min[k])).toBeLessThanOrEqual(TOL);
      expect(Math.abs(b.max[k] - ref.max[k])).toBeLessThanOrEqual(TOL);
    }
  });
});

describe("alinhamento multicor", () => {
  it.each(templates.map((t) => t.id))("%s: letras_fixas ficam sobre a base, no mesmo referencial", (id) => {
    const p = referencias.pecas as Record<string, BBox>;
    const base = p[`${id}/multicor/base`];
    const letras = p[`${id}/multicor/letras_fixas`];
    expect(letras.min[0]).toBeGreaterThanOrEqual(base.min[0]);
    expect(letras.max[0]).toBeLessThanOrEqual(base.max[0]);
    expect(letras.min[1]).toBeGreaterThanOrEqual(base.min[1]);
    expect(letras.max[1]).toBeLessThanOrEqual(base.max[1]);
    expect(letras.min[2]).toBeCloseTo(base.max[2], 3);
  });
});

it("1 linha: troca de cor (base_unica) começa acima da espessura da base", () => {
  const p = referencias.pecas as Record<string, BBox>;
  expect(p["letreiro-1-linha/unico/base_unica"].max[2]).toBeCloseTo(Number(padroes(t1).base_espessura) + Number(padroes(t1).altura_letra), 3);
});
