import type { ConfigPix } from "@/lib/pix/br-code";
import { BotaoCopiar } from "./BotaoCopiar";

export type DadosDoacao = { config: ConfigPix; payload: string; qrSrc: string | null };

const TAMANHO_QR = 240;

/** Página de apoio. `doacao` null = Pix não configurado (estado indisponível, sem QR nem botões). */
export function PainelDoacao({ doacao }: { doacao: DadosDoacao | null }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Me pague um café ☕</h1>
        <p className="text-suave">
          O Letreiros 3D é gratuito. Se ele te ajudou, considere apoiar com um Pix de qualquer valor: a doação é voluntária e
          ajuda a manter e evoluir o projeto. Muito obrigado pelo apoio!
        </p>
      </div>

      {doacao ? (
        <Pix {...doacao} />
      ) : (
        <p role="status" className="max-w-2xl rounded-lg border border-borda bg-superficie p-4 text-suave">
          As doações estão temporariamente indisponíveis. Obrigado pelo interesse em apoiar!
        </p>
      )}
    </div>
  );
}

function Pix({ config, payload, qrSrc }: DadosDoacao) {
  return (
    <section aria-labelledby="titulo-pix" className="grid max-w-3xl gap-6 rounded-lg border border-borda bg-superficie p-4 sm:grid-cols-[auto_1fr] sm:p-6">
      <div className="mx-auto space-y-2 sm:mx-0" style={{ width: TAMANHO_QR }}>
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG gerado no build como data URL, nada a otimizar
          <img src={qrSrc} alt="QR Code Pix para doação" width={TAMANHO_QR} height={TAMANHO_QR} className="rounded-lg bg-white" />
        ) : (
          <div role="alert" className="flex items-center justify-center rounded-lg border border-borda p-4 text-center text-sm text-perigo" style={{ height: TAMANHO_QR }}>
            Não foi possível gerar o QR Code. Use a chave Pix ou o código Pix copia e cola.
          </div>
        )}
        <p className="text-center text-xs text-suave">Você escolhe o valor no app do seu banco.</p>
      </div>

      <div className="min-w-0 space-y-4">
        <h2 id="titulo-pix" className="text-lg font-semibold">
          Doe via Pix
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-suave">Beneficiário</dt>
            <dd className="font-medium">{config.nome}</dd>
          </div>
          <div>
            <dt className="text-suave">Chave Pix</dt>
            <dd>
              <code className="select-all break-all font-mono">{config.chave}</code>
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <BotaoCopiar texto={config.chave} rotulo="Copiar chave Pix" variante="primario" />
          <BotaoCopiar texto={payload} rotulo="Copiar código Pix copia e cola" />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-suave">Ver código Pix copia e cola</summary>
          <code className="mt-2 block select-all break-all rounded-lg border border-borda p-2 font-mono text-xs">{payload}</code>
        </details>
      </div>
    </section>
  );
}
