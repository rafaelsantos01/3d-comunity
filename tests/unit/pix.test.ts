import { campo, crc16, gerarPayloadPix, normalizarTexto, validarConfigPix, type ConfigPix } from "@/lib/pix/br-code";

const REFERENCIA: ConfigPix = { chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "BRASILIA", txid: "***" };
// exemplo do manual do BR Code (Bacen)
const PAYLOAD_REFERENCIA =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

/** Lê os campos TLV de nível superior. Não dá para usar includes("54"): "54" pode aparecer dentro de um valor. */
function lerCampos(payload: string): { id: string; valor: string }[] {
  const campos = [];
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const tamanho = Number(payload.slice(i + 2, i + 4));
    campos.push({ id, valor: payload.slice(i + 4, i + 4 + tamanho) });
    i += 4 + tamanho;
  }
  return campos;
}

describe("crc16", () => {
  it("bate com o valor de verificação do CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("completa com zeros à esquerda", () => {
    expect(crc16("")).toBe("FFFF");
    expect(crc16("a")).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe("gerarPayloadPix", () => {
  it("gera o payload de referência do manual do BR Code", () => {
    expect(gerarPayloadPix(REFERENCIA)).toBe(PAYLOAD_REFERENCIA);
  });

  it("tem os campos na ordem do Pix estático e sem o campo 54 (valor livre)", () => {
    const campos = lerCampos(gerarPayloadPix({ ...REFERENCIA, chave: "doe54@exemplo.com.br" }));
    expect(campos.map((c) => c.id)).toEqual(["00", "26", "52", "53", "58", "59", "60", "62", "63"]);
    expect(campos.find((c) => c.id === "26")!.valor).toBe(campo("00", "br.gov.bcb.pix") + campo("01", "doe54@exemplo.com.br"));
    expect(campos.find((c) => c.id === "53")!.valor).toBe("986");
    expect(campos.find((c) => c.id === "58")!.valor).toBe("BR");
  });

  it("termina com o CRC do restante, incluindo 6304", () => {
    const payload = gerarPayloadPix({ ...REFERENCIA, chave: "+5511999998888", txid: "APOIO2026" });
    expect(payload.slice(-8, -4)).toBe("6304");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("declara o tamanho certo de nome e cidade normalizados", () => {
    const config = validarConfigPix({ chave: "fulano@exemplo.com", nome: "José da Silva Conceição Albuquerque", cidade: "São José dos Campos" })!;
    const campos = lerCampos(gerarPayloadPix(config));
    expect(campos.find((c) => c.id === "59")!.valor).toBe("Jose da Silva Conceicao A");
    expect(campos.find((c) => c.id === "60")!.valor).toBe("Sao Jose dos Ca");
  });
});

describe("normalizarTexto", () => {
  it("remove acentos e corta no limite", () => {
    const nome = normalizarTexto("José da Silva Conceição Albuquerque", 25);
    expect(nome).toHaveLength(25);
    expect(nome).toMatch(/^[A-Za-z0-9 ]+$/);
    expect(normalizarTexto("São José dos Campos", 15)).toBe("Sao Jose dos Ca");
  });

  it("remove símbolos, colapsa espaços e não deixa espaço no fim após o corte", () => {
    expect(normalizarTexto("  Ana   &  Cia.  ", 25)).toBe("Ana Cia");
    expect(normalizarTexto("Rio de Janeiro", 4)).toBe("Rio");
    expect(normalizarTexto("ÇÃÕ", 10)).toBe("CAO");
  });
});

describe("validarConfigPix", () => {
  const base = { chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "Brasília" };

  it("normaliza e usa *** como txid padrão", () => {
    expect(validarConfigPix(base)).toEqual({ ...base, cidade: "Brasilia", txid: "***" });
    expect(validarConfigPix({ ...base, txid: "  " })!.txid).toBe("***");
    expect(validarConfigPix({ ...base, txid: "Apoio2026" })!.txid).toBe("Apoio2026");
  });

  it("preserva chaves de e-mail e telefone", () => {
    expect(validarConfigPix({ ...base, chave: " fulano+pix@exemplo.com " })!.chave).toBe("fulano+pix@exemplo.com");
    expect(validarConfigPix({ ...base, chave: "+5561999998888" })!.chave).toBe("+5561999998888");
  });

  it.each([
    ["sem chave", { ...base, chave: undefined }],
    ["chave vazia", { ...base, chave: "   " }],
    ["chave com mais de 77 caracteres", { ...base, chave: "a".repeat(78) }],
    ["chave com espaço", { ...base, chave: "abc def" }],
    ["chave com acento", { ...base, chave: "joão@exemplo.com" }],
    ["sem nome", { ...base, nome: undefined }],
    ["nome só com símbolos", { ...base, nome: "!!! ###" }],
    ["sem cidade", { ...base, cidade: "" }],
    ["txid com símbolo", { ...base, txid: "apoio-2026" }],
    ["txid com mais de 25 caracteres", { ...base, txid: "a".repeat(26) }],
  ])("devolve null: %s", (_, cru) => {
    expect(validarConfigPix(cru)).toBeNull();
  });

  it("aceita chave com exatamente 77 caracteres", () => {
    const chave = "a".repeat(77);
    const payload = gerarPayloadPix(validarConfigPix({ ...base, chave })!);
    expect(lerCampos(payload)[1]).toEqual({ id: "26", valor: campo("00", "br.gov.bcb.pix") + campo("01", chave) });
  });
});
