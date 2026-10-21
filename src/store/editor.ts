import { createStore } from "zustand/vanilla";
import type { Params } from "../lib/templates/validador-params";
import type { ValorParam } from "../lib/templates/parser";

export const LIMITE_HISTORICO = 100;
export const JANELA_COALESCER_MS = 400;

export interface EstadoEditor {
  params: Params;
  padroes: Params;
  passado: Params[];
  futuro: Params[];
  ultimaEdicao: { nome: string; em: number } | null;
  definir: (nome: string, valor: ValorParam, opts?: { coalescer?: boolean; agora?: number }) => void;
  substituir: (params: Params) => void;
  desfazer: () => void;
  refazer: () => void;
  resetar: () => void;
}

/** Store por template. Edições seguidas no mesmo campo (slider/digitação) viram um passo só no histórico. */
export function criarStoreEditor(padroes: Params, iniciais: Params = padroes) {
  return createStore<EstadoEditor>()((set, get) => {
    const empilhar = (anterior: Params) => [...get().passado, anterior].slice(-LIMITE_HISTORICO);
    return {
      params: iniciais,
      padroes,
      passado: [],
      futuro: [],
      ultimaEdicao: null,
      definir: (nome, valor, opts = {}) => {
        const { params, ultimaEdicao } = get();
        if (params[nome] === valor) return;
        const agora = opts.agora ?? Date.now();
        const juntar =
          (opts.coalescer ?? true) && ultimaEdicao?.nome === nome && agora - ultimaEdicao.em < JANELA_COALESCER_MS && get().passado.length > 0;
        set({
          params: { ...params, [nome]: valor },
          passado: juntar ? get().passado : empilhar(params),
          futuro: [],
          ultimaEdicao: { nome, em: agora },
        });
      },
      substituir: (novos) => set({ params: novos, passado: empilhar(get().params), futuro: [], ultimaEdicao: null }),
      desfazer: () => {
        const { passado, params, futuro } = get();
        if (!passado.length) return;
        set({ params: passado[passado.length - 1], passado: passado.slice(0, -1), futuro: [params, ...futuro], ultimaEdicao: null });
      },
      refazer: () => {
        const { passado, params, futuro } = get();
        if (!futuro.length) return;
        set({ params: futuro[0], passado: [...passado, params], futuro: futuro.slice(1), ultimaEdicao: null });
      },
      resetar: () => {
        const { params } = get();
        set({ params: get().padroes, passado: empilhar(params), futuro: [], ultimaEdicao: null });
      },
    };
  });
}

export type StoreEditor = ReturnType<typeof criarStoreEditor>;
