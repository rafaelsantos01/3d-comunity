import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Modelo não encontrado</h1>
      <p className="mt-2 text-suave">O modelo que você procurou não existe ou foi removido.</p>
      <Link href="/" className="mt-6 inline-flex h-9 items-center rounded-lg bg-marca px-4 text-sm font-medium text-marca-texto">
        Ver modelos
      </Link>
    </div>
  );
}
