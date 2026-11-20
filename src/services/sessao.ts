let tokenDeAcesso: string | null = null;
const ouvintesDeExpiracao = new Set<() => void>();

export function definirTokenDeAcesso(token: string | null): void {
  tokenDeAcesso = token;
}

export function obterTokenDeAcesso(): string | null {
  return tokenDeAcesso;
}

export function invalidarTokenDeAcesso(): void {
  tokenDeAcesso = null;
  for (const ouvinte of ouvintesDeExpiracao) ouvinte();
}

export function observarExpiracaoDeSessao(ouvinte: () => void): () => void {
  ouvintesDeExpiracao.add(ouvinte);
  return () => ouvintesDeExpiracao.delete(ouvinte);
}
