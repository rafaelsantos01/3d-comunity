import type { ValorParam } from "../templates/parser";

/** Converte um valor JS num literal OpenSCAD seguro (nunca deixa o valor sair da string). */
export function toScadLiteral(v: ValorParam): string {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`Número inválido: ${v}`);
    return String(v);
  }
  if (typeof v !== "string") throw new Error("Tipo de valor não suportado");
  const escapado = v
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
  return `"${escapado}"`;
}

export const FLAGS_OPENSCAD = ["--backend=manifold", "--export-format=binstl"];

/**
 * Monta os argumentos do `callMain`. Só aceita nomes da whitelist do template (mais `$fn`),
 * o que impede que um valor vindo da URL injete código OpenSCAD.
 */
export function montarArgs(
  params: Record<string, ValorParam>,
  permitidos: ReadonlySet<string>,
  entrada = "/modelo.scad",
  saida = "/out.stl",
): string[] {
  const args = [entrada, "-o", saida, ...FLAGS_OPENSCAD];
  for (const [nome, valor] of Object.entries(params)) {
    if (nome !== "$fn" && !permitidos.has(nome)) throw new Error(`Parâmetro não permitido: ${nome}`);
    if (!/^\$?[A-Za-z_]\w*$/.test(nome)) throw new Error(`Nome de parâmetro inválido: ${nome}`);
    args.push("-D", `${nome}=${toScadLiteral(valor)}`);
  }
  return args;
}
