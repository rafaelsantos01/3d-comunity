// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BotaoCopiar } from "@/components/doacao/BotaoCopiar";
import { PainelDoacao, type DadosDoacao } from "@/components/doacao/PainelDoacao";
import { gerarPayloadPix, type ConfigPix } from "@/lib/pix/br-code";
import { gerarQrSvgDataUrl } from "@/lib/pix/qr";

const config: ConfigPix = { chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "BRASILIA", txid: "***" };
const payload = gerarPayloadPix(config);
const doacao: DadosDoacao = { config, payload, qrSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E" };

function mockClipboard(writeText: ((texto: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: writeText ? { writeText } : undefined, configurable: true });
}

afterEach(() => {
  vi.useRealTimers();
  mockClipboard(undefined);
});

describe("PainelDoacao", () => {
  it("sem configuração mostra indisponível, sem QR e sem botões", () => {
    render(<PainelDoacao doacao={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Me pague um café ☕" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("As doações estão temporariamente indisponíveis");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("configurado mostra mensagem, QR, chave e os dois botões de copiar", () => {
    render(<PainelDoacao doacao={doacao} />);
    expect(screen.getByRole("heading", { level: 1, name: "Me pague um café ☕" })).toBeInTheDocument();
    expect(screen.getByText(/ajuda a manter e evoluir o projeto/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR Code Pix para doação" })).toHaveAttribute("src", doacao.qrSrc);
    expect(screen.getByText(config.chave)).toBeInTheDocument();
    expect(screen.getByText(config.nome)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar chave Pix" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar código Pix copia e cola" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull(); // sem campo de valor nem formulário
  });

  it("falha do QR mostra erro e mantém chave e botões", () => {
    render(<PainelDoacao doacao={{ ...doacao, qrSrc: null }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível gerar o QR Code");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(config.chave)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

describe("gerarQrSvgDataUrl", () => {
  it("gera um SVG preto sobre branco como data URL", async () => {
    const url = await gerarQrSvgDataUrl(payload);
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    const svg = decodeURIComponent(url.split(",")[1]);
    expect(svg).toContain("<svg");
    expect(svg).toContain("#ffffff");
    expect(svg).toContain("#000000");
  });
});

describe("BotaoCopiar", () => {
  it("copia, confirma e volta ao rótulo depois de alguns segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<BotaoCopiar texto="minha-chave" rotulo="Copiar chave Pix" />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar chave Pix" }));
    expect(writeText).toHaveBeenCalledWith("minha-chave");
    expect(screen.getByRole("button", { name: "Copiado!" })).toBeInTheDocument();
    expect(screen.getByText("Copiado para a área de transferência.")).toHaveAttribute("aria-live", "polite");

    act(() => vi.advanceTimersByTime(2500));
    expect(screen.getByRole("button", { name: "Copiar chave Pix" })).toBeInTheDocument();
  });

  it("mostra erro quando a cópia é negada", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("negado")));
    render(<BotaoCopiar texto="x" rotulo="Copiar chave Pix" />);
    await userEvent.click(screen.getByRole("button", { name: "Copiar chave Pix" }));
    expect(await screen.findByText(/Não foi possível copiar/)).toHaveAttribute("aria-live", "polite");
  });

  it("mostra erro quando a área de transferência não existe", async () => {
    mockClipboard(undefined);
    render(<BotaoCopiar texto="x" rotulo="Copiar chave Pix" />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar chave Pix" }));
    expect(await screen.findByText(/Selecione o texto e copie manualmente/)).toBeInTheDocument();
  });

  it.each(["{Enter}", " "])("é acionável pelo teclado (%s)", async (tecla) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<BotaoCopiar texto="chave" rotulo="Copiar chave Pix" />);
    screen.getByRole("button", { name: "Copiar chave Pix" }).focus();
    await userEvent.keyboard(tecla);
    expect(writeText).toHaveBeenCalledWith("chave");
    expect(await screen.findByRole("button", { name: "Copiado!" })).toBeInTheDocument();
  });
});
