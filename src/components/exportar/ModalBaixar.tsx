"use client";
import JSZip from "jszip";
import { Download, Loader2, X } from "lucide-react";
import { Dialog, RadioGroup } from "radix-ui";
import { useState } from "react";
import { CONFIG_RENDER } from "@/config/render";
import { cn } from "@/lib/cn";
import { alturaTrocaCor, montarJob, MODOS, slugDoTemplate, textoInstrucoes } from "@/lib/export/modos";
import { gerar3MF } from "@/lib/export/threemf";
import { ErroRender } from "@/lib/render/erros";
import type { ModoExportacao, TemplateCatalogo } from "@/lib/templates/schema";
import type { Params } from "@/lib/templates/validador-params";
import { checarGlifos } from "../editor/usePrevia";
import { Botao } from "../ui/botao";

function baixar(bytes: Uint8Array | Blob, nome: string) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ModalBaixar({ template: t, params, desabilitado }: { template: TemplateCatalogo; params: Params; desabilitado?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<ModoExportacao>("multicor");
  const [camada, setCamada] = useState(CONFIG_RENDER.alturaCamadaPadrao);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const slug = slugDoTemplate(t, params);
  const zTroca = alturaTrocaCor(t, params, camada);
  // um glifo ausente sairia como .notdef no STL, sem erro do OpenSCAD: não deixa exportar
  const glifo = checarGlifos(t, params);

  async function exportar() {
    setErro(null);
    if (glifo) {
      setErro(glifo);
      return;
    }
    const m = t.exportacao[modo];
    const { criarCliente } = await import("@/lib/render/criar-cliente");
    const cliente = criarCliente({ timeoutMs: CONFIG_RENDER.timeoutMs * 3, debounceMs: 0 });
    try {
      const zip = new JSZip();
      const pecas: { nome: string; cor: string; stl: ArrayBuffer }[] = [];
      for (const [i, p] of m.partes.entries()) {
        setProgresso(`Gerando ${p.parte} (${i + 1}/${m.partes.length})…`);
        const stl = await cliente.renderizar(montarJob(t, params, p.parte, m.overrides, CONFIG_RENDER.fnExportacao));
        zip.file(`${slug}_${p.parte}.stl`, stl);
        pecas.push({ nome: p.parte, cor: String(params[p.cor === "base" ? t.papeis.corBase : t.papeis.corLetras]), stl });
      }
      if (modo === "multicor") {
        setProgresso("Montando 3MF…");
        zip.file(`${slug}.3mf`, await gerar3MF(slug, pecas));
      }
      if (modo === "unico") zip.file(`${slug}_instrucoes.txt`, textoInstrucoes(slug, zTroca, camada));
      baixar(await zip.generateAsync({ type: "blob" }), `${slug}_${modo}.zip`);
      setProgresso(null);
    } catch (e) {
      setProgresso(null);
      setErro(e instanceof ErroRender ? e.message : "Não foi possível gerar os arquivos.");
    } finally {
      cliente.encerrar();
    }
  }

  const fmt = (n: number) => n.toFixed(2).replace(".", ",");

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !progresso && setAberto(v)}>
      {glifo && (
        <span id="motivo-baixar" className="text-xs text-perigo">
          Corrija o texto para baixar
        </span>
      )}
      <Dialog.Trigger asChild>
        <Botao variante="primario" disabled={desabilitado || !!glifo} aria-describedby={glifo ? "motivo-baixar" : undefined}>
          <Download className="size-4" aria-hidden /> Baixar
        </Botao>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 animate-surgir overflow-y-auto rounded-2xl border border-borda bg-superficie p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Baixar arquivos para impressão</Dialog.Title>
              <Dialog.Description className="text-sm text-suave">Escolha como você vai imprimir. Os arquivos saem em qualidade final.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Botao variante="fantasma" aria-label="Fechar" disabled={!!progresso}>
                <X className="size-4" aria-hidden />
              </Botao>
            </Dialog.Close>
          </div>

          <RadioGroup.Root value={modo} onValueChange={(v) => setModo(v as ModoExportacao)} className="space-y-2" aria-label="Modo de impressão">
            {MODOS.map((md) => (
              <RadioGroup.Item
                key={md.id}
                value={md.id}
                className={cn(
                  "block w-full rounded-xl border border-borda p-3 text-left transition hover:border-marca",
                  "data-[state=checked]:border-marca data-[state=checked]:bg-marca/10",
                )}
              >
                <span className="block text-sm font-semibold">{md.titulo}</span>
                <span className="block text-xs text-suave">{md.quando}</span>
                <span className="mt-1 block font-mono text-[11px] text-suave">
                  {t.exportacao[md.id].partes.map((p) => `${slug}_${p.parte}.stl`).join(" + ")}
                  {md.id === "multicor" && ` + ${slug}.3mf`}
                </span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>

          {modo === "unico" && (
            <div className="mt-4 space-y-2 rounded-xl bg-fundo p-3 text-sm">
              <label htmlFor="altura-camada" className="flex items-center justify-between gap-2 font-medium">
                Altura da camada (mm)
                <input
                  id="altura-camada"
                  type="number"
                  min={0.04}
                  max={0.6}
                  step={0.02}
                  value={camada}
                  onChange={(e) => Number(e.target.value) > 0 && setCamada(Number(e.target.value))}
                  className="h-8 w-20 rounded-md border border-borda bg-superficie px-2 text-right"
                />
              </label>
              <p role="status">
                Troque o filamento na altura <strong>Z = {fmt(zTroca)} mm</strong> (espessura da base + uma camada).
              </p>
            </div>
          )}

          {erro && (
            <p role="alert" className="mt-4 text-sm text-perigo">
              {erro}
            </p>
          )}
          <div className="mt-6 flex items-center justify-end gap-3">
            {progresso && (
              <span className="flex items-center gap-2 text-sm text-suave" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden /> {progresso}
              </span>
            )}
            <Botao variante="primario" onClick={exportar} disabled={!!progresso}>
              <Download className="size-4" aria-hidden /> Baixar .zip
            </Botao>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
