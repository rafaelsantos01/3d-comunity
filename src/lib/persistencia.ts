export const chaveLocal = (templateId: string) => `letreiro:v1:${templateId}`;

export function lerLocal(templateId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(chaveLocal(templateId));
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export function salvarLocal(templateId: string, params: Record<string, unknown>) {
  try {
    localStorage.setItem(chaveLocal(templateId), JSON.stringify(params));
  } catch {
    // modo privado / cota cheia: segue sem salvar
  }
}
