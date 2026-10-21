// Cria um RenderClient ligado ao worker real. Importado sob demanda só no editor.
import { CONFIG_RENDER } from "../../config/render";
import { RenderClient, type WorkerLike } from "./cliente";

export function criarWorker(): WorkerLike {
  return new Worker(new URL("./render.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
}

export function criarCliente(opts: Partial<{ timeoutMs: number; debounceMs: number }> = {}) {
  return new RenderClient({
    criarWorker,
    timeoutMs: opts.timeoutMs ?? CONFIG_RENDER.timeoutMs,
    debounceMs: opts.debounceMs ?? CONFIG_RENDER.debounceMs,
  });
}
