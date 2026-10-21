"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cobertura from "@/generated/cobertura-fontes.json";
import { CONFIG_RENDER } from "@/config/render";
import { caracteresAusentes, type MapaCobertura } from "@/lib/cobertura";
import { montarJob } from "@/lib/export/modos";
import { bboxStl, uniaoBBox, type BBox } from "@/lib/geometria/bbox";
import type { RenderClient } from "@/lib/render/cliente";
import { ErroRender, MENSAGENS } from "@/lib/render/erros";
import type { TemplateCatalogo } from "@/lib/templates/schema";
import type { Params } from "@/lib/templates/validador-params";

export interface EstadoPrevia {
  base: ArrayBuffer | null;
  letras: ArrayBuffer | null;
  caixa: BBox | null;
  erro: { codigo: string; mensagem: string } | null;
  /** params/tentativa do último render concluído; carregando = diferente dos atuais */
  concluido: { params: Params; tentativa: number } | null;
}

/** Glifos que as fontes escolhidas não têm, por texto (ex.: "A fonte X não suporta: ç, ã"). */
export function checarGlifos(t: TemplateCatalogo, params: Params): string | null {
  for (const p of t.parametros) {
    if (!p.fonte) continue;
    const fonte = String(params[p.fonte]);
    const faltando = caracteresAusentes(String(params[p.nome] ?? ""), fonte, cobertura as unknown as MapaCobertura);
    if (faltando.length) return `${MENSAGENS.GLIFO_AUSENTE} A fonte ${fonte.split(":")[0]} não tem: ${faltando.join(", ")}`;
  }
  return null;
}

/** Dois renders em paralelo (base e letras), com debounce e cancelamento; mantém a última prévia válida. */
export function usePrevia(t: TemplateCatalogo, params: Params | null) {
  const [estado, setEstado] = useState<EstadoPrevia>({ base: null, letras: null, caixa: null, erro: null, concluido: null });
  const clientes = useRef<{ base: RenderClient; letras: RenderClient } | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(
    () => () => {
      clientes.current?.base.encerrar();
      clientes.current?.letras.encerrar();
    },
    [],
  );

  // o erro de glifo é derivado dos params (não precisa de render nem de estado)
  const glifo = useMemo(() => (params ? checarGlifos(t, params) : null), [t, params]);

  useEffect(() => {
    if (!params || glifo) return;
    let ativo = true;
    (async () => {
      if (!clientes.current) {
        const { criarCliente } = await import("@/lib/render/criar-cliente");
        clientes.current ??= { base: criarCliente(), letras: criarCliente() };
      }
      const { base: cb, letras: cl } = clientes.current;
      const fn = CONFIG_RENDER.fnPrevia;
      const jb = montarJob(t, params, t.previa.base.parte, t.previa.base.overrides, fn);
      const jl = montarJob(t, params, t.previa.letras.parte, t.previa.letras.overrides, fn);
      try {
        const [b, l] = await Promise.all([
          cb.agendar(jb),
          cl.agendar(jl).catch((e: ErroRender) => (e.codigo === "GEOMETRIA_VAZIA" ? new ArrayBuffer(0) : Promise.reject(e))),
        ]);
        if (!ativo || !b || !l) return;
        const letras = l.byteLength ? l : null;
        setEstado({
          base: b,
          letras,
          caixa: uniaoBBox(bboxStl(b), letras && bboxStl(letras)),
          erro: null,
          concluido: { params, tentativa },
        });
      } catch (e) {
        if (!ativo) return;
        const er = e instanceof ErroRender ? e : new ErroRender("ERRO_SCAD", MENSAGENS.ERRO_SCAD);
        if (er.log) console.warn(er.log);
        setEstado((s) => ({ ...s, erro: { codigo: er.codigo, mensagem: er.message }, concluido: { params, tentativa } }));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [t, params, glifo, tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);
  const carregando = !glifo && (estado.concluido?.params !== params || estado.concluido?.tentativa !== tentativa);
  const erro = glifo ? { codigo: "GLIFO_AUSENTE", mensagem: glifo } : estado.erro;
  return { base: estado.base, letras: estado.letras, caixa: estado.caixa, carregando, erro, tentarDeNovo };
}
