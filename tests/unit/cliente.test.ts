import { RenderClient, type JobRender, type MensagemDoWorker, type MensagemParaWorker, type WorkerLike } from "@/lib/render/cliente";
import { ErroRender } from "@/lib/render/erros";

class WorkerFalso implements WorkerLike {
  static todos: WorkerFalso[] = [];
  recebidos: MensagemParaWorker[] = [];
  encerrado = false;
  onmessage: ((ev: { data: MensagemDoWorker }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  constructor() {
    WorkerFalso.todos.push(this);
  }
  postMessage(m: MensagemParaWorker) {
    this.recebidos.push(m);
  }
  terminate() {
    this.encerrado = true;
  }
  responder(id: number, bytes = 100) {
    this.onmessage?.({ data: { id, ok: true, stl: new ArrayBuffer(bytes), log: "" } });
  }
}

const job = (texto: string): JobRender => ({
  templateId: "t",
  scadUrl: "/m.scad",
  scadHash: "h",
  params: { texto },
  parte: "base",
  fn: 24,
  permitidos: ["texto"],
  fontes: [],
});

describe("RenderClient", () => {
  let cliente: RenderClient;
  beforeEach(() => {
    vi.useFakeTimers();
    WorkerFalso.todos = [];
    cliente = new RenderClient({ criarWorker: () => new WorkerFalso(), debounceMs: 600, timeoutMs: 30_000 });
  });
  afterEach(() => vi.useRealTimers());

  it("só dispara depois de 600 ms sem mudanças (debounce) e entrega só o último", async () => {
    const p1 = cliente.agendar(job("a"));
    vi.advanceTimersByTime(300);
    const p2 = cliente.agendar(job("ab"));
    vi.advanceTimersByTime(599);
    expect(WorkerFalso.todos.length).toBe(0);
    vi.advanceTimersByTime(1);
    const w = WorkerFalso.todos[0];
    expect(w.recebidos.map((m) => m.params.texto)).toEqual(["ab"]);
    w.responder(w.recebidos[0].id, 123);
    await expect(p1).resolves.toBeNull();
    expect((await p2)!.byteLength).toBe(123);
  });

  it("cancela o render obsoleto: encerra o worker e descarta resposta atrasada", async () => {
    const p1 = cliente.renderizar(job("a"));
    const w1 = WorkerFalso.todos[0];
    const p2 = cliente.renderizar(job("b"));
    await expect(p1).rejects.toMatchObject({ codigo: "CANCELADO" });
    expect(w1.encerrado).toBe(true);
    const w2 = WorkerFalso.todos[1];
    w1.responder(w1.recebidos[0].id, 999); // atrasada, ignorada
    w2.responder(w2.recebidos[0].id, 50);
    expect((await p2).byteLength).toBe(50);
  });

  it("render obsoleto via agendar resolve null em vez de erro", async () => {
    const p1 = cliente.agendar(job("a"));
    vi.advanceTimersByTime(600);
    const p2 = cliente.agendar(job("b"));
    vi.advanceTimersByTime(600);
    await expect(p1).resolves.toBeNull();
    const w2 = WorkerFalso.todos[1];
    w2.responder(w2.recebidos[0].id);
    expect(await p2).not.toBeNull();
  });

  it("timeout encerra e recria o worker e devolve TIMEOUT", async () => {
    const p = cliente.renderizar(job("a"));
    vi.advanceTimersByTime(30_000);
    const e = (await p.catch((x) => x)) as ErroRender;
    expect(e.codigo).toBe("TIMEOUT");
    expect(e.message).toMatch(/Render demorou demais/);
    expect(WorkerFalso.todos[0].encerrado).toBe(true);
    cliente.renderizar(job("b"));
    expect(WorkerFalso.todos.length).toBe(2);
  });

  it("cache: mesmo template+params+parte+fn não chama o worker de novo", async () => {
    const p = cliente.renderizar(job("a"));
    const w = WorkerFalso.todos[0];
    w.responder(w.recebidos[0].id, 77);
    await p;
    const r = await cliente.renderizar({ ...job("a"), params: { texto: "a" } });
    expect(r.byteLength).toBe(77);
    expect(w.recebidos.length).toBe(1);
    cliente.renderizar({ ...job("a"), fn: 80 });
    expect(w.recebidos.length).toBe(2);
  });

  it("erro do worker vira ErroRender com o código", async () => {
    const p = cliente.renderizar(job("a"));
    const w = WorkerFalso.todos[0];
    w.onmessage?.({ data: { id: w.recebidos[0].id, ok: false, codigo: "GEOMETRIA_VAZIA", mensagem: "vazio", log: "" } });
    await expect(p).rejects.toMatchObject({ codigo: "GEOMETRIA_VAZIA" });
  });
});
