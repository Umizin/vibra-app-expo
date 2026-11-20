// Frontend does not install Node type definitions or a test runner; execute via the existing backend tsx runner.
// @ts-nocheck
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { ApiClientError, VibraApiClient } from '@/services/api';
import { criarAuthService, type AuthApi, type TokenStorage } from '@/services/authService';
import { definirTokenDeAcesso, obterTokenDeAcesso, observarExpiracaoDeSessao } from '@/services/sessao';

const perfil = { id: 'user-01', email: 'vibra@example.com', displayName: 'Vibra User' };

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('cliente HTTP constrói URL, serializa JSON e envia Bearer apenas quando autenticado', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const client = new VibraApiClient({
    baseUrlProvider: () => 'http://vibra.local:3001',
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return jsonResponse({ data: 'ok' });
    },
  });

  await client.post('/api/v1/auth/login', { email: 'a@b.com', password: 'not-logged' });
  assert.equal(capturedUrl, 'http://vibra.local:3001/api/v1/auth/login');
  assert.equal((capturedInit?.headers as Record<string, string>).accept, 'application/json');
  assert.equal((capturedInit?.headers as Record<string, string>)['content-type'], 'application/json');
  assert.equal(capturedInit?.body, JSON.stringify({ email: 'a@b.com', password: 'not-logged' }));
  assert.equal((capturedInit?.headers as Record<string, string>).authorization, undefined);

  definirTokenDeAcesso('jwt-example');
  await client.get('/api/v1/users/me', { authenticated: true });
  assert.equal((capturedInit?.headers as Record<string, string>).authorization, 'Bearer jwt-example');
  definirTokenDeAcesso(null);
});

test('cliente HTTP converte erro da API, JSON inválido, falha de rede, timeout e configuração ausente', async () => {
  const badStatus = new VibraApiClient({
    baseUrlProvider: () => 'https://api.example.test',
    fetchImpl: async () => jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } }, 401),
  });
  await assert.rejects(badStatus.get('/api/v1/users/me'), (error: unknown) =>
    error instanceof ApiClientError && error.status === 401 && error.code === 'INVALID_CREDENTIALS');

  definirTokenDeAcesso('expired-token');
  const unauthorized = new VibraApiClient({
    baseUrlProvider: () => 'https://api.example.test',
    fetchImpl: async () => jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Sessão expirada.' } }, 401),
  });
  await assert.rejects(unauthorized.get('/api/v1/users/me', { authenticated: true }));
  assert.equal(obterTokenDeAcesso(), null);

  const badJson = new VibraApiClient({
    baseUrlProvider: () => 'https://api.example.test',
    fetchImpl: async () => new Response('{', { status: 200 }),
  });
  await assert.rejects(badJson.get('/api/v1/catalog/tracks'),
    (error: unknown) => error instanceof ApiClientError && error.kind === 'invalid-response');

  const offline = new VibraApiClient({
    baseUrlProvider: () => 'https://api.example.test',
    fetchImpl: async () => { throw new TypeError('private network details'); },
  });
  await assert.rejects(offline.get('/api/v1/catalog/tracks'),
    (error: unknown) => error instanceof ApiClientError && error.kind === 'network' && !error.message.includes('private'));

  const timeout = new VibraApiClient({
    baseUrlProvider: () => 'https://api.example.test',
    timeoutMs: 1,
    fetchImpl: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'TimeoutError')));
    }),
  });
  await assert.rejects(timeout.get('/api/v1/catalog/tracks'),
    (error: unknown) => error instanceof ApiClientError && error.kind === 'timeout');

  const unconfigured = new VibraApiClient({ baseUrlProvider: () => undefined, fetchImpl: async () => jsonResponse({}) });
  await assert.rejects(unconfigured.get('/api/v1/catalog/tracks'),
    (error: unknown) => error instanceof ApiClientError && error.kind === 'configuration');

  const oldNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const insecureProductionUrl = new VibraApiClient({ baseUrlProvider: () => 'http://api.example.test' });
  await assert.rejects(insecureProductionUrl.get('/api/v1/catalog/tracks'),
    (error: unknown) => error instanceof ApiClientError && error.kind === 'configuration');
  if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = oldNodeEnv;
});

function mockStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: TokenStorage = {
    salvar: async (key, value) => { values.set(key, value); },
    ler: async (key) => values.get(key) ?? null,
    remover: async (key) => { values.delete(key); },
  };
  return { storage, values };
}

test('authService integra login, cadastro, recuperação, perfil e logout sem persistir senha', async () => {
  const calls: Array<{ method: string; path: string; body?: unknown; options?: unknown }> = [];
  const api: AuthApi = {
    post: async <T>(path: string, body: unknown) => {
      calls.push({ method: 'POST', path, body });
      return { data: { user: perfil, accessToken: 'jwt-session', tokenType: 'Bearer', expiresIn: 604800 } } as T;
    },
    get: async <T>(path: string, options?: unknown) => {
      calls.push({ method: 'GET', path, options });
      return { data: perfil } as T;
    },
    patch: async <T>(path: string, body: unknown, options?: unknown) => {
      calls.push({ method: 'PATCH', path, body, options });
      return { data: { ...perfil, displayName: 'Novo nome' } } as T;
    },
  };
  const { storage, values } = mockStorage();
  const auth = criarAuthService(api, storage);

  const logado = await auth.entrar(' vibra@example.com ', 'senha-secreta');
  assert.deepEqual(logado, { id: perfil.id, email: perfil.email, nome: perfil.displayName });
  assert.equal(calls[0]?.path, '/api/v1/auth/login');
  assert.deepEqual(calls[0]?.body, { email: 'vibra@example.com', password: 'senha-secreta' });
  assert.equal(values.get('vibra.tokenDeAcesso'), 'jwt-session');
  assert.equal([...values.keys()].some((key) => key.toLowerCase().includes('senha')), false);
  assert.equal(obterTokenDeAcesso(), 'jwt-session');

  const recuperado = await auth.recuperarSessao();
  assert.equal(recuperado?.id, perfil.id);
  assert.equal(calls[1]?.path, '/api/v1/users/me');
  assert.deepEqual(calls[1]?.options, { authenticated: true });

  const alterado = await auth.atualizarPerfil({ displayName: 'Novo nome' });
  assert.equal(alterado.nome, 'Novo nome');
  assert.equal(calls[2]?.method, 'PATCH');

  const cadastrado = criarAuthService({
    ...api,
    post: async <T>(path: string, body: unknown) => {
      calls.push({ method: 'POST', path, body });
      return { data: { user: perfil, accessToken: 'jwt-after-register', tokenType: 'Bearer', expiresIn: 604800 } } as T;
    },
  }, mockStorage().storage);
  await cadastrado.cadastrar(' Nome ', ' mail@example.com ', 'senha-de-cadastro');
  assert.deepEqual(calls[3]?.body, {
    displayName: 'Nome', email: 'mail@example.com', password: 'senha-de-cadastro',
  });

  await auth.sair();
  assert.equal(obterTokenDeAcesso(), null);
  assert.equal(values.has('vibra.tokenDeAcesso'), false);
});

test('sessão expirada no perfil remove token persistido e invalida o token em memória', async () => {
  const { storage, values } = mockStorage({ 'vibra.tokenDeAcesso': 'expired-token' });
  const auth = criarAuthService({
    get: async () => { throw new ApiClientError('Sessão expirada.', 'http', 401, 'UNAUTHORIZED'); },
    post: async () => ({}) as never,
    patch: async () => ({}) as never,
  }, storage);
  let expirationNotified = false;
  const unsubscribe = observarExpiracaoDeSessao(() => { expirationNotified = true; });
  assert.equal(await auth.recuperarSessao(), null);
  assert.equal(values.has('vibra.tokenDeAcesso'), false);
  assert.equal(obterTokenDeAcesso(), null);
  unsubscribe();
  assert.equal(expirationNotified, false);
});

let originalFetch: typeof fetch;
let fetchCalls: Array<{ url: URL; init: RequestInit }> = [];
let catalogo: typeof import('@/services/catalogoService').catalogoService;

before(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://vibra.test:3001';
  originalFetch = globalThis.fetch;
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    fetchCalls.push({ url, init: init ?? {} });
    if (url.pathname.endsWith('/tracks')) {
      return jsonResponse({ data: [{
        id: 'jamendo-001', titulo: 'Faixa real', artistaId: 'artist-02', artista: 'Artista real',
        duracaoEmSegundos: 120, tags: ['ambient'],
      }], pagination: { offset: Number(url.searchParams.get('offset') ?? 0), limit: 2, count: 1, hasMore: true } });
    }
    if (url.pathname.endsWith('/artists')) {
      return jsonResponse({ data: [{ id: 'artist-02', name: 'Artista real' }], pagination: { offset: 0, limit: 20, count: 1, hasMore: false } });
    }
    if (url.pathname.endsWith('/albums')) {
      return jsonResponse({ data: [{ id: 'album-03', name: 'Álbum real', artistName: 'Artista real' }], pagination: { offset: 0, limit: 20, count: 1, hasMore: false } });
    }
    if (url.pathname.endsWith('/artists/artist-02')) return jsonResponse({ data: { id: 'artist-02', name: 'Artista real' } });
    if (url.pathname.endsWith('/albums/album-03')) return jsonResponse({ data: { id: 'album-03', name: 'Álbum real', artistName: 'Artista real' } });
    return jsonResponse({ data: { id: 'jamendo-001', titulo: 'Faixa real' } });
  }) as typeof fetch;
  definirTokenDeAcesso('catalog-token');
  catalogo = (await import('@/services/catalogoService')).catalogoService;
});

after(() => {
  globalThis.fetch = originalFetch;
  delete process.env.EXPO_PUBLIC_API_URL;
  definirTokenDeAcesso(null);
});

test('catalogService consome tracks, artists e albums da API própria com filtros e paginação', async () => {
  definirTokenDeAcesso('catalog-token');
  const faixas = await catalogo.buscarPorTermo(' faixa ', 4, 2);
  assert.equal(faixas.data[0]?.id, 'jamendo-001');
  assert.equal(faixas.data[0]?.capaUrl, undefined);
  assert.equal(faixas.data[0]?.audioUrl, undefined);
  assert.equal(faixas.pagination.offset, 4);
  assert.equal(faixas.pagination.hasMore, true);

  await catalogo.buscarFaixas({ artistId: 'artist-02', albumId: 'album-03', genre: 'Rock', offset: 6, limit: 5 });
  await catalogo.buscarArtistas('Mina');
  await catalogo.buscarAlbuns('Disco', 'artist-02');
  assert.equal((await catalogo.obterArtista('artist-02')).id, 'artist-02');
  assert.equal((await catalogo.obterAlbum('album-03')).id, 'album-03');

  assert.equal(fetchCalls[0]?.url.origin, 'http://vibra.test:3001');
  assert.equal(fetchCalls[0]?.url.searchParams.get('q'), 'faixa');
  assert.equal(fetchCalls[0]?.init.headers && (fetchCalls[0].init.headers as Record<string, string>).authorization,
    'Bearer catalog-token');
  assert.equal(fetchCalls[1]?.url.searchParams.get('artistId'), 'artist-02');
  assert.equal(fetchCalls[1]?.url.searchParams.get('albumId'), 'album-03');
  assert.equal(fetchCalls[1]?.url.searchParams.get('genre'), 'Rock');
  assert.equal(fetchCalls[1]?.url.searchParams.get('offset'), '6');
  assert.equal(fetchCalls[2]?.url.searchParams.get('q'), 'Mina');
  assert.equal(fetchCalls[3]?.url.searchParams.get('q'), 'Disco');
  assert.equal(fetchCalls[3]?.url.searchParams.get('artistId'), 'artist-02');
  assert.equal(fetchCalls[4]?.url.pathname, '/api/v1/catalog/artists/artist-02');
  assert.equal(fetchCalls[5]?.url.pathname, '/api/v1/catalog/albums/album-03');
});

test('catalogService preserva IDs de artistas/álbuns como strings e trata resultados vazios', async () => {
  definirTokenDeAcesso('catalog-token');
  const artistas = await catalogo.buscarArtistas('Mina');
  const albuns = await catalogo.buscarAlbuns('Disco', 'artist-02');
  assert.equal(artistas.data[0]?.id, 'artist-02');
  assert.equal(albuns.data[0]?.id, 'album-03');
  assert.equal(albuns.data[0]?.capaUrl, undefined);

  const original = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ data: [], pagination: { offset: 0, limit: 20, count: 0, hasMore: false } });
  try {
    assert.deepEqual(await catalogo.buscarPorTermo('sem resultado'), {
      data: [], pagination: { offset: 0, limit: 20, count: 0, hasMore: false },
    });
  } finally {
    globalThis.fetch = original;
  }
});
