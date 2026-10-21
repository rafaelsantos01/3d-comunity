"use client";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { dimensoes, type BBox } from "@/lib/geometria/bbox";
import { excedeMesa, MESA_PADRAO, MESAS } from "@/lib/mesa";

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export function PainelInfo({ caixa }: { caixa: BBox | null }) {
  const [mesaId, setMesaId] = useState(MESA_PADRAO.id);
  const [custom, setCustom] = useState({ largura: 200, profundidade: 200 });
  const mesa = mesaId === "custom" ? custom : MESAS.find((m) => m.id === mesaId)!;
  const d = caixa ? dimensoes(caixa) : null;
  const excede = d ? excedeMesa(d, mesa) : false;

  return (
    <section aria-labelledby="titulo-info" className="space-y-3 rounded-2xl border border-borda bg-superficie p-4">
      <h2 id="titulo-info" className="text-sm font-semibold">
        Dimensões (deitado)
      </h2>
      <p className="text-lg font-semibold tabular-nums" data-testid="dimensoes" aria-live="polite">
        {d ? `${fmt(d.largura)} × ${fmt(d.altura)} × ${fmt(d.profundidade)} mm` : "—"}
      </p>
      <p className="text-xs text-suave">largura × altura × profundidade</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 space-y-1 text-sm font-medium" htmlFor="mesa">
          <span className="block">Mesa da impressora</span>
          <select id="mesa" value={mesaId} onChange={(e) => setMesaId(e.target.value)} className="h-9 w-full rounded-lg border border-borda bg-superficie px-2 text-sm">
            {MESAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.rotulo}
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {mesaId === "custom" &&
          (["largura", "profundidade"] as const).map((k) => (
            <label key={k} className="space-y-1 text-sm font-medium" htmlFor={`mesa-${k}`}>
              <span className="block capitalize">{k} (mm)</span>
              <input
                id={`mesa-${k}`}
                type="number"
                min={10}
                max={2000}
                value={custom[k]}
                onChange={(e) => setCustom((c) => ({ ...c, [k]: Math.max(1, Number(e.target.value) || 0) }))}
                className="h-9 w-24 rounded-lg border border-borda bg-superficie px-2 text-sm"
              />
            </label>
          ))}
      </div>
      {excede && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-aviso/10 p-2 text-sm font-medium text-aviso">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          O letreiro não cabe na mesa de {mesa.largura} × {mesa.profundidade} mm. Diminua o tamanho ou escolha outra mesa.
        </p>
      )}
    </section>
  );
}
