import { z } from "zod";
import { buscarFonte } from "../../config/fontes";
import type { ValorParam } from "./parser";
import type { ParamDef, TemplateCatalogo } from "./schema";

export type Params = Record<string, ValorParam>;

export function padroes(t: TemplateCatalogo): Params {
  return Object.fromEntries(t.parametros.map((p) => [p.nome, p.padrao]));
}

function schemaDoParam(p: ParamDef): z.ZodType<ValorParam> {
  if (p.tipo === "booleano") return z.boolean();
  if (p.tipo === "numero") {
    let s = z.number().finite();
    if (p.min !== undefined) s = s.min(p.min);
    if (p.max !== undefined) s = s.max(p.max);
    if (p.opcoes) return s.refine((v) => p.opcoes!.some((o) => o.valor === v));
    return s;
  }
  let s: z.ZodType<string> = z.string().max(200);
  if (p.opcoes) s = z.string().refine((v) => p.opcoes!.some((o) => o.valor === v));
  if (p.widget === "cor") s = z.string().regex(/^#[0-9a-fA-F]{6}$/);
  return s;
}

/**
 * Valida cada parâmetro isoladamente: um valor inválido cai no padrão do template
 * e nomes desconhecidos são ignorados. Fonte fora da lista gera aviso.
 */
export function validarParams(t: TemplateCatalogo, entrada: Record<string, unknown>): { params: Params; avisos: string[] } {
  const params = padroes(t);
  const avisos: string[] = [];
  for (const p of t.parametros) {
    if (!(p.nome in entrada) || p.oculto) continue;
    const v = entrada[p.nome];
    if (p.widget === "fonte" && typeof v === "string" && !buscarFonte(v)) {
      avisos.push(`A fonte "${v}" não está disponível. Usando "${String(p.padrao)}".`);
      continue;
    }
    const r = schemaDoParam(p).safeParse(v);
    if (r.success) params[p.nome] = r.data;
  }
  return { params, avisos };
}

/** Converte query params (sempre strings) para os tipos do template antes de validar. */
export function lerDaUrl(t: TemplateCatalogo, sp: URLSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of t.parametros) {
    const v = sp.get(p.nome);
    if (v === null) continue;
    if (p.tipo === "numero") out[p.nome] = v.trim() === "" ? NaN : Number(v);
    else if (p.tipo === "booleano") out[p.nome] = v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : v;
    else out[p.nome] = v;
  }
  return out;
}

/** Só os parâmetros diferentes do padrão, para a URL ficar curta. */
export function paraUrl(t: TemplateCatalogo, params: Params): URLSearchParams {
  const sp = new URLSearchParams();
  for (const p of t.parametros) {
    const v = params[p.nome];
    if (p.oculto || v === undefined || v === p.padrao) continue;
    sp.set(p.nome, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  return sp;
}
