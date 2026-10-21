// Executa o OpenSCAD WASM numa instância nova (o módulo não é reentrante).
// Usado pelo worker no navegador e pelos testes em Node.
import type { ValorParam } from "../templates/parser";
import { montarArgs } from "./args";

export interface InstanciaOpenSCAD {
  callMain(args: string[]): number;
  FS: {
    mkdir(p: string): void;
    writeFile(p: string, d: string | Uint8Array): void;
    readFile(p: string, o?: { encoding: "binary" }): Uint8Array | string;
  };
}

export type CriarOpenSCAD = (opts: {
  noInitialRun: boolean;
  print: (t: string) => void;
  printErr: (t: string) => void;
}) => Promise<{ getInstance(): InstanciaOpenSCAD }>;

export const FONTS_CONF = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>/fonts</dir><cachedir>/tmp/fontcache</cachedir></fontconfig>`;

export interface EntradaExecucao {
  scad: string;
  params: Record<string, ValorParam>;
  fn: number;
  permitidos: ReadonlySet<string>;
  fontes: { nome: string; bytes: Uint8Array }[];
}

export async function executarOpenSCAD(criar: CriarOpenSCAD, e: EntradaExecucao): Promise<{ stl: Uint8Array | null; log: string }> {
  const linhas: string[] = [];
  const inst = (await criar({ noInitialRun: true, print: (t) => linhas.push(t), printErr: (t) => linhas.push(t) })).getInstance();
  inst.FS.mkdir("/fonts");
  for (const f of e.fontes) inst.FS.writeFile(`/fonts/${f.nome}`, f.bytes);
  inst.FS.writeFile("/fonts/fonts.conf", FONTS_CONF);
  inst.FS.writeFile("/modelo.scad", e.scad);
  const args = montarArgs({ ...e.params, $fn: e.fn }, e.permitidos);
  let stl: Uint8Array | null = null;
  try {
    inst.callMain(args);
    const out = inst.FS.readFile("/out.stl", { encoding: "binary" }) as Uint8Array;
    stl = out.length > 84 ? out : null;
  } catch (err) {
    linhas.push(`ERROR: ${String(err)}`);
  }
  return { stl, log: linhas.join("\n") };
}
