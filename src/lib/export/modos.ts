import { buscarFonte, FONTES } from "../../config/fontes";
import type { JobRender } from "../render/cliente";
import type { ValorParam } from "../templates/parser";
import type { ModoExportacao, TemplateCatalogo } from "../templates/schema";
import { gerarSlug } from "../slug";

export const MODOS: { id: ModoExportacao; titulo: string; quando: string }[] = [
  {
    id: "multicor",
    titulo: "Multicor (AMS/MMU)",
    quando: "Para impressoras com troca automática de filamento. Base e letras saem alinhadas como partes do mesmo objeto.",
  },
  {
    id: "unico",
    titulo: "Um bico com troca de cor",
    quando: "Para impressoras de um filamento só: uma peça única e você pausa para trocar a cor na altura indicada.",
  },
  {
    id: "encaixe",
    titulo: "Encaixe e colagem",
    quando: "Imprime base e letras separadas, cada uma na sua cor. As letras têm pino e encaixam nos furos da base.",
  },
];

/** URLs das fontes usadas pelos parâmetros de fonte (só elas vão para o FS do WASM). */
export function fontesUsadas(t: TemplateCatalogo, params: Record<string, ValorParam>): string[] {
  const urls = new Set<string>();
  for (const p of t.parametros) {
    if (p.widget !== "fonte") continue;
    urls.add((buscarFonte(String(params[p.nome])) ?? buscarFonte(String(p.padrao)) ?? FONTES[0]).arquivo);
  }
  if (!urls.size) urls.add(FONTES[0].arquivo);
  return [...urls];
}

export function montarJob(
  t: TemplateCatalogo,
  params: Record<string, ValorParam>,
  parte: string,
  overrides: Record<string, ValorParam>,
  fn: number,
): JobRender {
  const finais = { ...params, ...overrides, [t.papeis.parte]: parte };
  if (t.papeis.emPe) finais[t.papeis.emPe] = false;
  return {
    templateId: t.id,
    scadUrl: t.scadUrl,
    scadHash: t.scadHash,
    params: finais,
    parte,
    fn,
    permitidos: t.parametros.map((p) => p.nome),
    fontes: fontesUsadas(t, finais),
  };
}

export function slugDoTemplate(t: TemplateCatalogo, params: Record<string, ValorParam>): string {
  return gerarSlug(...t.papeis.slug.map((n) => String(params[n] ?? "")));
}

export function alturaTrocaCor(t: TemplateCatalogo, params: Record<string, ValorParam>, alturaCamada: number): number {
  return Number(params[t.papeis.espessuraBase]) + alturaCamada;
}

export function textoInstrucoes(nome: string, z: number, alturaCamada: number): string {
  const zf = z.toFixed(2).replace(".", ",");
  return [
    `Letreiro: ${nome}`,
    "Modo: um bico com troca de cor",
    "",
    `1. Fatie o arquivo *_base_unica.stl com altura de camada de ${alturaCamada.toFixed(2).replace(".", ",")} mm.`,
    `2. Adicione uma pausa / troca de filamento (M600) na altura Z = ${zf} mm.`,
    "3. Comece com a cor da base e troque para a cor das letras na pausa.",
  ].join("\n");
}
