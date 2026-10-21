// Copia o build WASM do OpenSCAD (pacote npm openscad-wasm-prebuilt, versão fixa) para public/openscad/<versao>/.
// Roda no postinstall. O arquivo é um módulo ES único com o .wasm embutido.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const VERSAO = "2025.01.19"; // OpenSCAD dentro de openscad-wasm-prebuilt@1.2.0 (igual a src/config/render.ts)
const SHA256 = process.env.OPENSCAD_SHA256; // opcional: fixe aqui o hash do arquivo para auditar

const origem = join(process.cwd(), "node_modules", "openscad-wasm-prebuilt", "dist", "openscad.js");
const destinoDir = join(process.cwd(), "public", "openscad", VERSAO);
if (!existsSync(origem)) {
  console.warn("openscad-wasm-prebuilt não instalado; pulando cópia do WASM");
  process.exit(0);
}
if (SHA256) {
  const h = createHash("sha256").update(readFileSync(origem)).digest("hex");
  if (h !== SHA256) throw new Error(`sha256 do openscad.js não confere: ${h}`);
}
mkdirSync(destinoDir, { recursive: true });
copyFileSync(origem, join(destinoDir, "openscad.js"));
console.log(`OpenSCAD WASM ${VERSAO} copiado para public/openscad/${VERSAO}/`);
