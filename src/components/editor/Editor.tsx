"use client";
import { AlertCircle, Loader2, Redo2, RotateCcw, SlidersHorizontal, Undo2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { lerLocal, salvarLocal } from "@/lib/persistencia";
import type { TemplateCatalogo } from "@/lib/templates/schema";
import { lerDaUrl, padroes, paraUrl, validarParams } from "@/lib/templates/validador-params";
import { criarStoreEditor, type StoreEditor } from "@/store/editor";
import { ModalBaixar } from "../exportar/ModalBaixar";
import { Botao } from "../ui/botao";
import { EstilosFontes } from "./CampoFonte";
import { PainelControles } from "./PainelControles";
import { PainelInfo } from "./PainelInfo";
import { usePrevia } from "./usePrevia";

const Previa3D = dynamic(() => import("../previa/Previa3D"), { ssr: false });

function useMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

/** Carrega URL > localStorage > padrões, sempre validando. Só no cliente (depois da hidratação). */
function estadoInicial(t: TemplateCatalogo) {
  const sp = new URLSearchParams(window.location.search);
  const daUrl = lerDaUrl(t, sp);
  const entrada = Object.keys(daUrl).length ? daUrl : (lerLocal(t.id) ?? {});
  return validarParams(t, entrada);
}

function EditorCliente({ template: t }: { template: TemplateCatalogo }) {
  const [inicial] = useState(() => estadoInicial(t));
  const [store] = useState<StoreEditor>(() => criarStoreEditor(padroes(t), inicial.params));
  const [avisos, setAvisos] = useState(inicial.avisos);
  return <EditorCarregado template={t} store={store} avisos={avisos} fecharAviso={(i) => setAvisos((a) => a.filter((_, j) => j !== i))} />;
}

/** O estado vem da URL/localStorage, então o editor só monta no cliente (evita divergência de hidratação). */
export const Editor = dynamic(() => Promise.resolve(EditorCliente), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60dvh] items-center justify-center text-suave" role="status">
      <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Carregando editor…
    </div>
  ),
});

function EditorCarregado({ template: t, store, avisos, fecharAviso }: { template: TemplateCatalogo; store: StoreEditor; avisos: string[]; fecharAviso: (i: number) => void }) {
  const params = useStore(store, (s) => s.params);
  const podeDesfazer = useStore(store, (s) => s.passado.length > 0);
  const podeRefazer = useStore(store, (s) => s.futuro.length > 0);
  const { definir, desfazer, refazer, resetar } = store.getState();
  const previa = usePrevia(t, params);
  const mobile = useMobile();
  const [sheet, setSheet] = useState(false);
  const [emPe, setEmPe] = useState(true);
  const timerUrl = useRef<ReturnType<typeof setTimeout>>(undefined);

  // URL (só o que difere do padrão) + localStorage
  useEffect(() => {
    clearTimeout(timerUrl.current);
    timerUrl.current = setTimeout(() => {
      const qs = paraUrl(t, params).toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      salvarLocal(t.id, params);
    }, 300);
    return () => clearTimeout(timerUrl.current);
  }, [t, params]);

  // Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z e Ctrl+Y (fora de campos de texto, para não brigar com o desfazer nativo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input[type=text], textarea, [contenteditable=true]")) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) desfazer();
      else if ((k === "z" && e.shiftKey) || k === "y") refazer();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desfazer, refazer]);

  const corBase = String(params[t.papeis.corBase]);
  const corLetras = String(params[t.papeis.corLetras]);
  const controles = <PainelControles template={t} params={params} onChange={(n, v) => definir(n, v)} />;

  const barra = (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Ações do editor">
      <Botao onClick={desfazer} disabled={!podeDesfazer} aria-label="Desfazer" title="Desfazer (Ctrl+Z)">
        <Undo2 className="size-4" aria-hidden />
      </Botao>
      <Botao onClick={refazer} disabled={!podeRefazer} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)">
        <Redo2 className="size-4" aria-hidden />
      </Botao>
      <Botao onClick={resetar}>
        <RotateCcw className="size-4" aria-hidden /> Resetar
      </Botao>
      <div className="ml-auto flex items-center gap-2">
        <ModalBaixar template={t} params={params} desabilitado={!previa.base} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[380px_1fr] lg:py-6">
      <EstilosFontes />
      <h1 className="text-xl font-bold tracking-tight lg:col-span-2">{t.nome}</h1>

      {avisos.length > 0 && (
        <div className="space-y-2 lg:col-span-2" role="status">
          {avisos.map((a, i) => (
            <div key={i} className="flex animate-surgir items-center justify-between gap-2 rounded-lg border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm text-aviso">
              {a}
              <Botao variante="fantasma" aria-label="Fechar aviso" onClick={() => fecharAviso(i)}>
                <X className="size-4" aria-hidden />
              </Botao>
            </div>
          ))}
        </div>
      )}

      {!mobile && (
        <aside aria-label="Controles" className="order-2 rounded-2xl border border-borda bg-superficie px-4 lg:order-1 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto">
          {controles}
        </aside>
      )}

      <div className="order-1 space-y-4 lg:order-2">
        {barra}
        <div className="relative h-[46dvh] min-h-72 overflow-hidden rounded-2xl border border-borda lg:h-[62dvh]" data-testid="previa" aria-busy={previa.carregando}>
          {previa.base ? (
            <Previa3D base={previa.base} letras={previa.letras} corBase={corBase} corLetras={corLetras} emPe={emPe} caixa={previa.caixa} />
          ) : (
            <div className="flex h-full items-center justify-center bg-fundo text-sm text-suave">{previa.erro ? "Sem prévia" : "Preparando o motor 3D…"}</div>
          )}
          <div className="absolute left-3 top-3 flex overflow-hidden rounded-lg border border-borda bg-superficie text-sm shadow-sm" role="group" aria-label="Orientação">
            {[
              [true, "Em pé"],
              [false, "Deitado"],
            ].map(([v, r]) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={emPe === v}
                onClick={() => setEmPe(v as boolean)}
                className="px-3 py-1.5 aria-pressed:bg-marca aria-pressed:text-marca-texto"
              >
                {r as string}
              </button>
            ))}
          </div>
          {previa.carregando && (
            <div className="absolute right-3 top-3 flex items-center gap-2 rounded-lg bg-superficie/90 px-3 py-1.5 text-sm shadow-sm" role="status" data-testid="carregando">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Gerando prévia…
            </div>
          )}
          {previa.erro && !previa.carregando && (
            <div role="alert" className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-lg border border-perigo/40 bg-superficie/95 px-3 py-2 text-sm text-perigo shadow">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{previa.erro.mensagem}</span>
              {previa.erro.codigo === "TIMEOUT" && <Botao onClick={previa.tentarDeNovo}>Tentar de novo</Botao>}
            </div>
          )}
        </div>
        <PainelInfo caixa={previa.caixa} />
      </div>

      {mobile && (
        <Dialog.Root open={sheet} onOpenChange={setSheet}>
          <Dialog.Trigger asChild>
            <Botao variante="primario" className="fixed inset-x-4 bottom-4 z-30 h-11 shadow-lg">
              <SlidersHorizontal className="size-4" aria-hidden /> Personalizar
            </Botao>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] animate-surgir overflow-y-auto rounded-t-2xl border-t border-borda bg-superficie px-4 pb-8 pt-3 shadow-xl">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-borda" aria-hidden />
              <div className="flex items-center justify-between">
                <Dialog.Title className="font-semibold">Personalizar</Dialog.Title>
                <Dialog.Close asChild>
                  <Botao variante="fantasma" aria-label="Fechar">
                    <X className="size-4" aria-hidden />
                  </Botao>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">Controles do letreiro</Dialog.Description>
              {controles}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
