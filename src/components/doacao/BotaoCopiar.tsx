"use client";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { cn } from "@/lib/cn";

const DURACAO_COPIADO_MS = 2500;

type Estado = "ocioso" | "copiado" | "erro";

export function BotaoCopiar({ texto, rotulo, variante = "secundario" }: { texto: string; rotulo: string; variante?: "primario" | "secundario" }) {
  const [estado, setEstado] = useState<Estado>("ocioso");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copiar() {
    clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Área de transferência indisponível");
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
      timer.current = setTimeout(() => setEstado("ocioso"), DURACAO_COPIADO_MS);
    } catch {
      setEstado("erro");
    }
  }

  const copiado = estado === "copiado";
  return (
    <div className="space-y-1">
      <Botao variante={variante} onClick={copiar} className="w-full sm:w-auto">
        {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copiado ? "Copiado!" : rotulo}
      </Botao>
      {/* sempre montada: só o conteúdo muda, para o leitor de tela anunciar */}
      <p aria-live="polite" className={cn("text-sm", estado === "erro" ? "text-perigo" : "sr-only")}>
        {copiado && "Copiado para a área de transferência."}
        {estado === "erro" && "Não foi possível copiar. Selecione o texto e copie manualmente."}
      </p>
    </div>
  );
}
