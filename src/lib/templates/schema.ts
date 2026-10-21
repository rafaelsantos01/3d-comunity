import { z } from "zod";
import type { TipoParam, ValorParam } from "./parser";

const Valor = z.union([z.string(), z.number(), z.boolean()]);
const Overrides = z.record(z.string(), Valor);

export const WIDGETS = ["texto", "numero", "booleano", "select", "cor", "fonte", "cards"] as const;
export type Widget = (typeof WIDGETS)[number];

const ParametroMeta = z
  .object({
    rotulo: z.string().min(1).optional(),
    ajuda: z.string().optional(),
    grupo: z.enum(["basico", "avancado"]).optional(),
    widget: z.enum(WIDGETS).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    unidade: z.string().optional(),
    oculto: z.boolean().optional(),
    /** em parâmetros de texto: nome do parâmetro de fonte que desenha esse texto (checagem de glifos) */
    fonte: z.string().optional(),
    opcoes: z.record(z.string(), z.object({ rotulo: z.string(), icone: z.string().optional() }).strict()).optional(),
  })
  .strict();

const ParteExport = z.object({ parte: z.string(), cor: z.enum(["base", "letras"]) }).strict();
const ModoExport = z.object({ overrides: Overrides.default({}), partes: z.array(ParteExport).min(1) }).strict();
const PecaPrevia = z.object({ parte: z.string(), overrides: Overrides.default({}) }).strict();

export const TemplateJsonSchema = z
  .object({
    nome: z.string().min(1),
    descricao: z.string().min(1),
    thumbnail: z.string().min(1),
    ordem: z.number().default(100),
    papeis: z
      .object({
        parte: z.string(),
        emPe: z.string().optional(),
        corBase: z.string(),
        corLetras: z.string(),
        espessuraBase: z.string(),
        slug: z.array(z.string()).min(1),
      })
      .strict(),
    parametros: z.record(z.string(), ParametroMeta).default({}),
    secoes: z.record(z.string(), z.object({ rotulo: z.string().optional(), oculta: z.boolean().optional() }).strict()).default({}),
    previa: z.object({ base: PecaPrevia, letras: PecaPrevia }).strict(),
    exportacao: z.object({ multicor: ModoExport, unico: ModoExport, encaixe: ModoExport }).strict(),
  })
  .strict();

export type TemplateJson = z.infer<typeof TemplateJsonSchema>;
export type ModoExportacao = keyof TemplateJson["exportacao"];

export interface OpcaoParam {
  valor: string | number;
  rotulo: string;
  icone?: string;
}

/** Parâmetro final: o que o Customizer declara + o que o template.json complementa. */
export interface ParamDef {
  nome: string;
  tipo: TipoParam;
  widget: Widget;
  padrao: ValorParam;
  secao: string;
  rotulo: string;
  grupo: "basico" | "avancado";
  oculto: boolean;
  ajuda?: string;
  min?: number;
  max?: number;
  step?: number;
  unidade?: string;
  fonte?: string;
  opcoes?: OpcaoParam[];
}

export interface TemplateCatalogo {
  id: string;
  nome: string;
  descricao: string;
  ordem: number;
  thumbnail: string;
  scadUrl: string;
  scadHash: string;
  parametros: ParamDef[];
  secoes: { nome: string; rotulo: string }[];
  papeis: TemplateJson["papeis"];
  previa: TemplateJson["previa"];
  exportacao: TemplateJson["exportacao"];
}

/** Formata erros do zod como `caminho.do.campo: mensagem`. */
export function formatarErroZod(err: z.ZodError): string[] {
  return err.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`);
}
