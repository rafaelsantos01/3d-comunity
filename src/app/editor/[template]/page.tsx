import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { buscarTemplate, TEMPLATES } from "@/lib/templates/catalogo";

export const dynamicParams = false;

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ template: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ template: string }> }): Promise<Metadata> {
  const t = buscarTemplate((await params).template);
  return { title: t ? `${t.nome} | Letreiros 3D` : "Modelo não encontrado" };
}

export default async function PaginaEditor({ params }: { params: Promise<{ template: string }> }) {
  const t = buscarTemplate((await params).template);
  if (!t) notFound();
  return <Editor template={t} />;
}
