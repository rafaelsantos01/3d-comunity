// Configuração central da página de doação (/apoie). Os valores vêm das variáveis NEXT_PUBLIC_PIX_* (ver .env.example).
// O Next só substitui process.env.NEXT_PUBLIC_X escrito literalmente, por isso cada variável é lida aqui, uma a uma.
import { validarConfigPix, type ConfigPix } from "@/lib/pix/br-code";

export const CONFIG_DOACAO_CRU = {
  chave: process.env.NEXT_PUBLIC_PIX_CHAVE,
  nome: process.env.NEXT_PUBLIC_PIX_NOME,
  cidade: process.env.NEXT_PUBLIC_PIX_CIDADE,
  txid: process.env.NEXT_PUBLIC_PIX_TXID, // opcional, padrão "***"
};

/** null quando as doações não estão configuradas (ou a configuração é inválida). */
export function obterConfigDoacao(): ConfigPix | null {
  return validarConfigPix(CONFIG_DOACAO_CRU);
}
