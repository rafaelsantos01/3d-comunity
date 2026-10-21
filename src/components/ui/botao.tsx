import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "fantasma";

const estilos: Record<Variante, string> = {
  primario: "bg-marca text-marca-texto hover:opacity-90",
  secundario: "border border-borda bg-superficie hover:bg-fundo",
  fantasma: "hover:bg-fundo",
};

export const Botao = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }>(
  function Botao({ className, variante = "secundario", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
          estilos[variante],
          className,
        )}
        {...props}
      />
    );
  },
);
