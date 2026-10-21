// Utilitário (Node) para renderizar templates com o OpenSCAD WASM fora do navegador: testes e scripts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenSCAD } from "openscad-wasm-prebuilt";
import { FONTES } from "../src/config/fontes";
import { montarJob } from "../src/lib/export/modos";
import { executarOpenSCAD, type CriarOpenSCAD } from "../src/lib/render/executar";
import type { ValorParam } from "../src/lib/templates/parser";
import type { TemplateCatalogo } from "../src/lib/templates/schema";

const fontes = FONTES.map((f) => ({ nome: f.arquivo.split("/").pop()!, bytes: new Uint8Array(readFileSync(join("public", f.arquivo))) }));

export async function renderNode(t: TemplateCatalogo, params: Record<string, ValorParam>, parte: string, overrides: Record<string, ValorParam>, fn: number) {
  const job = montarJob(t, params, parte, overrides, fn);
  const scad = readFileSync(join("templates", t.id, "modelo.scad"), "utf8");
  return executarOpenSCAD(createOpenSCAD as unknown as CriarOpenSCAD, {
    scad,
    params: job.params,
    fn,
    permitidos: new Set(job.permitidos),
    fontes,
  });
}
