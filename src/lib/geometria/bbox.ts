export interface BBox {
  min: [number, number, number];
  max: [number, number, number];
}

/** Lê triângulos de um STL binário. */
export function* triangulosStl(buf: ArrayBuffer | Uint8Array): Generator<[number, number, number][]> {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.byteLength < 84) return;
  const n = dv.getUint32(80, true);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    if (o + 36 > u8.byteLength) return;
    const t: [number, number, number][] = [];
    for (let v = 0; v < 3; v++) {
      const b = o + v * 12;
      t.push([dv.getFloat32(b, true), dv.getFloat32(b + 4, true), dv.getFloat32(b + 8, true)]);
    }
    yield t;
  }
}

export function bboxStl(buf: ArrayBuffer | Uint8Array): BBox | null {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let algum = false;
  for (const tri of triangulosStl(buf)) {
    for (const p of tri) {
      algum = true;
      for (let k = 0; k < 3; k++) {
        if (p[k] < min[k]) min[k] = p[k];
        if (p[k] > max[k]) max[k] = p[k];
      }
    }
  }
  return algum ? { min, max } : null;
}

export function uniaoBBox(...caixas: (BBox | null | undefined)[]): BBox | null {
  const v = caixas.filter((c): c is BBox => !!c);
  if (!v.length) return null;
  return {
    min: [0, 1, 2].map((k) => Math.min(...v.map((c) => c.min[k]))) as BBox["min"],
    max: [0, 1, 2].map((k) => Math.max(...v.map((c) => c.max[k]))) as BBox["max"],
  };
}

/** Largura (X), altura (Y) e profundidade (Z) do letreiro deitado, em mm. */
export function dimensoes(b: BBox) {
  return { largura: b.max[0] - b.min[0], altura: b.max[1] - b.min[1], profundidade: b.max[2] - b.min[2] };
}
