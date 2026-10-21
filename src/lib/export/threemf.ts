// Gera um .3mf com várias peças como partes (components) de um único objeto, cada uma com sua cor.
// As coordenadas são as mesmas dos STLs, então o alinhamento é preservado.
import JSZip from "jszip";
import { triangulosStl } from "../geometria/bbox";

export interface Peca3MF {
  nome: string;
  cor: string; // #RRGGBB
  stl: ArrayBuffer | Uint8Array;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function meshXml(stl: ArrayBuffer | Uint8Array): string {
  const indice = new Map<string, number>();
  const vertices: string[] = [];
  const tris: string[] = [];
  for (const tri of triangulosStl(stl)) {
    const ids = tri.map((p) => {
      const k = `${p[0]} ${p[1]} ${p[2]}`;
      let i = indice.get(k);
      if (i === undefined) {
        i = vertices.length;
        indice.set(k, i);
        vertices.push(`<vertex x="${p[0]}" y="${p[1]}" z="${p[2]}"/>`);
      }
      return i;
    });
    if (ids[0] !== ids[1] && ids[1] !== ids[2] && ids[0] !== ids[2]) tris.push(`<triangle v1="${ids[0]}" v2="${ids[1]}" v3="${ids[2]}"/>`);
  }
  return `<mesh><vertices>${vertices.join("")}</vertices><triangles>${tris.join("")}</triangles></mesh>`;
}

export function gerarModelo3MF(nomeObjeto: string, pecas: Peca3MF[]): string {
  const materiais = pecas.map((p) => `<base name="${esc(p.nome)}" displaycolor="${p.cor.toUpperCase()}FF"/>`).join("");
  const objetos = pecas
    .map((p, i) => `<object id="${i + 2}" name="${esc(p.nome)}" type="model" pid="1" pindex="${i}">${meshXml(p.stl)}</object>`)
    .join("");
  const idComposto = pecas.length + 2;
  const comps = pecas.map((_, i) => `<component objectid="${i + 2}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<resources><basematerials id="1">${materiais}</basematerials>${objetos}<object id="${idComposto}" name="${esc(nomeObjeto)}" type="model"><components>${comps}</components></object></resources>
<build><item objectid="${idComposto}"/></build>
</model>`;
}

export async function gerar3MF(nomeObjeto: string, pecas: Peca3MF[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`,
  );
  zip.file("3D/3dmodel.model", gerarModelo3MF(nomeObjeto, pecas));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
