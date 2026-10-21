import { readFileSync } from "node:fs";
import { parseCustomizer } from "@/lib/templates/parser";

const src = `
/* [Texto] */
texto = "Olá \\"mundo\\""; // texto do letreiro
// tamanho da fonte em mm
tamanho = 16;
espacamento = 1.00;
ativo = true;
desligado = false; // [x] não é lista válida? vira ajuda
estilo = "a"; // [a, b, c]
rotulado = "r"; // [r:Retângulo, c:Contorno]
faixa = 5; // [0:10]
faixa_step = 2; // [0:0.5:10]
numeros = 2; // [1, 2, 3]
expr = tamanho * 3;

/* [Hidden] */
escondido = 1;
module m(){}
`;

describe("parseCustomizer", () => {
  const ps = parseCustomizer(src);
  const p = (n: string) => ps.find((x) => x.nome === n)!;

  it("lê string com escapes e ajuda inline", () => {
    expect(p("texto")).toMatchObject({ tipo: "string", padrao: 'Olá "mundo"', secao: "Texto", ajuda: "texto do letreiro" });
  });
  it("lê inteiro e usa o comentário da linha de cima como ajuda", () => {
    expect(p("tamanho")).toMatchObject({ tipo: "numero", padrao: 16, inteiro: true, ajuda: "tamanho da fonte em mm" });
  });
  it("trata 1.00 como decimal", () => {
    expect(p("espacamento")).toMatchObject({ tipo: "numero", padrao: 1, inteiro: false });
  });
  it("lê booleanos", () => {
    expect(p("ativo").padrao).toBe(true);
    expect(p("desligado").padrao).toBe(false);
  });
  it("lê listas de opções, com e sem rótulo", () => {
    expect(p("estilo").opcoes).toEqual([{ valor: "a" }, { valor: "b" }, { valor: "c" }]);
    expect(p("rotulado").opcoes).toEqual([
      { valor: "r", rotulo: "Retângulo" },
      { valor: "c", rotulo: "Contorno" },
    ]);
    expect(p("numeros").opcoes?.map((o) => o.valor)).toEqual([1, 2, 3]);
  });
  it("lê faixas [min:max] e [min:step:max]", () => {
    expect(p("faixa").faixa).toEqual({ min: 0, max: 10 });
    expect(p("faixa_step").faixa).toEqual({ min: 0, step: 0.5, max: 10 });
  });
  it("ignora expressões, [Hidden] e o que vem depois", () => {
    expect(ps.find((x) => x.nome === "expr")).toBeUndefined();
    expect(ps.find((x) => x.nome === "escondido")).toBeUndefined();
  });
  it("para no primeiro module", () => {
    expect(parseCustomizer("a = 1;\nmodule x(){}\nb = 2;").map((x) => x.nome)).toEqual(["a"]);
  });
  it("usa seção padrão quando não há seção", () => {
    expect(parseCustomizer("a = 1;")[0].secao).toBe("Parâmetros");
  });

  it.each(["letreiro-1-linha", "letreiro-2-linhas"])("schema do template real %s (snapshot)", (id) => {
    const r = parseCustomizer(readFileSync(`templates/${id}/modelo.scad`, "utf8"));
    expect(r.find((x) => x.nome === "parte")?.opcoes?.map((o) => o.valor)).toEqual(["previa", "base", "letras_fixas", "letras_soltas", "base_unica"]);
    expect(r.find((x) => x.nome === "$fn")).toBeUndefined();
    expect(r).toMatchSnapshot();
  });
});
