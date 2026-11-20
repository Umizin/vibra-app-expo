import { apiClient, ApiClientError } from './api';
import type { Album, Artista, ColecaoDeFaixas, Faixa } from '@/types/modelos';
import { albuns, playlists } from '@/data/catalogo';

export type PaginacaoCatalogo = {
  offset: number;
  limit: number;
  count: number;
  hasMore: boolean;
};

export type PaginaCatalogo<T> = { data: T[]; pagination: PaginacaoCatalogo };

export type ResultadoFaixasPorIds = {
  data: Faixa[];
  requestedIds: string[];
  missingIds: string[];
};

type FaixaApi = {
  id: string;
  titulo: string;
  artistaId: string;
  artista: string;
  albumId?: string;
  album?: string;
  duracaoEmSegundos: number;
  capaUrl?: string;
  audioUrl?: string;
  genero?: string;
  tags: string[];
  license?: string;
  jamendoUrl?: string;
};

type ArtistaApi = {
  id: string;
  name: string;
  imageUrl?: string;
  website?: string;
  shareUrl?: string;
};

type AlbumApi = {
  id: string;
  name: string;
  artistId?: string;
  artistName: string;
  imageUrl?: string;
  releasedate?: string;
  shareUrl?: string;
};

type PageApi<T> = PaginaCatalogo<T>;
type DataApi<T> = { data: T };

type QueryCatalogo = {
  q?: string;
  artistId?: string;
  albumId?: string;
  genre?: string;
  offset?: number;
  limit?: number;
};

const LIMITE_PADRAO = 20;
const GENEROS_COM_FILTRO_NO_BACKEND = new Set(['Rock', 'Pop', 'Eletrônica']);

function queryString(query: QueryCatalogo): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.artistId) params.set('artistId', query.artistId);
  if (query.albumId) params.set('albumId', query.albumId);
  if (query.genre) params.set('genre', query.genre);
  params.set('offset', String(query.offset ?? 0));
  params.set('limit', String(query.limit ?? LIMITE_PADRAO));
  return `?${params.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiClientError(`A API retornou dados inválidos (${field}).`, 'invalid-response');
  }
  return value;
}

function mapFaixa(dto: FaixaApi): Faixa {
  if (!isRecord(dto) || !Array.isArray(dto.tags) ||
      typeof dto.duracaoEmSegundos !== 'number' || !Number.isFinite(dto.duracaoEmSegundos)) {
    throw new ApiClientError('A API retornou uma faixa em formato inválido.', 'invalid-response');
  }
  return {
    id: requiredString(dto.id, 'id'),
    titulo: requiredString(dto.titulo, 'titulo'),
    artistaId: requiredString(dto.artistaId, 'artistaId'),
    artista: requiredString(dto.artista, 'artista'),
    duracaoEmSegundos: dto.duracaoEmSegundos,
    tags: dto.tags.filter((tag): tag is string => typeof tag === 'string'),
    ...(typeof dto.albumId === 'string' ? { albumId: dto.albumId } : {}),
    ...(typeof dto.album === 'string' ? { album: dto.album } : {}),
    ...(typeof dto.capaUrl === 'string' ? { capaUrl: dto.capaUrl } : {}),
    ...(typeof dto.audioUrl === 'string' ? { audioUrl: dto.audioUrl } : {}),
    ...(typeof dto.genero === 'string' ? { genero: dto.genero } : {}),
    ...(typeof dto.license === 'string' ? { license: dto.license } : {}),
    ...(typeof dto.jamendoUrl === 'string' ? { jamendoUrl: dto.jamendoUrl } : {}),
  };
}

function mapArtista(dto: ArtistaApi): Artista {
  if (!isRecord(dto)) throw new ApiClientError('A API retornou um artista em formato inválido.', 'invalid-response');
  return {
    id: requiredString(dto.id, 'id'),
    nome: requiredString(dto.name, 'name'),
    ...(typeof dto.imageUrl === 'string' ? { fotoUrl: dto.imageUrl } : {}),
    ...(typeof dto.website === 'string' ? { website: dto.website } : {}),
    ...(typeof dto.shareUrl === 'string' ? { shareUrl: dto.shareUrl } : {}),
  };
}

function mapAlbum(dto: AlbumApi): Album {
  if (!isRecord(dto)) throw new ApiClientError('A API retornou um álbum em formato inválido.', 'invalid-response');
  return {
    id: requiredString(dto.id, 'id'),
    titulo: requiredString(dto.name, 'name'),
    artista: requiredString(dto.artistName, 'artistName'),
    ...(typeof dto.artistId === 'string' ? { artistaId: dto.artistId } : {}),
    ...(typeof dto.imageUrl === 'string' ? { capaUrl: dto.imageUrl } : {}),
    ...(typeof dto.releasedate === 'string' ? { releasedate: dto.releasedate } : {}),
    ...(typeof dto.shareUrl === 'string' ? { shareUrl: dto.shareUrl } : {}),
  };
}

function mapPage<ApiDto, Model>(page: PageApi<ApiDto>, mapper: (item: ApiDto) => Model): PaginaCatalogo<Model> {
  if (!isRecord(page) || !Array.isArray(page.data) || !isRecord(page.pagination)) {
    throw new ApiClientError('A API retornou uma página de catálogo inválida.', 'invalid-response');
  }
  const { offset, limit, count, hasMore } = page.pagination;
  if (typeof offset !== 'number' || typeof limit !== 'number' || typeof count !== 'number' || typeof hasMore !== 'boolean') {
    throw new ApiClientError('A API retornou paginação inválida.', 'invalid-response');
  }
  return { data: page.data.map(mapper), pagination: { offset, limit, count, hasMore } };
}

async function buscarPorTermo(termo: string, offset = 0, limit = LIMITE_PADRAO): Promise<PaginaCatalogo<Faixa>> {
  const page = await apiClient.get<PageApi<FaixaApi>>(
    `/api/v1/catalog/tracks${queryString({ q: termo, offset, limit })}`,
    { authenticated: true },
  );
  return mapPage(page, mapFaixa);
}

async function buscarFaixas(query: QueryCatalogo = {}): Promise<PaginaCatalogo<Faixa>> {
  const page = await apiClient.get<PageApi<FaixaApi>>(
    `/api/v1/catalog/tracks${queryString(query)}`,
    { authenticated: true },
  );
  return mapPage(page, mapFaixa);
}

async function buscarFaixasPorIds(ids: string[]): Promise<ResultadoFaixasPorIds> {
  if (ids.length > 50) throw new RangeError('É possível consultar até 50 faixas por chamada.');
  if (ids.some((id) => typeof id !== 'string' || id.length === 0 || id.length > 64)) {
    throw new RangeError('Cada ID de faixa deve ser uma string entre 1 e 64 caracteres.');
  }
  if (new Set(ids).size !== ids.length) throw new RangeError('A lista de faixas não pode conter IDs duplicados.');
  if (ids.length === 0) return { data: [], requestedIds: [], missingIds: [] };

  // Jamendo IDs são dígitos. Referências antigas inválidas ficam explícitas como ausentes.
  const idsConsultaveis = ids.filter((id) => /^\d+$/.test(id));
  const idsInvalidos = ids.filter((id) => !/^\d+$/.test(id));
  if (idsConsultaveis.length === 0) {
    return { data: [], requestedIds: [...ids], missingIds: [...ids] };
  }

  const query = new URLSearchParams({ ids: idsConsultaveis.join(',') });
  const response = await apiClient.get<unknown>(`/api/v1/catalog/tracks?${query.toString()}`, { authenticated: true });
  if (!isRecord(response) || !Array.isArray(response.data) ||
      !Array.isArray(response.requestedIds) || !Array.isArray(response.missingIds) ||
      !response.requestedIds.every((id) => typeof id === 'string') ||
      !response.missingIds.every((id) => typeof id === 'string')) {
    throw new ApiClientError('A API retornou uma resolução de faixas inválida.', 'invalid-response');
  }

  const requestedIds = response.requestedIds as string[];
  const missingFromApi = response.missingIds as string[];
  const requestedSet = new Set(idsConsultaveis);
  if (requestedIds.length !== idsConsultaveis.length ||
      requestedIds.some((id) => !requestedSet.has(id)) ||
      missingFromApi.some((id) => !requestedSet.has(id))) {
    throw new ApiClientError('A API retornou identificadores inconsistentes para as faixas.', 'invalid-response');
  }

  const tracks = response.data.map((value) => mapFaixa(value as FaixaApi));
  if (tracks.some((track) => !requestedSet.has(track.id))) {
    throw new ApiClientError('A API retornou uma faixa que não foi solicitada.', 'invalid-response');
  }
  const foundIds = new Set(tracks.map((track) => track.id));
  const missingSet = new Set([...missingFromApi, ...idsInvalidos]);

  return {
    data: tracks,
    requestedIds: [...ids],
    missingIds: ids.filter((id) => missingSet.has(id) || (requestedSet.has(id) && !foundIds.has(id))),
  };
}

async function buscarPorGeneros(generos: string[]): Promise<Faixa[]> {
  const permitidos = [...new Set(generos)].filter((genero) => GENEROS_COM_FILTRO_NO_BACKEND.has(genero));
  const pages = await Promise.all(permitidos.map((genre) => buscarFaixas({ genre, limit: 20 })));
  const seen = new Set<string>();
  return pages.flatMap((page) => page.data).filter((faixa) => {
    if (seen.has(faixa.id)) return false;
    seen.add(faixa.id);
    return true;
  });
}

async function buscarArtistas(q = '', offset = 0, limit = LIMITE_PADRAO): Promise<PaginaCatalogo<Artista>> {
  const page = await apiClient.get<PageApi<ArtistaApi>>(
    `/api/v1/catalog/artists${queryString({ q, offset, limit })}`,
    { authenticated: true },
  );
  return mapPage(page, mapArtista);
}

async function obterArtista(artistId: string): Promise<Artista> {
  const result = await apiClient.get<DataApi<ArtistaApi>>(
    `/api/v1/catalog/artists/${encodeURIComponent(artistId)}`,
    { authenticated: true },
  );
  if (!isRecord(result) || !isRecord(result.data)) {
    throw new ApiClientError('A API retornou um artista em formato inválido.', 'invalid-response');
  }
  return mapArtista(result.data as unknown as ArtistaApi);
}

async function buscarAlbuns(q = '', artistId?: string, offset = 0, limit = LIMITE_PADRAO): Promise<PaginaCatalogo<Album>> {
  const page = await apiClient.get<PageApi<AlbumApi>>(
    `/api/v1/catalog/albums${queryString({ q, artistId, offset, limit })}`,
    { authenticated: true },
  );
  return mapPage(page, mapAlbum);
}

async function obterAlbum(albumId: string): Promise<Album> {
  const result = await apiClient.get<DataApi<AlbumApi>>(
    `/api/v1/catalog/albums/${encodeURIComponent(albumId)}`,
    { authenticated: true },
  );
  if (!isRecord(result) || !isRecord(result.data)) {
    throw new ApiClientError('A API retornou um álbum em formato inválido.', 'invalid-response');
  }
  return mapAlbum(result.data as unknown as AlbumApi);
}

function buscarColecaoPorId(id: string): Promise<ColecaoDeFaixas | null> {
  // Detalhes de playlists mockadas permanecem locais nesta etapa. Álbuns reais têm telas próprias.
  const playlist = playlists.find((item) => item.id === id);
  if (playlist) {
    return Promise.resolve({
      id: playlist.id,
      titulo: playlist.titulo,
      legenda: playlist.descricao,
      capaUrl: playlist.capaUrl,
      faixas: playlist.faixas,
    });
  }
  const localAlbum = albuns.find((item) => item.id === id);
  if (localAlbum) {
    return Promise.resolve({
      id: localAlbum.id,
      titulo: localAlbum.titulo,
      legenda: `Álbum · ${localAlbum.artista}`,
      capaUrl: localAlbum.capaUrl,
      faixas: localAlbum.faixas ?? [],
    });
  }
  return Promise.resolve(null);
}

export const catalogoService = {
  listarPlaylists: () => Promise.resolve(playlists),
  listarAlbuns: (offset = 0, limit = LIMITE_PADRAO) => buscarAlbuns('', undefined, offset, limit),
  listarArtistas: (offset = 0, limit = LIMITE_PADRAO) => buscarArtistas('', offset, limit),
  buscarColecaoPorId,
  buscarPorTermo,
  buscarFaixas,
  buscarFaixasPorIds,
  buscarPorGeneros,
  buscarArtistas,
  obterArtista,
  buscarAlbuns,
  obterAlbum,
};
