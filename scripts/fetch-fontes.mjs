// Baixa as fontes livres (OFL) usadas pelo app para public/fontes/<pasta>/.
// Os TTFs estáticos vêm da API CSS do Google Fonts (sem user-agent de navegador ela devolve TTF);
// as licenças vêm do repositório github.com/google/fonts.
// Uso: npm run fontes:baixar   (os arquivos baixados são versionados; só rode para atualizar)
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FONTES = [
  { pasta: "archivoblack", familia: "Archivo Black", pesos: [400] },
  { pasta: "bebasneue", familia: "Bebas Neue", pesos: [400] },
  { pasta: "pacifico", familia: "Pacifico", pesos: [400] },
  { pasta: "poppins", familia: "Poppins", pesos: [400, 700] },
  { pasta: "montserrat", familia: "Montserrat", pesos: [400, 700, 900] },
  { pasta: "cinzel", familia: "Cinzel", pesos: [400, 700] },
  { pasta: "playfairdisplay", familia: "Playfair Display", pesos: [400, 700] },
];

const raiz = join(process.cwd(), "public", "fontes");

for (const f of FONTES) {
  const dir = join(raiz, f.pasta);
  mkdirSync(dir, { recursive: true });
  for (const peso of f.pesos) {
    const arq = join(dir, `${f.familia.replace(/ /g, "")}-${peso}.ttf`);
    if (existsSync(arq)) continue;
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.familia)}:wght@${peso}`)).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) throw new Error(`TTF não encontrado para ${f.familia} ${peso}:\n${css}`);
    writeFileSync(arq, Buffer.from(await (await fetch(url)).arrayBuffer()));
    console.log("ok", arq);
  }
  const lic = join(dir, "OFL.txt");
  if (!existsSync(lic)) {
    const r = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${f.pasta}/OFL.txt`);
    if (!r.ok) throw new Error(`Licença não encontrada para ${f.familia}`);
    writeFileSync(lic, await r.text());
  }
}
