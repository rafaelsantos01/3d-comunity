// Ícones genéricos para o widget "cards". Um template novo pode usar qualquer nome daqui
// (ou nenhum: o fallback é a inicial do rótulo), sem precisar de código novo.
const comum = { viewBox: "0 0 48 32", className: "h-8 w-12", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;

const ICONES: Record<string, React.ReactNode> = {
  contorno: (
    <svg {...comum}>
      <path d="M8 24c-3 0-4-3-3-6l3-8c1-3 4-4 7-3l4 1 5-3c3-1 6 0 8 2l5 4c3 2 6 3 6 6s-2 7-5 7z" />
      <path d="M4 26h40" />
    </svg>
  ),
  retangulo: (
    <svg {...comum}>
      <rect x="5" y="6" width="38" height="20" rx="4" />
    </svg>
  ),
  degrau: (
    <svg {...comum}>
      <path d="M16 4h16a3 3 0 0 1 3 3v9h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h7V7a3 3 0 0 1 3-3z" />
    </svg>
  ),
  circulo: (
    <svg {...comum}>
      <circle cx="24" cy="16" r="11" />
    </svg>
  ),
};

export function IconeOpcao({ nome, rotulo }: { nome?: string; rotulo: string }) {
  const icone = nome ? ICONES[nome] : undefined;
  if (icone) return <>{icone}</>;
  return (
    <span aria-hidden className="flex h-8 w-12 items-center justify-center rounded border border-current text-sm font-bold">
      {rotulo.charAt(0).toUpperCase()}
    </span>
  );
}
