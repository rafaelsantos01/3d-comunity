import type { ValorParam } from "../templates/parser";

/** JSON com chaves ordenadas, para que a ordem dos parâmetros não mude o hash. */
export function jsonCanonico(obj: Record<string, ValorParam>): string {
  return JSON.stringify(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

/** cyrb53: hash não criptográfico, rápido e síncrono (suficiente para chave de cache). */
export function hash53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function chaveCache(p: { templateId: string; scadHash: string; params: Record<string, ValorParam>; parte: string; fn: number }): string {
  return hash53(`${p.templateId}|${p.scadHash}|${jsonCanonico(p.params)}|${p.parte}|${p.fn}`);
}

export class CacheLRU<V> {
  private mapa = new Map<string, V>();
  constructor(private readonly limite = 40) {}
  get(k: string): V | undefined {
    const v = this.mapa.get(k);
    if (v !== undefined) {
      this.mapa.delete(k);
      this.mapa.set(k, v);
    }
    return v;
  }
  set(k: string, v: V) {
    this.mapa.delete(k);
    this.mapa.set(k, v);
    while (this.mapa.size > this.limite) this.mapa.delete(this.mapa.keys().next().value as string);
  }
  get tamanho() {
    return this.mapa.size;
  }
}
