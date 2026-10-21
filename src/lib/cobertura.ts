export type MapaCobertura = Record<string, [number, number][]>;

function cobre(faixas: [number, number][], cp: number): boolean {
  let lo = 0;
  let hi = faixas.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (cp < faixas[m][0]) hi = m - 1;
    else if (cp > faixas[m][1]) lo = m + 1;
    else return true;
  }
  return false;
}

/** Caracteres do texto que a fonte não tem (espaços e quebras de linha não contam). */
export function caracteresAusentes(texto: string, fonte: string, mapa: MapaCobertura): string[] {
  const faixas = mapa[fonte];
  if (!faixas) return [];
  const faltando = new Set<string>();
  for (const ch of texto) {
    if (/\s/.test(ch)) continue;
    if (!cobre(faixas, ch.codePointAt(0)!)) faltando.add(ch);
  }
  return [...faltando];
}
