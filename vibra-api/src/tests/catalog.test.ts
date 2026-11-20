import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';

import { BusinessError } from '../errors/business-error.js';
import {
  JamendoCredentialMissingError,
  JamendoProviderUnavailableError,
  JamendoResponseError,
  JamendoTimeoutError,
} from '../integrations/jamendo/jamendo.errors.js';
import type { JamendoEnvelope, JamendoQuery, JamendoResource } from '../integrations/jamendo/jamendo.types.js';
import type { JamendoClient } from '../integrations/jamendo/jamendo.client.js';
import type { CatalogAlbumsQuery, CatalogArtistsQuery, CatalogTracksQuery } from '../schemas/catalog.schema.js';
import { CatalogService } from '../services/catalog.service.js';

const trackOne = {
  id: '12345',
  name: 'Faixa de teste',
  artist_id: '101',
  artist_name: 'Artista de teste',
  duration: 213,
  album_id: '202',
  album_name: 'Álbum de teste',
  image: 'https://usercontent.jamendo.com/cover.jpg',
  audio: 'https://prod-1.storage.jamendo.com/audio.mp3',
  license_ccurl: 'https://creativecommons.org/licenses/by/4.0/',
  shareurl: 'https://www.jamendo.com/track/12345',
  musicinfo: { tags: { genres: ['rock'], instruments: ['guitar'], vartags: ['groovy'] } },
};

function envelope(results: JamendoEnvelope['results']): JamendoEnvelope {
  return {
    headers: { status: 'success', code: 0, error_message: '', results_count: results.length },
    results,
  };
}

function mockClient(
  handler: (resource: JamendoResource, query: JamendoQuery) => JamendoEnvelope | Promise<JamendoEnvelope>,
): Pick<JamendoClient, 'get'> {
  return { get: async (resource, query = {}) => handler(resource, query) };
}

const defaultQuery: CatalogTracksQuery = {
  q: undefined,
  artistId: undefined,
  albumId: undefined,
  genre: undefined,
  offset: 0,
  limit: 20,
};

const defaultArtistsQuery: CatalogArtistsQuery = { q: undefined, offset: 0, limit: 20 };
const defaultAlbumsQuery: CatalogAlbumsQuery = { q: undefined, artistId: undefined, offset: 0, limit: 20 };

const artistOne = {
  id: 123,
  name: 'Artista de teste',
  image: 'https://usercontent.jamendo.com/artist.jpg',
  website: 'https://example.com',
  shareurl: 'https://www.jamendo.com/artist/123',
};

const albumOne = {
  id: 456,
  name: 'Álbum de teste',
  artist_id: 123,
  artist_name: 'Artista de teste',
  image: 'https://usercontent.jamendo.com/album.jpg',
  releasedate: '2024-01-02',
  shareurl: 'https://www.jamendo.com/list/a456',
};

test('busca por texto usando o parâmetro search da Jamendo', async () => {
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (_resource, query) => {
    received = query;
    return envelope([trackOne]);
  }));

  const result = await service.searchTracks({ ...defaultQuery, q: 'faixa de teste' });
  assert.equal(received?.search, 'faixa de teste');
  assert.equal(result.data[0]?.id, '12345');
});

test('filtra por artista e álbum com IDs externos em string', async () => {
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (_resource, query) => {
    received = query;
    return envelope([trackOne]);
  }));

  await service.searchTracks({ ...defaultQuery, artistId: '101', albumId: '202' });
  assert.equal(received?.artist_id, '101');
  assert.equal(received?.album_id, '202');
});

test('mapeia somente os gêneros Vibra com correspondência definida', async () => {
  for (const [genre, tag] of [['Rock', 'rock'], ['Pop', 'pop'], ['Eletrônica', 'electronic']] as const) {
    let received: JamendoQuery | undefined;
    const service = new CatalogService(mockClient(async (_resource, query) => {
      received = query;
      return envelope([trackOne]);
    }));

    await service.searchTracks({ ...defaultQuery, genre });
    assert.deepEqual(received?.tags, [tag]);
  }
});

test('não inventa tags para gêneros sem correspondência confiável', async () => {
  for (const genre of ['MPB', 'Lo-fi', 'Indie'] as const) {
    let called = false;
    const service = new CatalogService(mockClient(async () => {
      called = true;
      return envelope([]);
    }));

    await assert.rejects(
      service.searchTracks({ ...defaultQuery, genre }),
      (error: unknown) => error instanceof BusinessError && error.code === 'CATALOG_GENRE_UNSUPPORTED',
    );
    assert.equal(called, false);
  }
});

test('página limita dados devolvidos e usa uma faixa extra para hasMore sem fullcount', async () => {
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (_resource, query) => {
    received = query;
    return envelope([
      trackOne,
      { ...trackOne, id: '12346', name: 'Faixa dois' },
      { ...trackOne, id: '12347', name: 'Faixa três' },
    ]);
  }));

  const result = await service.searchTracks({ ...defaultQuery, offset: 10, limit: 2 });
  assert.equal(received?.offset, 10);
  assert.equal(received?.limit, 3);
  assert.equal(received?.fullcount, undefined);
  assert.equal(result.data.length, 2);
  assert.deepEqual(result.pagination, { offset: 10, limit: 2, count: 2, hasMore: true });
});

test('retorna lista vazia com HTTP-neutro count zero e hasMore false', async () => {
  const service = new CatalogService(mockClient(async () => envelope([])));
  const result = await service.searchTracks(defaultQuery);
  assert.deepEqual(result, {
    data: [],
    pagination: { offset: 0, limit: 20, count: 0, hasMore: false },
  });
});

test('consulta detalhe usando /tracks com id e não assume álbum, áudio ou tags', async () => {
  let calledResource: JamendoResource | undefined;
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (resource, query) => {
    calledResource = resource;
    received = query;
    return envelope([{
      id: '98765',
      name: 'Single',
      artist_id: '5',
      artist_name: 'Artista',
      duration: 99,
      album_id: '',
      album_name: '',
      image: '',
      audio: '',
    }]);
  }));

  const result = await service.getTrackById('98765');
  assert.equal(calledResource, 'tracks');
  assert.equal(received?.id, '98765');
  assert.equal(result.albumId, undefined);
  assert.equal(result.album, undefined);
  assert.equal(result.audioUrl, undefined);
  assert.equal(result.capaUrl, undefined);
  assert.deepEqual(result.tags, []);
});

test('retorna TRACK_NOT_FOUND quando Jamendo não encontra o ID', async () => {
  const service = new CatalogService(mockClient(async () => envelope([])));
  await assert.rejects(
    service.getTrackById('98765'),
    (error: unknown) => error instanceof BusinessError && error.code === 'TRACK_NOT_FOUND',
  );
});

test('resposta Jamendo incompatível é rejeitada antes do mapeamento', async () => {
  const service = new CatalogService(mockClient(async () => envelope([{ id: '12', name: 'Sem artista' }])));
  await assert.rejects(service.searchTracks(defaultQuery), JamendoResponseError);
});

test('preserva os dados públicos Jamendo permitidos no DTO e omite detalhes externos excedentes', async () => {
  const service = new CatalogService(mockClient(async () => envelope([trackOne])));
  const result = await service.getTrackById('12345');
  assert.deepEqual(result, {
    id: '12345',
    titulo: 'Faixa de teste',
    artistaId: '101',
    artista: 'Artista de teste',
    albumId: '202',
    album: 'Álbum de teste',
    duracaoEmSegundos: 213,
    capaUrl: 'https://usercontent.jamendo.com/cover.jpg',
    audioUrl: 'https://prod-1.storage.jamendo.com/audio.mp3',
    genero: 'rock',
    tags: ['rock', 'guitar', 'groovy'],
    license: 'https://creativecommons.org/licenses/by/4.0/',
    jamendoUrl: 'https://www.jamendo.com/track/12345',
  });
});

test('busca artistas por namesearch e pagina sem solicitar fullcount', async () => {
  let resource: JamendoResource | undefined;
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (requestedResource, query) => {
    resource = requestedResource;
    received = query;
    return envelope([artistOne, { ...artistOne, id: '124' }, { ...artistOne, id: '125' }]);
  }));
  const result = await service.searchArtists({ ...defaultArtistsQuery, q: 'teste', offset: 5, limit: 2 });
  assert.equal(resource, 'artists');
  assert.equal(received?.namesearch, 'teste');
  assert.equal(received?.offset, 5);
  assert.equal(received?.limit, 3);
  assert.equal(received?.fullcount, undefined);
  assert.deepEqual(result.pagination, { offset: 5, limit: 2, count: 2, hasMore: true });
  assert.equal(result.data[0]?.id, '123');
});

test('detalha artista por id e omite campos opcionais ausentes', async () => {
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (_resource, query) => {
    received = query;
    return envelope([{ id: '987', name: 'Sem perfil' }]);
  }));
  assert.deepEqual(await service.getArtistById('987'), { id: '987', name: 'Sem perfil' });
  assert.equal(received?.id, '987');
});

test('mapeia artista para o DTO Vibra sem repassar campos Jamendo extras', async () => {
  const service = new CatalogService(mockClient(async () => envelope([{ ...artistOne, private_field: 'omit' }])));
  assert.deepEqual(await service.getArtistById('123'), {
    id: '123', name: 'Artista de teste', imageUrl: artistOne.image,
    website: artistOne.website, shareUrl: artistOne.shareurl,
  });
});

test('busca álbuns por namesearch e artist_id e mantém IDs como strings', async () => {
  let received: JamendoQuery | undefined;
  const service = new CatalogService(mockClient(async (_resource, query) => {
    received = query;
    return envelope([albumOne]);
  }));
  const result = await service.searchAlbums({ ...defaultAlbumsQuery, q: 'álbum', artistId: '123' });
  assert.equal(received?.namesearch, 'álbum');
  assert.equal(received?.artist_id, '123');
  assert.equal(result.data[0]?.id, '456');
  assert.equal(result.data[0]?.artistId, '123');
});

test('detalha álbum e preserva apenas campos documentados presentes', async () => {
  const service = new CatalogService(mockClient(async () => envelope([{
    id: '789', name: 'Single', artist_name: 'Artista',
  }])));
  assert.deepEqual(await service.getAlbumById('789'), {
    id: '789', name: 'Single', artistName: 'Artista',
  });
});

test('mapeia os campos públicos documentados do álbum', async () => {
  const service = new CatalogService(mockClient(async () => envelope([{ ...albumOne, zip: 'omit' }])));
  assert.deepEqual(await service.getAlbumById('456'), {
    id: '456', name: 'Álbum de teste', artistId: '123', artistName: 'Artista de teste',
    imageUrl: albumOne.image, releasedate: albumOne.releasedate, shareUrl: albumOne.shareurl,
  });
});

test('retorna listas vazias, 404 para detalhes ausentes e rejeita resposta incompatível', async () => {
  const emptyService = new CatalogService(mockClient(async () => envelope([])));
  assert.deepEqual((await emptyService.searchArtists(defaultArtistsQuery)).pagination,
    { offset: 0, limit: 20, count: 0, hasMore: false });
  await assert.rejects(emptyService.getArtistById('1'),
    (error: unknown) => error instanceof BusinessError && error.code === 'ARTIST_NOT_FOUND');
  await assert.rejects(emptyService.getAlbumById('1'),
    (error: unknown) => error instanceof BusinessError && error.code === 'ALBUM_NOT_FOUND');
  const invalidService = new CatalogService(mockClient(async () => envelope([{ id: '2', name: 'Sem artista' }])));
  await assert.rejects(invalidService.searchAlbums(defaultAlbumsQuery), JamendoResponseError);
});

const userId = 'a7ce72c6-30dd-4b36-a1cf-26e8a01eb1ab';
let baseUrl = '';
let server: Server;
let catalogService: (typeof import('../services/catalog.service.js'))['catalogService'];
let originals: Pick<typeof catalogService,
  'searchTracks' | 'getTrackById' | 'searchArtists' | 'getArtistById' | 'searchAlbums' | 'getAlbumById'>;
let signAccessToken: (id: string) => Promise<string>;

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('base64url');
  const [{ default: app }, serviceModule, jwtModule] = await Promise.all([
    import('../app.js'),
    import('../services/catalog.service.js'),
    import('../utils/jwt.js'),
  ]);
  catalogService = serviceModule.catalogService;
  signAccessToken = jwtModule.signAccessToken;
  originals = {
    searchTracks: catalogService.searchTracks,
    getTrackById: catalogService.getTrackById,
    searchArtists: catalogService.searchArtists,
    getArtistById: catalogService.getArtistById,
    searchAlbums: catalogService.searchAlbums,
    getAlbumById: catalogService.getAlbumById,
  };
  catalogService.searchTracks = async (query) => ({
    data: [{ id: '12345', titulo: query.q ?? 'Faixa', artistaId: '101', artista: 'Artista', duracaoEmSegundos: 213, tags: [] }],
    pagination: { offset: query.offset, limit: query.limit, count: 1, hasMore: false },
  });
  catalogService.getTrackById = async (trackId) => {
    if (trackId === '999') throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada.');
    return { id: trackId, titulo: 'Faixa', artistaId: '101', artista: 'Artista', duracaoEmSegundos: 213, tags: [] };
  };
  catalogService.searchArtists = async (query) => ({
    data: [{ id: '123', name: query.q ?? 'Artista' }],
    pagination: { offset: query.offset, limit: query.limit, count: 1, hasMore: false },
  });
  catalogService.getArtistById = async (artistId) => ({ id: artistId, name: 'Artista' });
  catalogService.searchAlbums = async (query) => ({
    data: [{ id: '456', name: query.q ?? 'Álbum', artistName: 'Artista' }],
    pagination: { offset: query.offset, limit: query.limit, count: 1, hasMore: false },
  });
  catalogService.getAlbumById = async (albumId) => ({ id: albumId, name: 'Álbum', artistName: 'Artista' });

  const testApp = express();
  testApp.use(express.json());
  testApp.use(app);
  server = testApp.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  Object.assign(catalogService, originals);
  delete process.env.JWT_SECRET;
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? undefined : await response.json() as Record<string, unknown>;
  return { response, body };
}

async function authorization(): Promise<string> {
  return `Bearer ${await signAccessToken(userId)}`;
}

test('GET /catalog/tracks exige autenticação e retorna resposta com paginação', async () => {
  const { response, body } = await request('/api/v1/catalog/tracks?q=ambient&limit=4&offset=8', {
    headers: { authorization: await authorization() },
  });
  assert.equal(response.status, 200);
  assert.equal((body?.data as Array<{ titulo: string }>)[0]?.titulo, 'ambient');
  assert.deepEqual(body?.pagination, { offset: 8, limit: 4, count: 1, hasMore: false });
});

test('GET /catalog/tracks/:trackId exige autenticação e mapeia faixa inexistente para 404', async () => {
  const token = await authorization();
  const found = await request('/api/v1/catalog/tracks/12345', { headers: { authorization: token } });
  assert.equal(found.response.status, 200);
  assert.equal((found.body?.data as { id: string }).id, '12345');

  const missing = await request('/api/v1/catalog/tracks/999', { headers: { authorization: token } });
  assert.equal(missing.response.status, 404);
  assert.equal((missing.body?.error as { code: string }).code, 'TRACK_NOT_FOUND');
});

test('rejeita requisições sem JWT e parâmetros inválidos ou desconhecidos', async () => {
  const noAuth = await request('/api/v1/catalog/tracks');
  assert.equal(noAuth.response.status, 401);
  const noAuthDetail = await request('/api/v1/catalog/tracks/12345');
  assert.equal(noAuthDetail.response.status, 401);
  const invalidQuery = await request('/api/v1/catalog/tracks?limit=51&unexpected=1', {
    headers: { authorization: await authorization() },
  });
  assert.equal(invalidQuery.response.status, 400);
  const invalidId = await request('/api/v1/catalog/tracks/not-an-id', {
    headers: { authorization: await authorization() },
  });
  assert.equal(invalidId.response.status, 400);
});

test('converte erros da Jamendo em respostas seguras sem detalhes do provedor', async () => {
  const secret = 'client-id-must-not-leak';
  const cases = [
    [new JamendoTimeoutError(100, new Error(secret)), 504, 'CATALOG_TIMEOUT'],
    [new JamendoProviderUnavailableError(new Error(secret), secret), 503, 'CATALOG_UNAVAILABLE'],
    [new JamendoCredentialMissingError(), 503, 'CATALOG_UNAVAILABLE'],
    [new JamendoResponseError(new Error(secret), secret), 502, 'CATALOG_PROVIDER_ERROR'],
  ] as const;

  for (const [error, status, code] of cases) {
    catalogService.searchTracks = async () => { throw error; };
    const { response, body } = await request('/api/v1/catalog/tracks', {
      headers: { authorization: await authorization() },
    });
    assert.equal(response.status, status);
    assert.equal((body?.error as { code: string }).code, code);
    assert.equal(JSON.stringify(body).includes(secret), false);
  }
});

test('rotas de artistas e álbuns exigem autenticação, validam IDs e mantêm envelope paginado', async () => {
  for (const path of [
    '/api/v1/catalog/artists', '/api/v1/catalog/artists/123',
    '/api/v1/catalog/albums', '/api/v1/catalog/albums/456',
  ]) {
    const noAuth = await request(path);
    assert.equal(noAuth.response.status, 401, path);
  }
  const token = await authorization();
  const artists = await request('/api/v1/catalog/artists?q=nome&limit=3&offset=4', {
    headers: { authorization: token },
  });
  assert.equal(artists.response.status, 200);
  assert.deepEqual(artists.body?.pagination, { offset: 4, limit: 3, count: 1, hasMore: false });
  const artist = await request('/api/v1/catalog/artists/123', { headers: { authorization: token } });
  assert.equal((artist.body?.data as { id: string }).id, '123');

  const albums = await request('/api/v1/catalog/albums?q=nome&artistId=123', { headers: { authorization: token } });
  assert.equal(albums.response.status, 200);
  assert.equal((albums.body?.data as Array<{ id: string }>)[0]?.id, '456');
  const album = await request('/api/v1/catalog/albums/456', { headers: { authorization: token } });
  assert.equal((album.body?.data as { id: string }).id, '456');

  const invalidId = await request('/api/v1/catalog/albums/%20', { headers: { authorization: token } });
  assert.equal(invalidId.response.status, 400);
  const unknownQuery = await request('/api/v1/catalog/artists?unexpected=1', { headers: { authorization: token } });
  assert.equal(unknownQuery.response.status, 400);
});

test('preserva GET /health', async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', service: 'vibra-api' });
});
