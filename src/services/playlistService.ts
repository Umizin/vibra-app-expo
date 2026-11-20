import type {
  AdicionarFaixaPlaylistInput,
  AtualizarPlaylistInput,
  CriarPlaylistInput,
  PlaylistPersistida,
  PlaylistTrack,
} from '@/types/modelos';
import { apiClient, ApiClientError } from './api';

type PlaylistApi = {
  get<T>(path: string, options?: { authenticated?: boolean }): Promise<T>;
  post<T>(path: string, body: unknown, options?: { authenticated?: boolean }): Promise<T>;
  patch<T>(path: string, body: unknown, options?: { authenticated?: boolean }): Promise<T>;
  delete<T = void>(path: string, options?: { authenticated?: boolean }): Promise<T>;
};

type DataResponse<T> = { data: T };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidResponse(resource: string): never {
  throw new ApiClientError(`A API retornou dados de ${resource} inválidos.`, 'invalid-response');
}

function mapPlaylist(value: unknown): PlaylistPersistida {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' ||
      !(typeof value.description === 'string' || value.description === null) ||
      typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string' ||
      typeof value.trackCount !== 'number' || !Number.isInteger(value.trackCount)) {
    return invalidResponse('playlist');
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    trackCount: value.trackCount,
  };
}

function mapPlaylistTrack(value: unknown): PlaylistTrack {
  if (!isRecord(value) || typeof value.jamendoTrackId !== 'string' ||
      typeof value.position !== 'number' || !Number.isInteger(value.position) ||
      typeof value.addedAt !== 'string') {
    return invalidResponse('faixa da playlist');
  }
  return {
    jamendoTrackId: value.jamendoTrackId,
    position: value.position,
    addedAt: value.addedAt,
  };
}

function unwrapData<T>(response: unknown, resource: string): T {
  if (!isRecord(response) || !('data' in response)) return invalidResponse(resource);
  return response.data as T;
}

export function criarPlaylistService(api: PlaylistApi = apiClient) {
  const autenticado = { authenticated: true } as const;

  return {
    async listarPlaylists(): Promise<PlaylistPersistida[]> {
      const response = await api.get<DataResponse<unknown[]>>('/api/v1/me/playlists', autenticado);
      const data = unwrapData<unknown[]>(response, 'playlists');
      if (!Array.isArray(data)) return invalidResponse('playlists');
      return data.map(mapPlaylist);
    },

    async criarPlaylist(dados: CriarPlaylistInput): Promise<PlaylistPersistida> {
      const response = await api.post<DataResponse<unknown>>('/api/v1/me/playlists', dados, autenticado);
      return mapPlaylist(unwrapData(response, 'playlist'));
    },

    async buscarPlaylist(playlistId: string): Promise<PlaylistPersistida> {
      const response = await api.get<DataResponse<unknown>>(
        `/api/v1/playlists/${encodeURIComponent(playlistId)}`,
        autenticado,
      );
      return mapPlaylist(unwrapData(response, 'playlist'));
    },

    async atualizarPlaylist(playlistId: string, dados: AtualizarPlaylistInput): Promise<PlaylistPersistida> {
      const response = await api.patch<DataResponse<unknown>>(
        `/api/v1/playlists/${encodeURIComponent(playlistId)}`,
        dados,
        autenticado,
      );
      return mapPlaylist(unwrapData(response, 'playlist'));
    },

    async excluirPlaylist(playlistId: string): Promise<void> {
      await api.delete<void>(`/api/v1/playlists/${encodeURIComponent(playlistId)}`, autenticado);
    },

    async listarFaixas(playlistId: string): Promise<PlaylistTrack[]> {
      const response = await api.get<DataResponse<unknown[]>>(
        `/api/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
        autenticado,
      );
      const data = unwrapData<unknown[]>(response, 'faixas da playlist');
      if (!Array.isArray(data)) return invalidResponse('faixas da playlist');
      return data.map(mapPlaylistTrack);
    },

    async adicionarFaixa(playlistId: string, dados: AdicionarFaixaPlaylistInput): Promise<PlaylistTrack> {
      const response = await api.post<DataResponse<unknown>>(
        `/api/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
        dados,
        autenticado,
      );
      return mapPlaylistTrack(unwrapData(response, 'faixa da playlist'));
    },

    async buscarFaixa(playlistId: string, jamendoTrackId: string): Promise<PlaylistTrack> {
      const response = await api.get<DataResponse<unknown>>(
        `/api/v1/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(jamendoTrackId)}`,
        autenticado,
      );
      return mapPlaylistTrack(unwrapData(response, 'faixa da playlist'));
    },

    async removerFaixa(playlistId: string, jamendoTrackId: string): Promise<void> {
      await api.delete<void>(
        `/api/v1/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(jamendoTrackId)}`,
        autenticado,
      );
    },
  };
}

export const playlistService = criarPlaylistService();
