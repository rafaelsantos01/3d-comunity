export interface Mesa {
  id: string;
  rotulo: string;
  largura: number;
  profundidade: number;
}

export const MESAS: Mesa[] = [
  { id: "180", rotulo: "180 × 180 mm (A1 mini)", largura: 180, profundidade: 180 },
  { id: "220", rotulo: "220 × 220 mm (Ender 3)", largura: 220, profundidade: 220 },
  { id: "256", rotulo: "256 × 256 mm (Bambu X1/P1)", largura: 256, profundidade: 256 },
  { id: "300", rotulo: "300 × 300 mm", largura: 300, profundidade: 300 },
];

export const MESA_PADRAO = MESAS[2];

/** O letreiro deitado (X × Y) excede a mesa? Igual ao limite não excede. */
export function excedeMesa(peca: { largura: number; altura: number }, mesa: { largura: number; profundidade: number }): boolean {
  return peca.largura > mesa.largura || peca.altura > mesa.profundidade;
}
