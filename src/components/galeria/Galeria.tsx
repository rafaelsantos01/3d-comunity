import Link from "next/link";
import type { TemplateCatalogo } from "@/lib/templates/schema";

export function Galeria({ templates }: { templates: Pick<TemplateCatalogo, "id" | "nome" | "descricao" | "thumbnail">[] }) {
  if (!templates.length) return <p className="text-suave">Nenhum modelo disponível.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <li key={t.id} className="group animate-surgir overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails SVG locais */}
          <img src={t.thumbnail} alt="" className="aspect-[8/5] w-full object-cover" />
          <div className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">{t.nome}</h2>
            <p className="text-sm text-suave">{t.descricao}</p>
            <Link
              href={`/editor/${t.id}`}
              className="inline-flex h-9 items-center rounded-lg bg-marca px-4 text-sm font-medium text-marca-texto transition hover:opacity-90"
              aria-label={`Personalizar ${t.nome}`}
            >
              Personalizar
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
