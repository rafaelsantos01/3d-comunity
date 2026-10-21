export type CodigoErro = "TIMEOUT" | "GEOMETRIA_VAZIA" | "FONTE_INDISPONIVEL" | "GLIFO_AUSENTE" | "ERRO_SCAD" | "CARREGAMENTO" | "CANCELADO";

export class ErroRender extends Error {
  constructor(
    public readonly codigo: CodigoErro,
    mensagem: string,
    public readonly log?: string,
  ) {
    super(mensagem);
  }
}

export const MENSAGENS: Record<CodigoErro, string> = {
  TIMEOUT: "Render demorou demais. Tente reduzir o texto ou o tamanho e tente de novo.",
  GEOMETRIA_VAZIA: "Nada para mostrar: o texto está vazio ou a combinação de parâmetros não gera peça.",
  FONTE_INDISPONIVEL: "Fonte indisponível. Escolha outra fonte da lista.",
  GLIFO_AUSENTE: "Fonte não suporta este caractere.",
  ERRO_SCAD: "Não foi possível gerar o modelo com esses parâmetros.",
  CARREGAMENTO: "Não foi possível carregar o motor 3D. Verifique a conexão e recarregue a página.",
  CANCELADO: "Render cancelado.",
};

/** Traduz a saída de erro do OpenSCAD para um código e mensagem amigável em PT-BR. */
export function interpretarLog(log: string, gerouArquivo: boolean): ErroRender | null {
  if (/Current top level object is empty|top level object is empty/i.test(log)) return new ErroRender("GEOMETRIA_VAZIA", MENSAGENS.GEOMETRIA_VAZIA, log);
  if (/Can't get font|No match for font|font.*not found/i.test(log)) return new ErroRender("FONTE_INDISPONIVEL", MENSAGENS.FONTE_INDISPONIVEL, log);
  if (/ERROR:/.test(log) || !gerouArquivo) return new ErroRender("ERRO_SCAD", MENSAGENS.ERRO_SCAD, log);
  return null;
}
