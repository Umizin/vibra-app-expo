import { apiClient, ApiClientError } from './api';

type FavoritoApi = {
  get<T>(path: string, options?: { authenticated?: boolean }): Promise<T>;
  post<T>(path: string, body: unknown, options?: { authenticated?: boolean }): Promise<T>;
  delete<T = void>(path: string, options?: { authenticated?: boolean }): Promise<T>;
};

function respostaInvalida(): never {
  throw new ApiClientError('A API retornou dados de favoritos inválidos.', 'invalid-response');
}

function extrairId(value: unknown): string {
  if (value === null || typeof value !== 'object') return respostaInvalida();
  const id = (value as { jamendoTrackId?: unknown }).jamendoTrackId;
  return typeof id === 'string' ? id : respostaInvalida();
}

export function criarFavoritoService(api: FavoritoApi = apiClient) {
  const autenticado = { authenticated: true } as const;

  return {
    async listar(): Promise<string[]> {
      const response = await api.get<{ data?: unknown }>('/api/v1/me/favorites', autenticado);
      if (!Array.isArray(response?.data)) return respostaInvalida();
      return response.data.map(extrairId);
    },

    async adicionar(jamendoTrackId: string): Promise<void> {
      await api.post('/api/v1/me/favorites', { jamendoTrackId }, autenticado);
    },

    async remover(jamendoTrackId: string): Promise<void> {
      await api.delete(`/api/v1/me/favorites/${encodeURIComponent(jamendoTrackId)}`, autenticado);
    },
  };
}

export const favoritoService = criarFavoritoService();
