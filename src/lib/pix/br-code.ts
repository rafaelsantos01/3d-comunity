// Payload "Pix copia e cola" (BR Code / EMV estático) conforme o manual do Bacen.
// Sem o campo 54 (valor): quem doa escolhe o valor no app do banco.

export type ConfigPix = { chave: string; nome: string; cidade: string; txid: string };
export type ConfigPixCru = { chave?: string; nome?: string; cidade?: string; txid?: string };

export const LIMITE_NOME = 25;
export const LIMITE_CIDADE = 15;
// o campo 26 inteiro (GUI de 14 + chave) precisa caber em 99 caracteres
export const LIMITE_CHAVE = 77;
export const TXID_PADRAO = "***";

/** Remove acentos e símbolos, colapsa espaços e trunca: os bancos só aceitam ASCII básico em 59/60. */
export function normalizarTexto(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/** Devolve a configuração pronta para o payload, ou null se faltar algo ou houver valor inválido. */
export function validarConfigPix(cru: ConfigPixCru): ConfigPix | null {
  const chave = cru.chave?.trim() ?? "";
  if (!chave || chave.length > LIMITE_CHAVE || !/^[\x21-\x7e]+$/.test(chave)) return null;

  const nome = normalizarTexto(cru.nome ?? "", LIMITE_NOME);
  const cidade = normalizarTexto(cru.cidade ?? "", LIMITE_CIDADE);
  if (!nome || !cidade) return null;

  const txid = cru.txid?.trim() || TXID_PADRAO;
  if (txid !== TXID_PADRAO && !/^[A-Za-z0-9]{1,25}$/.test(txid)) return null;

  return { chave, nome, cidade, txid };
}

/** TLV do EMV: id + tamanho com 2 dígitos + valor. */
export function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** CRC16-CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarPayloadPix({ chave, nome, cidade, txid }: ConfigPix): string {
  const semCrc =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", txid)) +
    "6304";
  return semCrc + crc16(semCrc);
}
