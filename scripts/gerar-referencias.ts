// Gera tests/fixtures/referencias-bbox.json: bounding box de cada peça de cada modo, com os parâmetros padrão e $fn=80.
//
// Referência oficial (OpenSCAD desktop, MESMA versão do WASM: 2025.01.19):
//   OPENSCAD_BIN="/caminho/openscad" npm run referencias
// O script roda, para cada peça:
//   OPENSCADFONTPATH=public/fontes openscad templates/<id>/modelo.scad --backend=manifold \
//     -o /tmp/x.stl --export-format=binstl -D '$fn=80' -D 'parte="base"' -D '<override>=...'
// Sem OPENSCAD_BIN, usa o próprio WASM (origem "wasm"): serve como regressão, não como prova contra o desktop.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CONFIG_RENDER } from "../src/config/render";
import { montarJob } from "../src/lib/export/modos";
import { bboxStl } from "../src/lib/geometria/bbox";
import { montarArgs } from "../src/lib/render/args";
import { construirCatalogo } from "../src/lib/templates/construir-catalogo";
import { padroes } from "../src/lib/templates/validador-params";
import { renderNode } from "../tests/wasm-node";

const bin = process.env.OPENSCAD_BIN;
const tmp = mkdtempSync(join(tmpdir(), "letreiro-"));
const saida: Record<string, unknown> = { origem: bin ? "desktop" : "wasm", fn: CONFIG_RENDER.fnExportacao, pecas: {} };
const pecas = saida.pecas as Record<string, unknown>;

for (const t of construirCatalogo("templates").templates) {
  const params = padroes(t);
  for (const [modo, m] of Object.entries(t.exportacao)) {
    for (const { parte } of m.partes) {
      let stl: Uint8Array | null;
      if (bin) {
        const job = montarJob(t, params, parte, m.overrides, CONFIG_RENDER.fnExportacao);
        const out = join(tmp, "x.stl");
        const args = montarArgs({ ...job.params, $fn: job.fn }, new Set(job.permitidos), resolve("templates", t.id, "modelo.scad"), out);
        execFileSync(bin, args, { env: { ...process.env, OPENSCADFONTPATH: resolve("public/fontes") }, stdio: "pipe" });
        stl = new Uint8Array(readFileSync(out));
      } else {
        stl = (await renderNode(t, params, parte, m.overrides, CONFIG_RENDER.fnExportacao)).stl;
      }
      const b = stl && bboxStl(stl);
      if (!b) throw new Error(`${t.id}/${modo}/${parte}: STL vazio`);
      const r = (v: number[]) => v.map((x) => Math.round(x * 1000) / 1000);
      pecas[`${t.id}/${modo}/${parte}`] = { min: r(b.min), max: r(b.max) };
      console.log(t.id, modo, parte, r(b.min), r(b.max));
    }
  }
}
writeFileSync("tests/fixtures/referencias-bbox.json", JSON.stringify(saida, null, 2) + "\n");
