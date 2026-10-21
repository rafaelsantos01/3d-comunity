"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Botao } from "./ui/botao";

export function TemaToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const escuro = resolvedTheme === "dark";
  return (
    <Botao variante="fantasma" aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"} onClick={() => setTheme(escuro ? "light" : "dark")}>
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Botao>
  );
}
