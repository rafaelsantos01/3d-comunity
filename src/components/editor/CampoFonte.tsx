"use client";
import { Check, ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { buscarFonte, FONTES } from "@/config/fontes";
import { cn } from "@/lib/cn";

/** @font-face das fontes empacotadas; o navegador só baixa a fonte quando ela é usada (ao abrir o seletor). */
export function EstilosFontes() {
  const css = FONTES.map(
    (f, i) => `@font-face{font-family:"lf-${i}";src:url("${f.arquivo}") format("truetype");font-display:swap;}`,
  ).join("");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

const familiaCss = (valor: string) => {
  const i = FONTES.findIndex((f) => f.valor === valor);
  return i >= 0 ? `"lf-${i}", sans-serif` : undefined;
};

export function CampoFonte({ id, rotulo, valor, textoPrevia, onChange }: { id: string; rotulo: string; valor: string; textoPrevia: string; onChange: (v: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const atual = buscarFonte(valor);
  const amostra = textoPrevia.trim() || "Seu texto aqui";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger
          id={id}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-borda bg-superficie px-3 text-left text-sm"
          aria-haspopup="listbox"
        >
          <span style={{ fontFamily: familiaCss(valor) }} className="truncate text-base">
            {atual?.rotulo ?? valor}
          </span>
          <ChevronDown className="size-4 shrink-0 text-suave" aria-hidden />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={4} className="z-50 max-h-80 w-[var(--radix-popover-trigger-width)] min-w-64 animate-surgir overflow-y-auto rounded-xl border border-borda bg-superficie p-1 shadow-lg">
            <div role="listbox" aria-label={rotulo}>
              {FONTES.map((f) => {
                const sel = f.valor === valor;
                return (
                  <button
                    key={f.valor}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    onClick={() => {
                      onChange(f.valor);
                      setAberto(false);
                    }}
                    className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-fundo focus:bg-fundo", sel && "bg-fundo")}
                  >
                    <Check className={cn("size-4 shrink-0", !sel && "invisible")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg leading-tight" style={{ fontFamily: familiaCss(f.valor) }}>
                        {amostra}
                      </span>
                      <span className="block text-xs text-suave">{f.rotulo}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
