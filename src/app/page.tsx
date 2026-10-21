import { Galeria } from "@/components/galeria/Galeria";
import { TEMPLATES } from "@/lib/templates/catalogo";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Crie seu letreiro 3D</h1>
        <p className="text-suave">Escolha um modelo, personalize o texto, as fontes e as cores, veja a prévia em 3D e baixe os arquivos prontos para imprimir.</p>
      </div>
      <Galeria templates={TEMPLATES} />
    </div>
  );
}
