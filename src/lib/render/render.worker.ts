/// <reference lib="webworker" />
// Worker de renderização: carrega o OpenSCAD WASM sob demanda (com Cache API) e devolve STL binário.
import { OPENSCAD_URL, OPENSCAD_VERSAO } from "../../config/render";
import type { MensagemDoWorker, MensagemParaWorker } from "./cliente";
import { interpretarLog, MENSAGENS } from "./erros";
import { executarOpenSCAD, type CriarOpenSCAD } from "./executar";

declare const self: DedicatedWorkerGlobalScope;

const NOME_CACHE = `letreiros-${OPENSCAD_VERSAO}`;

async function buscarComCache(url: string): Promise<Response> {
  if (typeof caches === "undefined") return fetch(url);
  try {
    const cache = await caches.open(NOME_CACHE);
    const salvo = await cache.match(url);
    if (salvo) return salvo;
    const r = await fetch(url);
    if (r.ok) await cache.put(url, r.clone());
    return r;
  } catch {
    return fetch(url);
  }
}

let criarPromise: Promise<CriarOpenSCAD> | null = null;
function carregarOpenSCAD(): Promise<CriarOpenSCAD> {
  criarPromise ??= (async () => {
    const r = await buscarComCache(OPENSCAD_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blobUrl = URL.createObjectURL(new Blob([await r.blob()], { type: "text/javascript" }));
    const mod = (await import(/* webpackIgnore: true */ blobUrl)) as { createOpenSCAD: CriarOpenSCAD };
    return mod.createOpenSCAD;
  })();
  criarPromise.catch(() => (criarPromise = null));
  return criarPromise;
}

const bytesCache = new Map<string, Promise<Uint8Array>>();
function bytes(url: string) {
  let p = bytesCache.get(url);
  if (!p) {
    p = buscarComCache(url).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
      return new Uint8Array(await r.arrayBuffer());
    });
    p.catch(() => bytesCache.delete(url));
    bytesCache.set(url, p);
  }
  return p;
}

function responder(m: MensagemDoWorker) {
  if (m.ok) self.postMessage(m, [m.stl]);
  else self.postMessage(m);
}

self.onmessage = async (ev: MessageEvent<MensagemParaWorker>) => {
  const job = ev.data;
  let criar: CriarOpenSCAD;
  let scad: string;
  let fontes: { nome: string; bytes: Uint8Array }[];
  try {
    [criar, scad, fontes] = await Promise.all([
      carregarOpenSCAD(),
      bytes(job.scadUrl).then((b) => new TextDecoder().decode(b)),
      // "<familia>-<arquivo>.ttf": duas famílias com o mesmo nome de arquivo não se sobrescrevem em /fonts
      Promise.all(job.fontes.map(async (u) => ({ nome: u.split("/").filter(Boolean).slice(-2).join("-"), bytes: await bytes(u) }))),
    ]);
  } catch (e) {
    responder({ id: job.id, ok: false, codigo: "CARREGAMENTO", mensagem: MENSAGENS.CARREGAMENTO, log: String(e) });
    return;
  }
  const { stl, log } = await executarOpenSCAD(criar, {
    scad,
    params: job.params,
    fn: job.fn,
    permitidos: new Set(job.permitidos),
    fontes,
  });
  const erro = interpretarLog(log, stl !== null);
  if (erro || !stl) {
    responder({ id: job.id, ok: false, codigo: erro?.codigo ?? "ERRO_SCAD", mensagem: erro?.message ?? MENSAGENS.ERRO_SCAD, log });
    return;
  }
  const copia = stl.slice().buffer as ArrayBuffer;
  responder({ id: job.id, ok: true, stl: copia, log });
};
