import JSZip from "jszip";
import { construirCatalogo } from "@/lib/templates/construir-catalogo";
import { montarArgs, toScadLiteral } from "@/lib/render/args";
import { interpretarLog } from "@/lib/render/erros";
import { gerarSlug } from "@/lib/slug";
import { excedeMesa } from "@/lib/mesa";
import { bboxStl, dimensoes, uniaoBBox } from "@/lib/geometria/bbox";
import { gerar3MF } from "@/lib/export/threemf";
import { lerDaUrl, paraUrl, validarParams } from "@/lib/templates/validador-params";
import { caracteresAusentes } from "@/lib/cobertura";
import { criarStoreEditor, LIMITE_HISTORICO } from "@/store/editor";
import { alturaTrocaCor, montarJob, slugDoTemplate } from "@/lib/export/modos";

const [t1, t2] = construirCatalogo("templates").templates;

describe("toScadLiteral / montarArgs", () => {
  it("escapa aspas, barra, quebras de linha e mantém unicode", () => {
    expect(toScadLiteral('a"b\\c\nd')).toBe('"a\\"b\\\\c\\nd"');
    expect(toScadLiteral("ção ✓")).toBe('"ção ✓"');
    expect(toScadLiteral('"; cube(1000); x="')).toBe('"\\"; cube(1000); x=\\""');
    expect(toScadLiteral(1.5)).toBe("1.5");
    expect(toScadLiteral(false)).toBe("false");
  });
  it("rejeita NaN/Infinity e nomes fora da whitelist", () => {
    expect(() => toScadLiteral(NaN)).toThrow();
    expect(() => toScadLiteral(Infinity)).toThrow();
    expect(() => montarArgs({ "x;cube(1)": 1 }, new Set(["texto"]))).toThrow(/não permitido/);
    expect(montarArgs({ texto: "a", $fn: 24 }, new Set(["texto"]))).toContain('texto="a"');
  });
});

describe("interpretarLog", () => {
  it("mapeia geometria vazia, erro genérico e sucesso", () => {
    expect(interpretarLog("WARNING: Current top level object is empty.", false)?.codigo).toBe("GEOMETRIA_VAZIA");
    expect(interpretarLog("ERROR: Parser error", false)?.message).toMatch(/Não foi possível/);
    expect(interpretarLog("Rendering finished", true)).toBeNull();
  });
});

describe("slug", () => {
  it.each([
    [["JP Personalizados"], "jp-personalizados"],
    [["Café & Pão  Ação"], "cafe-pao-acao"],
    [["", "  "], "letreiro"],
    [["JP", "PERSONALIZADOS"], "jp-personalizados"],
    [["--Olá!!--"], "ola"],
  ])("%j → %s", (entrada, esperado) => expect(gerarSlug(...entrada)).toBe(esperado));
  it("usa os papeis de slug do template", () => {
    expect(slugDoTemplate(t2, { linha1: "Bar", linha2: "do Zé" })).toBe("bar-do-ze");
  });
});

describe("excedeMesa", () => {
  const mesa = { largura: 180, profundidade: 180 };
  it("igual ao limite não excede; maior em X ou Y excede", () => {
    expect(excedeMesa({ largura: 180, altura: 180 }, mesa)).toBe(false);
    expect(excedeMesa({ largura: 180.1, altura: 10 }, mesa)).toBe(true);
    expect(excedeMesa({ largura: 10, altura: 181 }, mesa)).toBe(true);
    expect(excedeMesa({ largura: 250, altura: 100 }, { largura: 300, profundidade: 120 })).toBe(false);
  });
});

function stlSintetico(tris: number[][][]): ArrayBuffer {
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, tris.length, true);
  tris.forEach((t, i) => t.forEach((p, v) => p.forEach((c, k) => dv.setFloat32(84 + i * 50 + 12 + v * 12 + k * 4, c, true))));
  return buf;
}

describe("bbox e 3MF", () => {
  const a = stlSintetico([[[0, 0, 0], [10, 0, 0], [0, 5, 2]]]);
  const b = stlSintetico([[[-1, 1, 2], [3, 1, 2], [3, 8, 6]]]);
  it("calcula bbox e união", () => {
    expect(bboxStl(a)).toEqual({ min: [0, 0, 0], max: [10, 5, 2] });
    expect(dimensoes(uniaoBBox(bboxStl(a), bboxStl(b))!)).toEqual({ largura: 11, altura: 8, profundidade: 6 });
  });
  it("3MF tem 2 meshes num objeto composto com cores", async () => {
    const bytes = await gerar3MF("Letreiro", [
      { nome: "base", cor: "#2b4c7e", stl: a },
      { nome: "letras", cor: "#ffffff", stl: b },
    ]);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("3D/3dmodel.model")!.async("string");
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(xml.match(/<mesh>/g)).toHaveLength(2);
    expect(xml).toContain('<components><component objectid="2"/><component objectid="3"/></components>');
    expect(xml).toContain('displaycolor="#2B4C7EFF"');
    expect(xml).toContain('<build><item objectid="4"/></build>');
    expect(new DOMParserPolyfill().ok(xml)).toBe(true);
  });
});

// validação mínima de XML bem formado sem depender do DOM
class DOMParserPolyfill {
  ok(xml: string) {
    const pilha: string[] = [];
    for (const m of xml.replace(/<\?[^>]*\?>/g, "").matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
      if (m[3]) continue;
      if (m[1]) {
        if (pilha.pop() !== m[2]) return false;
      } else pilha.push(m[2]);
    }
    return pilha.length === 0;
  }
}

describe("validarParams / URL", () => {
  it("valores inválidos caem no padrão e desconhecidos são ignorados", () => {
    const { params } = validarParams(t1, { tamanho: 9999, texto: "Oi", hack: "x", cor_base: "red", parte: "letras_soltas" });
    expect(params.tamanho).toBe(16);
    expect(params.texto).toBe("Oi");
    expect(params.cor_base).toBe("#2B4C7E");
    expect(params.parte).toBe("previa");
    expect("hack" in params).toBe(false);
  });
  it("fonte fora da lista volta ao padrão com aviso", () => {
    const r = validarParams(t1, { fonte: "Arial Black" });
    expect(r.params.fonte).toBe("Archivo Black");
    expect(r.avisos[0]).toMatch(/Arial Black/);
  });
  it("ida e volta pela URL só com o que difere do padrão", () => {
    const sp = paraUrl(t2, { ...validarParams(t2, {}).params, linha1: "AB", tamanho1: 40, estilo_base: "degrau" });
    expect(sp.toString()).toBe("linha1=AB&tamanho1=40&estilo_base=degrau");
    expect(validarParams(t2, lerDaUrl(t2, sp)).params).toMatchObject({ linha1: "AB", tamanho1: 40, estilo_base: "degrau" });
    expect(validarParams(t2, lerDaUrl(t2, new URLSearchParams("tamanho1=abc&estilo_base=zz"))).params).toMatchObject({ tamanho1: 55, estilo_base: "retangulo" });
  });
});

describe("cobertura de glifos", () => {
  const mapa = { F: [[32, 126] as [number, number]] };
  it("lista caracteres ausentes, ignora espaços", () => {
    expect(caracteresAusentes("Ola ção", "F", mapa)).toEqual(["ç", "ã"]);
    expect(caracteresAusentes("abc", "Outra", mapa)).toEqual([]);
  });
});

describe("modos de exportação", () => {
  it("o modo sobrepõe as flags das letras e força a parte", () => {
    const j = montarJob(t2, { ...validarParams(t2, {}).params, linha1_fixa: false }, "base", t2.exportacao.multicor.overrides, 80);
    expect(j.params).toMatchObject({ linha1_fixa: true, linha2_fixa: true, parte: "base", previa_em_pe: false });
    expect(j.fn).toBe(80);
    expect(j.fontes).toEqual(["/fontes/playfairdisplay/PlayfairDisplay-700.ttf"]);
  });
  it("altura da troca de cor = espessura da base + uma camada", () => {
    expect(alturaTrocaCor(t1, { base_espessura: 12 }, 0.2)).toBeCloseTo(12.2);
  });
});

describe("store do editor", () => {
  const criar = () => criarStoreEditor({ a: 1, b: "x" });
  it("definir, desfazer, refazer e resetar", () => {
    const s = criar();
    s.getState().definir("a", 2, { agora: 0 });
    s.getState().definir("b", "y", { agora: 1000 });
    expect(s.getState().params).toEqual({ a: 2, b: "y" });
    s.getState().desfazer();
    expect(s.getState().params).toEqual({ a: 2, b: "x" });
    s.getState().refazer();
    expect(s.getState().params).toEqual({ a: 2, b: "y" });
    s.getState().resetar();
    expect(s.getState().params).toEqual({ a: 1, b: "x" });
    s.getState().desfazer();
    expect(s.getState().params).toEqual({ a: 2, b: "y" });
  });
  it("edições rápidas no mesmo campo viram um passo só", () => {
    const s = criar();
    s.getState().definir("a", 2, { agora: 0 });
    s.getState().definir("a", 3, { agora: 100 });
    s.getState().definir("a", 4, { agora: 200 });
    s.getState().desfazer();
    expect(s.getState().params.a).toBe(1);
  });
  it("nova edição limpa o futuro e o histórico tem limite", () => {
    const s = criar();
    for (let i = 0; i < LIMITE_HISTORICO + 20; i++) s.getState().definir("a", i + 10, { agora: i * 1000 });
    expect(s.getState().passado.length).toBe(LIMITE_HISTORICO);
    s.getState().desfazer();
    s.getState().definir("b", "z", { agora: 1e9 });
    expect(s.getState().futuro).toEqual([]);
  });
});
