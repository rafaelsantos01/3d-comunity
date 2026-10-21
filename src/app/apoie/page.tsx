import type { Metadata } from "next";
import { PainelDoacao, type DadosDoacao } from "@/components/doacao/PainelDoacao";
import { obterConfigDoacao } from "@/config/doacao";
import { gerarPayloadPix } from "@/lib/pix/br-code";
import { gerarQrSvgDataUrl } from "@/lib/pix/qr";

export const metadata: Metadata = {
  title: "Me pague um café | Letreiros 3D",
  description: "Apoie o Letreiros 3D com um Pix de qualquer valor.",
};

// Página estática: o QR é gerado no build, a partir das variáveis NEXT_PUBLIC_PIX_*.
export default async function PaginaApoie() {
  const config = obterConfigDoacao();
  let doacao: DadosDoacao | null = null;
  if (config) {
    const payload = gerarPayloadPix(config);
    let qrSrc: string | null = null;
    try {
      qrSrc = await gerarQrSvgDataUrl(payload);
    } catch (erro) {
      console.error("Falha ao gerar o QR Code Pix", erro);
    }
    doacao = { config, payload, qrSrc };
  }
  return <PainelDoacao doacao={doacao} />;
}
