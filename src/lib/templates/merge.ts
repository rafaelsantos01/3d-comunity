import type { ParamBruto, ValorParam } from "./parser";
import {
  TemplateJsonSchema,
  formatarErroZod,
  type ParamDef,
  type TemplateCatalogo,
  type TemplateJson,
  type Widget,
} from "./schema";

export class ErroTemplate extends Error {
  constructor(
    public readonly templateId: string,
    public readonly erros: string[],
  ) {
    super(`Template "${templateId}" inválido:\n  - ${erros.join("\n  - ")}`);
  }
}

export interface EntradaMerge {
  id: string;
  brutos: ParamBruto[];
  json: unknown;
  fontes: readonly string[];
  scadHash: string;
  /** recebe avisos não fatais (ex.: parâmetro sem entrada no template.json) */
  avisar?: (msg: string) => void;
}

function tipoDoValor(v: ValorParam) {
  return typeof v === "string" ? "string" : typeof v === "number" ? "numero" : "booleano";
}

function rotuloPadrao(nome: string) {
  const s = nome.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mesclarTemplate({ id, brutos, json, fontes, scadHash, avisar }: EntradaMerge): TemplateCatalogo {
  const r = TemplateJsonSchema.safeParse(json);
  if (!r.success) throw new ErroTemplate(id, formatarErroZod(r.error));
  const t: TemplateJson = r.data;
  const erros: string[] = [];
  const porNome = new Map(brutos.map((b) => [b.nome, b]));
  const existe = (nome: string, caminho: string) => {
    if (!porNome.has(nome)) erros.push(`${caminho}: parâmetro "${nome}" não existe no modelo.scad`);
    return porNome.has(nome);
  };

  for (const nome of Object.keys(t.parametros)) existe(nome, `parametros.${nome}`);
  for (const [papel, v] of Object.entries(t.papeis)) {
    if (Array.isArray(v)) v.forEach((n, i) => existe(n, `papeis.${papel}.${i}`));
    else if (typeof v === "string") existe(v, `papeis.${papel}`);
  }
  const checarOverrides = (ov: Record<string, ValorParam>, caminho: string) => {
    for (const [nome, valor] of Object.entries(ov)) {
      if (!existe(nome, `${caminho}.${nome}`)) continue;
      const b = porNome.get(nome)!;
      if (tipoDoValor(valor) !== b.tipo) erros.push(`${caminho}.${nome}: esperado ${b.tipo}, recebido ${tipoDoValor(valor)}`);
    }
  };
  const checarParte = (valor: string, caminho: string) => {
    const b = porNome.get(t.papeis.parte);
    if (b?.opcoes && !b.opcoes.some((o) => o.valor === valor)) erros.push(`${caminho}: parte "${valor}" não está nas opções de ${t.papeis.parte}`);
  };
  for (const peca of ["base", "letras"] as const) {
    checarOverrides(t.previa[peca].overrides, `previa.${peca}.overrides`);
    checarParte(t.previa[peca].parte, `previa.${peca}.parte`);
  }
  for (const [modo, m] of Object.entries(t.exportacao)) {
    checarOverrides(m.overrides, `exportacao.${modo}.overrides`);
    m.partes.forEach((p, i) => checarParte(p.parte, `exportacao.${modo}.partes.${i}.parte`));
  }

  const ocultosPorPapel = new Set([t.papeis.parte, t.papeis.emPe].filter(Boolean) as string[]);
  const parametros: ParamDef[] = brutos.map((b) => {
    const meta = t.parametros[b.nome];
    const caminho = `parametros.${b.nome}`;
    if (!meta && !ocultosPorPapel.has(b.nome)) avisar?.(`[${id}] parâmetro "${b.nome}" sem entrada no template.json (vai para "Avançado")`);
    const m = meta ?? {};
    let widget: Widget =
      m.widget ?? (b.opcoes ? "select" : b.tipo === "booleano" ? "booleano" : b.tipo === "numero" ? "numero" : "texto");
    if (b.nome === t.papeis.corBase || b.nome === t.papeis.corLetras) widget = m.widget ?? "cor";

    const def: ParamDef = {
      nome: b.nome,
      tipo: b.tipo,
      widget,
      padrao: b.padrao,
      secao: b.secao,
      rotulo: m.rotulo ?? rotuloPadrao(b.nome),
      grupo: m.grupo ?? "avancado",
      oculto: m.oculto ?? (ocultosPorPapel.has(b.nome) || t.secoes[b.secao]?.oculta === true),
      ajuda: m.ajuda ?? b.ajuda,
      unidade: m.unidade,
    };
    if (m.fonte) {
      if (t.parametros[m.fonte]?.widget !== "fonte") erros.push(`${caminho}.fonte: "${m.fonte}" não é um parâmetro com widget "fonte"`);
      else def.fonte = m.fonte;
    }

    if (b.tipo === "numero") {
      const padrao = b.padrao as number;
      def.min = m.min ?? b.faixa?.min ?? 0;
      def.max = m.max ?? b.faixa?.max ?? Math.max(10, Math.ceil(Math.abs(padrao) * 4));
      def.step = m.step ?? b.faixa?.step ?? (b.inteiro ? 1 : 0.1);
      if (def.min > def.max) erros.push(`${caminho}.min: min (${def.min}) maior que max (${def.max})`);
      if (padrao < def.min || padrao > def.max) erros.push(`${caminho}: padrão ${padrao} fora de [${def.min}, ${def.max}]`);
    } else if (m.min !== undefined || m.max !== undefined) {
      erros.push(`${caminho}.min: min/max só valem para parâmetros numéricos`);
    }

    if (b.opcoes) {
      def.opcoes = b.opcoes.map((o) => ({
        valor: o.valor,
        rotulo: m.opcoes?.[String(o.valor)]?.rotulo ?? o.rotulo ?? String(o.valor),
        icone: m.opcoes?.[String(o.valor)]?.icone,
      }));
      for (const k of Object.keys(m.opcoes ?? {}))
        if (!b.opcoes.some((o) => String(o.valor) === k)) erros.push(`${caminho}.opcoes.${k}: opção não existe no modelo.scad`);
    } else if (widget === "select" || widget === "cards") {
      erros.push(`${caminho}.widget: "${widget}" exige uma lista de opções no comentário do .scad`);
    }
    if (widget === "fonte" && !fontes.includes(String(b.padrao))) {
      erros.push(`${caminho}: fonte padrão "${b.padrao}" não está entre as fontes empacotadas`);
    }
    if (widget === "cor" && !/^#[0-9a-fA-F]{6}$/.test(String(b.padrao))) erros.push(`${caminho}: cor padrão deve ser #RRGGBB`);
    return def;
  });

  if (erros.length) throw new ErroTemplate(id, erros);

  const nomesSecoes = [...new Set(parametros.map((p) => p.secao))];
  return {
    id,
    nome: t.nome,
    descricao: t.descricao,
    ordem: t.ordem,
    thumbnail: `/templates/${id}/${t.thumbnail}`,
    // o hash versiona a URL: a Cache API do worker guarda o .scad, e um deploy que o altere não pode servir o antigo
    scadUrl: `/templates/${id}/modelo.scad?v=${scadHash}`,
    scadHash,
    parametros,
    secoes: nomesSecoes.map((nome) => ({ nome, rotulo: t.secoes[nome]?.rotulo ?? nome })),
    papeis: t.papeis,
    previa: t.previa,
    exportacao: t.exportacao,
  };
}
