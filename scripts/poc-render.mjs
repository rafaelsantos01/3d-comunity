// POC: mede o tempo de render dos templates com o OpenSCAD WASM em Node.
// Uso: npm run poc  (precisa de `npm run templates:build` antes, para as fontes)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createOpenSCAD } from "openscad-wasm-prebuilt";

const raiz = process.cwd();
const dirFontes = join(raiz, "public", "fontes");

function listarFontes() {
  if (!existsSync(dirFontes)) return [];
  const out = [];
  for (const fam of readdirSync(dirFontes)) {
    for (const f of readdirSync(join(dirFontes, fam))) {
      if (f.endsWith(".ttf")) out.push({ nome: f, bytes: readFileSync(join(dirFontes, fam, f)) });
    }
  }
  return out;
}

const fontes = listarFontes();
const FONTS_CONF = `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>/fonts</dir></fontconfig>`;

async function render(scad, defs, extra = []) {
  const stderr = [];
  const t0 = performance.now();
  const inst = (await createOpenSCAD({ noInitialRun: true, print: () => {}, printErr: (t) => stderr.push(t) })).getInstance();
  const tInit = performance.now() - t0;
  try { inst.FS.mkdir("/fonts"); } catch {}
  for (const f of fontes) inst.FS.writeFile(`/fonts/${f.nome}`, f.bytes);
  inst.FS.writeFile("/fonts/fonts.conf", FONTS_CONF);
  inst.FS.writeFile("/m.scad", scad);
  const args = ["/m.scad", "-o", "/out.stl", "--export-format=binstl", ...extra];
  for (const [k, v] of Object.entries(defs)) args.push("-D", `${k}=${v}`);
  const t1 = performance.now();
  let code;
  try { code = inst.callMain(args); } catch (e) { code = String(e); }
  const tRender = performance.now() - t1;
  let tam = 0;
  try { tam = inst.FS.readFile("/out.stl").length; } catch {}
  return { tInit, tRender, code, tam, stderr };
}

const casos = process.argv.slice(2).length ? process.argv.slice(2) : ["version"];
if (casos[0] === "version") {
  const r = await render("cube(1);", {}, ["--version"]);
  console.log(r.stderr.join("\n"));
  const h = await render("cube(1);", {}, ["--help"]);
  console.log(h.stderr.filter((l) => /backend|enable|manifold/i.test(l)).join("\n"));
  process.exit(0);
}

for (const caso of casos) {
  // formato: caminho.scad|parte|fn|backend|k=v,k=v
  const [arq, parte, fn, backend, extras] = caso.split("|");
  const scad = readFileSync(arq, "utf8");
  const defs = { parte: `"${parte}"`, $fn: fn };
  for (const kv of (extras ?? "").split(",").filter(Boolean)) {
    const [k, v] = kv.split("=");
    defs[k] = v;
  }
  const flags = backend === "manifold" ? ["--enable=manifold"] : backend === "manifold2" ? ["--backend=manifold"] : [];
  const r = await render(scad, defs, flags);
  console.log(JSON.stringify({ caso, init_ms: Math.round(r.tInit), render_ms: Math.round(r.tRender), code: r.code, bytes: r.tam }));
  const avisos = r.stderr.filter((l) => /WARNING|ERROR|font/i.test(l));
  if (avisos.length) console.log("  " + avisos.slice(0, 5).join("\n  "));
}
