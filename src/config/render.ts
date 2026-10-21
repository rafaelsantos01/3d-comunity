// Configuração central de render. A versão do OpenSCAD precisa bater com scripts/fetch-openscad.mjs.
export const OPENSCAD_VERSAO = "2025.01.19";
export const OPENSCAD_URL = `/openscad/${OPENSCAD_VERSAO}/openscad.js`;

export const CONFIG_RENDER = {
  fnPrevia: 24,
  fnExportacao: 80,
  debounceMs: 600,
  timeoutMs: 30_000,
  alturaCamadaPadrao: 0.2,
};
