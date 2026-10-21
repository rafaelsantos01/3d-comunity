declare module "opentype.js" {
  interface Fonte {
    tables: { cmap: { glyphIndexMap: Record<string, number> } };
  }
  const opentype: { parse(buf: ArrayBuffer): Fonte };
  export default opentype;
}
