// Parser dos comentários do Customizer do OpenSCAD.
// Lê as atribuições de topo até o primeiro `module`/`function` (ou até a seção [Hidden]).

export type TipoParam = "string" | "numero" | "booleano";
export type ValorParam = string | number | boolean;

export interface OpcaoBruta {
  valor: string | number;
  rotulo?: string;
}

export interface ParamBruto {
  nome: string;
  tipo: TipoParam;
  padrao: ValorParam;
  secao: string;
  inteiro?: boolean;
  opcoes?: OpcaoBruta[];
  faixa?: { min: number; max: number; step?: number };
  ajuda?: string;
}

const RE_SECAO = /^\s*\/\*\s*\[([^\]]+)\]\s*\*\/\s*$/;
const RE_INICIO_CODIGO = /^\s*(module|function)\b/;
const RE_NOME = /^\s*([A-Za-z_$][\w$]*)\s*=\s*/;
const RE_NUMERO = /^-?(\d+\.?\d*|\.\d+)$/;
export const SECAO_PADRAO = "Parâmetros";

/** Lê um literal de string OpenSCAD a partir de `src[i] === '"'`. Devolve o valor e o índice após a aspa final. */
function lerString(src: string, i: number): { valor: string; fim: number } | null {
  let out = "";
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") {
      const n = src[j + 1];
      out += n === "n" ? "\n" : n === "t" ? "\t" : n === "r" ? "\r" : n;
      j++;
    } else if (c === '"') {
      return { valor: out, fim: j + 1 };
    } else {
      out += c;
    }
  }
  return null;
}

function interpretarComentario(txt: string, p: ParamBruto) {
  const t = txt.trim();
  const m = t.match(/^\[(.*)\]$/);
  if (!m) {
    if (t) p.ajuda = t;
    return;
  }
  const corpo = m[1].trim();
  // faixa [min:max] ou [min:step:max]
  const partesFaixa = corpo.split(":").map((s) => s.trim());
  if (!corpo.includes(",") && partesFaixa.every((s) => RE_NUMERO.test(s)) && partesFaixa.length >= 1 && partesFaixa.length <= 3) {
    const n = partesFaixa.map(Number);
    if (n.length === 1) p.faixa = { min: 0, max: n[0] };
    else if (n.length === 2) p.faixa = { min: n[0], max: n[1] };
    else p.faixa = { min: n[0], step: n[1], max: n[2] };
    return;
  }
  // lista [a, b, c] ou [valor:Rótulo, ...]
  p.opcoes = corpo
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const [v, ...r] = item.split(":");
      const vs = v.trim();
      const valor = p.tipo === "numero" && RE_NUMERO.test(vs) ? Number(vs) : vs;
      return r.length ? { valor, rotulo: r.join(":").trim() } : { valor };
    });
}

export function parseCustomizer(src: string): ParamBruto[] {
  const linhas = src.replace(/\r\n?/g, "\n").split("\n");
  const params: ParamBruto[] = [];
  let secao = SECAO_PADRAO;
  let comentarioAcima: string | undefined;

  for (const linha of linhas) {
    if (RE_INICIO_CODIGO.test(linha)) break;
    const sec = linha.match(RE_SECAO);
    if (sec) {
      secao = sec[1].trim();
      if (secao.toLowerCase() === "hidden") break;
      comentarioAcima = undefined;
      continue;
    }
    const soComentario = linha.match(/^\s*\/\/\s?(.*)$/);
    if (soComentario) {
      comentarioAcima = soComentario[1].trim() || undefined;
      continue;
    }
    const nm = linha.match(RE_NOME);
    if (!nm) {
      comentarioAcima = undefined;
      continue;
    }
    const nome = nm[1];
    let resto = linha.slice(nm[0].length);
    let p: ParamBruto | null = null;

    if (resto.startsWith('"')) {
      const s = lerString(resto, 0);
      if (s) {
        p = { nome, tipo: "string", padrao: s.valor, secao };
        resto = resto.slice(s.fim);
      }
    } else {
      const fimValor = resto.indexOf(";");
      const bruto = (fimValor >= 0 ? resto.slice(0, fimValor) : resto).trim();
      resto = fimValor >= 0 ? resto.slice(fimValor) : "";
      if (bruto === "true" || bruto === "false") p = { nome, tipo: "booleano", padrao: bruto === "true", secao };
      else if (RE_NUMERO.test(bruto)) p = { nome, tipo: "numero", padrao: Number(bruto), inteiro: !bruto.includes("."), secao };
      // expressões (ex.: `tamanho * 3`) não são parâmetros do Customizer
    }

    if (p) {
      const pv = resto.indexOf(";");
      const aposPv = pv >= 0 ? resto.slice(pv + 1) : "";
      const inline = aposPv.match(/^\s*\/\/(.*)$/);
      if (inline) interpretarComentario(inline[1], p);
      if (!p.ajuda && comentarioAcima && !comentarioAcima.startsWith("[")) p.ajuda = comentarioAcima;
      params.push(p);
    }
    comentarioAcima = undefined;
  }
  return params;
}
