"use client";
import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import type { ValorParam } from "@/lib/templates/parser";
import type { ParamDef, TemplateCatalogo } from "@/lib/templates/schema";
import type { Params } from "@/lib/templates/validador-params";
import { CampoParametro } from "./CampoParametro";

interface Props {
  template: TemplateCatalogo;
  params: Params;
  onChange: (nome: string, valor: ValorParam) => void;
}

/** Formulário gerado só a partir do schema do template: nenhum nome de parâmetro é conhecido aqui. */
export function PainelControles({ template, params, onChange }: Props) {
  const visiveis = template.parametros.filter((p) => !p.oculto);
  // texto que cada fonte desenha: parâmetros de texto que apontam para ela
  const textoDaFonte = (fonte: string) =>
    template.parametros
      .filter((p) => p.fonte === fonte)
      .map((p) => String(params[p.nome] ?? ""))
      .join(" ");

  const campo = (p: ParamDef) => (
    <CampoParametro key={p.nome} def={p} valor={params[p.nome]} onChange={(v) => onChange(p.nome, v)} textoPrevia={textoDaFonte(p.nome)} />
  );

  const secoes = template.secoes
    .map((s) => ({ ...s, params: visiveis.filter((p) => p.secao === s.nome) }))
    .filter((s) => s.params.length);

  return (
    <Accordion.Root type="multiple" defaultValue={secoes.map((s) => s.nome)} className="divide-y divide-borda">
      {secoes.map((s) => {
        const basicos = s.params.filter((p) => p.grupo === "basico");
        const avancados = s.params.filter((p) => p.grupo === "avancado");
        return (
          <Accordion.Item key={s.nome} value={s.nome}>
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between py-3 text-left text-sm font-semibold">
                {s.rotulo}
                <ChevronDown className="size-4 text-suave transition group-data-[state=open]:rotate-180" aria-hidden />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="space-y-4 pb-4">
              {basicos.map(campo)}
              {avancados.length > 0 && (
                <details className="group/av rounded-lg border border-dashed border-borda px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-suave">Avançado ({avancados.length})</summary>
                  <div className="space-y-4 pt-3">{avancados.map(campo)}</div>
                </details>
              )}
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}
