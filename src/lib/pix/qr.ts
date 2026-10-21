import QRCode from "qrcode";

/** QR em SVG como data URL. Preto sobre branco fixo (em qualquer tema) e margem de 4 módulos (zona de silêncio). */
export async function gerarQrSvgDataUrl(payload: string): Promise<string> {
  const svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
