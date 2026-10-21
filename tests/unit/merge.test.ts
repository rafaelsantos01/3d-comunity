import { readFileSync } from "node:fs";
import { VALORES_FONTES } from "@/config/fontes";
import { construirCatalogo } from "@/lib/templates/construir-catalogo";
import { ErroTemplate, mesclarTemplate } from "@/lib/templates/merge";
import { parseCustomizer } from "@/lib/templates/parser";

const scad = readFileSync("tests/fixtures/templates/fixture-teste/modelo.scad", "utf8");
const jsonBase = JSON.parse(readFileSync("tests/fixtures/templates/fixture-teste/template.json", "utf8"));
const mesclar = (json: unknown, scadHash = "x") =>
  mesclarTemplate({ id: "fixture-teste", brutos: parseCustomizer(scad), json, fontes: VALORES_FONTES, scadHash });
const clonar = () => structuredClone(jsonBase);

function erroDe(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ErroTemplate);
    return (e as Error).message;
  }
  throw new Error("esperava erro");
}

describe("mesclarTemplate", () => {
  it("aplica rótulo, min/max/step, unidade, grupo e widget", () => {
    const t = mesclar(jsonBase);
    const altura = t.parametros.find((p) => p.nome === "altura")!;
    expect(altura).toMatchObject({ rotulo: "Altura", min: 1, max: 50, step: 0.5, unidade: "mm", grupo: "basico", widget: "numero" });
    expect(t.parametros.find((p) => p.nome === "cor")!.widget).toBe("cor");
    expect(t.parametros.find((p) => p.nome === "forma")!.opcoes?.[0]).toMatchObject({ valor: "quadrado", rotulo: "Quadrado" });
  });
  it("esconde parte e coloca parâmetro sem entrada no grupo avançado", () => {
    const t = mesclar(jsonBase);
    expect(t.parametros.find((p) => p.nome === "parte")!.oculto).toBe(true);
    expect(t.parametros.find((p) => p.nome === "extra")).toMatchObject({ grupo: "avancado", rotulo: "Extra" });
  });
  it("aponta o campo quando o tipo do json está errado", () => {
    const j = clonar();
    j.parametros.altura.min = "um";
    expect(erroDe(() => mesclar(j))).toContain("parametros.altura.min");
  });
  it("falha com parâmetro inexistente", () => {
    const j = clonar();
    j.parametros.nao_existe = { rotulo: "X" };
    expect(erroDe(() => mesclar(j))).toContain('parametros.nao_existe: parâmetro "nao_existe" não existe');
  });
  it("falha com override de tipo errado", () => {
    const j = clonar();
    j.exportacao.multicor.overrides = { fixas: "sim" };
    expect(erroDe(() => mesclar(j))).toContain("exportacao.multicor.overrides.fixas: esperado booleano");
  });
  it("falha com padrão fora de min/max", () => {
    const j = clonar();
    j.parametros.altura.max = 2;
    expect(erroDe(() => mesclar(j))).toContain("parametros.altura: padrão 10 fora de [1, 2]");
  });
  it("falha com campo desconhecido e com parte inexistente", () => {
    const j = clonar();
    j.parametros.altura.rotullo = "x";
    expect(erroDe(() => mesclar(j))).toContain("parametros.altura");
    const k = clonar();
    k.previa.base.parte = "nada";
    expect(erroDe(() => mesclar(k))).toContain("previa.base.parte");
  });
  it("a URL do .scad muda quando o hash do arquivo muda (não fica presa na Cache API)", () => {
    const a = mesclar(jsonBase, "aaa").scadUrl;
    const b = mesclar(jsonBase, "bbb").scadUrl;
    expect(a).toBe("/templates/fixture-teste/modelo.scad?v=aaa");
    expect(b).not.toBe(a);
  });
  it("os templates reais passam na validação", () => {
    const { templates } = construirCatalogo("templates");
    expect(templates.map((t) => t.id)).toEqual(["letreiro-1-linha", "letreiro-2-linhas"]);
    const t1 = templates[0];
    expect(t1.parametros.find((p) => p.nome === "fonte")!.padrao).toBe("Archivo Black");
  });
});
