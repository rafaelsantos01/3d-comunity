// Cliente de render na thread principal (sem React): debounce, cancelamento, timeout e cache.
import type { ValorParam } from "../templates/parser";
import { CacheLRU, chaveCache } from "./cache";
import { ErroRender, MENSAGENS, type CodigoErro } from "./erros";

export interface JobRender {
  templateId: string;
  scadUrl: string;
  scadHash: string;
  /** parâmetros finais (já com `parte` e overrides); `$fn` vai em `fn` */
  params: Record<string, ValorParam>;
  parte: string;
  fn: number;
  /** nomes aceitos em -D (whitelist do template) */
  permitidos: string[];
  /** URLs das fontes a montar no FS virtual */
  fontes: string[];
}

export interface MensagemParaWorker extends JobRender {
  id: number;
}

export type MensagemDoWorker =
  | { id: number; ok: true; stl: ArrayBuffer; log: string }
  | { id: number; ok: false; codigo: CodigoErro; mensagem: string; log: string };

export interface WorkerLike {
  postMessage(msg: MensagemParaWorker): void;
  terminate(): void;
  onmessage: ((ev: { data: MensagemDoWorker }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface OpcoesCliente {
  criarWorker: () => WorkerLike;
  timeoutMs: number;
  debounceMs: number;
  cache?: CacheLRU<ArrayBuffer>;
}

interface EmAndamento {
  id: number;
  resolve: (b: ArrayBuffer) => void;
  reject: (e: ErroRender) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RenderClient {
  private worker: WorkerLike | null = null;
  private atual: EmAndamento | null = null;
  private seq = 0;
  private geracao = 0;
  private timerDebounce: ReturnType<typeof setTimeout> | null = null;
  private pendenteDebounce: ((v: ArrayBuffer | null) => void) | null = null;
  readonly cache: CacheLRU<ArrayBuffer>;

  constructor(private readonly opts: OpcoesCliente) {
    this.cache = opts.cache ?? new CacheLRU<ArrayBuffer>();
  }

  private garantirWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const w = this.opts.criarWorker();
    w.onmessage = (ev) => this.aoReceber(ev.data);
    w.onerror = () => this.falhar(new ErroRender("CARREGAMENTO", MENSAGENS.CARREGAMENTO), true);
    this.worker = w;
    return w;
  }

  private reciclarWorker() {
    this.worker?.terminate();
    this.worker = null;
  }

  private falhar(erro: ErroRender, reciclar: boolean) {
    const a = this.atual;
    if (!a) return;
    clearTimeout(a.timer);
    this.atual = null;
    if (reciclar) this.reciclarWorker();
    a.reject(erro);
  }

  private aoReceber(msg: MensagemDoWorker) {
    const a = this.atual;
    if (!a || msg.id !== a.id) return; // resposta atrasada de um job obsoleto: descarta
    clearTimeout(a.timer);
    this.atual = null;
    if (msg.ok) a.resolve(msg.stl);
    else a.reject(new ErroRender(msg.codigo, msg.mensagem, msg.log));
  }

  /** Renderiza já (sem debounce). Um job em andamento é cancelado: o worker é encerrado e recriado. */
  renderizar(job: JobRender): Promise<ArrayBuffer> {
    const chave = chaveCache(job);
    const emCache = this.cache.get(chave);
    if (emCache) return Promise.resolve(emCache);

    if (this.atual) this.falhar(new ErroRender("CANCELADO", MENSAGENS.CANCELADO), true);
    const w = this.garantirWorker();
    const id = ++this.seq;
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const timer = setTimeout(() => this.falhar(new ErroRender("TIMEOUT", MENSAGENS.TIMEOUT), true), this.opts.timeoutMs);
      this.atual = {
        id,
        timer,
        resolve: (b) => {
          this.cache.set(chave, b);
          resolve(b);
        },
        reject,
      };
      w.postMessage({ ...job, id });
    });
  }

  /**
   * Agenda um render com debounce. Resolve com `null` se o pedido for substituído por outro
   * (mais novo) antes de terminar; só o último pedido entrega resultado.
   */
  agendar(job: JobRender): Promise<ArrayBuffer | null> {
    const geracao = ++this.geracao;
    if (this.timerDebounce) clearTimeout(this.timerDebounce);
    this.pendenteDebounce?.(null);
    return new Promise((resolve, reject) => {
      this.pendenteDebounce = resolve;
      this.timerDebounce = setTimeout(() => {
        this.timerDebounce = null;
        this.pendenteDebounce = null;
        this.renderizar(job).then(
          (b) => resolve(geracao === this.geracao ? b : null),
          (e: ErroRender) => (geracao !== this.geracao || e.codigo === "CANCELADO" ? resolve(null) : reject(e)),
        );
      }, this.opts.debounceMs);
    });
  }

  encerrar() {
    if (this.timerDebounce) clearTimeout(this.timerDebounce);
    this.pendenteDebounce?.(null);
    this.falhar(new ErroRender("CANCELADO", MENSAGENS.CANCELADO), true);
    this.reciclarWorker();
  }
}
