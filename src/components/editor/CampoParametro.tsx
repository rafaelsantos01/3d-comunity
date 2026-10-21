"use client";
import { RadioGroup, Slider, Switch } from "radix-ui";
import { useState } from "react";
import type { ValorParam } from "@/lib/templates/parser";
import type { ParamDef } from "@/lib/templates/schema";
import { cn } from "@/lib/cn";
import { CampoFonte } from "./CampoFonte";
import { IconeOpcao } from "./icones-base";

export interface PropsCampo {
  def: ParamDef;
  valor: ValorParam;
  onChange: (v: ValorParam) => void;
  /** texto que a fonte vai desenhar (para a prévia no seletor de fonte) */
  textoPrevia?: string;
}

const idDe = (nome: string) => `campo-${nome}`;

function Ajuda({ def }: { def: ParamDef }) {
  return def.ajuda ? (
    <p id={`${idDe(def.nome)}-ajuda`} className="text-xs text-suave">
      {def.ajuda}
    </p>
  ) : null;
}

function CampoNumero({ def, valor, onChange }: PropsCampo) {
  const v = Number(valor);
  const [texto, setTexto] = useState(String(v));
  const [anterior, setAnterior] = useState(v);
  if (anterior !== v) {
    // valor mudou por fora (slider, desfazer, resetar): sincroniza o texto digitável
    setAnterior(v);
    setTexto(String(v));
  }
  const id = idDe(def.nome);
  const commit = (s: string) => {
    const n = Number(s.replace(",", "."));
    if (s.trim() !== "" && Number.isFinite(n)) onChange(Math.min(def.max ?? n, Math.max(def.min ?? n, n)));
    else setTexto(String(v));
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {def.rotulo}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={def.min}
            max={def.max}
            step={def.step}
            value={texto}
            aria-describedby={def.ajuda ? `${id}-ajuda` : undefined}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
            className="h-8 w-20 rounded-md border border-borda bg-superficie px-2 text-right text-sm tabular-nums"
          />
          {def.unidade && <span className="w-7 text-xs text-suave">{def.unidade}</span>}
        </div>
      </div>
      <Slider.Root
        className="relative flex h-5 touch-none select-none items-center"
        min={def.min}
        max={def.max}
        step={def.step}
        value={[v]}
        onValueChange={([n]) => onChange(n)}
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-borda">
          <Slider.Range className="absolute h-full rounded-full bg-marca" />
        </Slider.Track>
        <Slider.Thumb aria-label={def.rotulo} className="block size-4 rounded-full border-2 border-marca bg-superficie shadow transition hover:scale-110" />
      </Slider.Root>
      <Ajuda def={def} />
    </div>
  );
}

function CampoCards({ def, valor, onChange }: PropsCampo) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium">{def.rotulo}</legend>
      <RadioGroup.Root
        value={String(valor)}
        onValueChange={(s) => onChange(def.opcoes!.find((o) => String(o.valor) === s)!.valor)}
        className="grid grid-cols-3 gap-2"
        aria-label={def.rotulo}
      >
        {def.opcoes!.map((o) => (
          <RadioGroup.Item
            key={String(o.valor)}
            value={String(o.valor)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border border-borda bg-superficie p-2 text-xs font-medium text-suave transition",
              "hover:border-marca data-[state=checked]:border-marca data-[state=checked]:bg-marca/10 data-[state=checked]:text-texto",
            )}
          >
            <IconeOpcao nome={o.icone} rotulo={o.rotulo} />
            {o.rotulo}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <Ajuda def={def} />
    </fieldset>
  );
}

export function CampoParametro(props: PropsCampo) {
  const { def, valor, onChange } = props;
  const id = idDe(def.nome);
  const descr = def.ajuda ? `${id}-ajuda` : undefined;

  switch (def.widget) {
    case "numero":
      return <CampoNumero {...props} />;
    case "cards":
      return <CampoCards {...props} />;
    case "fonte":
      return <CampoFonte id={id} rotulo={def.rotulo} valor={String(valor)} textoPrevia={props.textoPrevia ?? ""} onChange={onChange} />;
    case "booleano":
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={id} className="text-sm font-medium">
              {def.rotulo}
            </label>
            <Switch.Root
              id={id}
              checked={Boolean(valor)}
              onCheckedChange={onChange}
              aria-describedby={descr}
              className="relative h-6 w-11 shrink-0 rounded-full bg-borda transition data-[state=checked]:bg-marca"
            >
              <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>
          <Ajuda def={def} />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {def.rotulo}
          </label>
          <select
            id={id}
            value={String(valor)}
            aria-describedby={descr}
            onChange={(e) => onChange(def.opcoes!.find((o) => String(o.valor) === e.target.value)!.valor)}
            className="h-10 w-full rounded-lg border border-borda bg-superficie px-3 text-sm"
          >
            {def.opcoes!.map((o) => (
              <option key={String(o.valor)} value={String(o.valor)}>
                {o.rotulo}
              </option>
            ))}
          </select>
          <Ajuda def={def} />
        </div>
      );
    case "cor":
      return (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium">
            {def.rotulo}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="color"
              value={String(valor)}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-9 w-12 cursor-pointer rounded-md border border-borda bg-superficie p-1"
            />
            <span className="w-16 font-mono text-xs text-suave" aria-hidden>
              {String(valor)}
            </span>
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {def.rotulo}
          </label>
          <input
            id={id}
            type="text"
            value={String(valor)}
            maxLength={200}
            aria-describedby={descr}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-borda bg-superficie px-3 text-sm"
          />
          <Ajuda def={def} />
        </div>
      );
  }
}
