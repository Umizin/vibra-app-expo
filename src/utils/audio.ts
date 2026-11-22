/** Retorna somente URLs HTTPS válidas que podem ser entregues ao player. */
export function obterAudioUrlValida(audioUrl?: string): string | null {
  if (!audioUrl) return null;

  try {
    const url = new URL(audioUrl);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function calcularProgressoPercentual(progresso: number, duracao: number): number {
  if (!Number.isFinite(progresso) || !Number.isFinite(duracao) || duracao <= 0) return 0;
  return Math.max(0, Math.min(100, (progresso / duracao) * 100));
}
