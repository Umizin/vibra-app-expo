// Frontend tests run with the existing backend tsx/node:test toolchain.
// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiClientError } from '@/services/api';
import {
  calcularProximaPosicao,
  carregarDetalhesPlaylist,
  criarGerenciadorDetalhesPlaylist,
} from '@/hooks/usePlaylistDetalhes';

const playlistId = 'a465e5fa-ae82-4ad0-9cb5-24ad4da4b84f';
const playlist = {
  id: playlistId,
  name: 'Para ouvir',
  description: null,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  trackCount: 2,
};

function referencia(jamendoTrackId, position) {
  return { jamendoTrackId, position, addedAt: '2026-11-20T10:05:00.000Z' };
}

function faixa(id, titulo = `Faixa ${id}`) {
  return { id, titulo, artista: 'Artista', artistaId: '9', duracaoEmSegundos: 120, tags: [] };
}

function mockServices({
  playlistData = playlist,
  referencias = [referencia('20', 1), referencia('10', 0)],
  lotes = [{ data: [faixa('10'), faixa('20')], requestedIds: ['10', '20'], missingIds: [] }],
  overrides = {},
} = {}) {
  const calls = { buscarPlaylist: 0, listarFaixas: 0, adicionar: [], remover: [], ids: [] };
  const playlists = {
    buscarPlaylist: async (id) => {
      calls.buscarPlaylist += 1;
      assert.equal(id, playlistId);
      return playlistData;
    },
    listarFaixas: async (id) => {
      calls.listarFaixas += 1;
      assert.equal(id, playlistId);
      return referencias;
    },
    adicionarFaixa: async (id, dados) => {
      calls.adicionar.push({ id, dados });
      return { ...dados, addedAt: '2026-11-20T11:00:00.000Z' };
    },
    removerFaixa: async (id, jamendoTrackId) => {
      calls.remover.push({ id, jamendoTrackId });
    },
    ...overrides.playlists,
  };
  const catalogo = {
    buscarFaixasPorIds: async (ids) => {
      calls.ids.push([...ids]);
      const lote = lotes[calls.ids.length - 1] ?? lotes.at(-1);
      return lote;
    },
    ...overrides.catalogo,
  };
  return { playlists, catalogo, calls };
}

test('carrega a playlist persistida, resolve faixas em lote e preserva a ordem de position', async () => {
  const { playlists, catalogo, calls } = mockServices();
  const detalhes = await carregarDetalhesPlaylist(playlistId, { playlists, catalogo });

  assert.equal(detalhes.playlist.id, playlistId);
  assert.deepEqual(calls.ids, [['10', '20']]);
  assert.deepEqual(detalhes.faixas.map((item) => item.referencia.jamendoTrackId), ['10', '20']);
  assert.deepEqual(detalhes.faixas.map((item) => item.faixa?.titulo), ['Faixa 10', 'Faixa 20']);
});

test('trata missingIds como faixa indisponível sem inventar metadados', async () => {
  const { playlists, catalogo } = mockServices({
    referencias: [referencia('10', 0), referencia('999', 1)],
    lotes: [{
      data: [faixa('10')],
      requestedIds: ['10', '999'],
      missingIds: ['999'],
    }],
  });
  const detalhes = await carregarDetalhesPlaylist(playlistId, { playlists, catalogo });
  assert.equal(detalhes.faixas[0]?.faixa?.id, '10');
  assert.equal(detalhes.faixas[1]?.faixa, null);
  assert.equal(detalhes.faixas[1]?.referencia.jamendoTrackId, '999');
});

test('ignora metadados retornados para IDs listados em missingIds', async () => {
  const { playlists, catalogo } = mockServices({
    referencias: [referencia('999', 0)],
    lotes: [{
      data: [{ ...faixa('999'), titulo: 'Não usar' }],
      requestedIds: ['999'],
      missingIds: ['999'],
    }],
  });
  const detalhes = await carregarDetalhesPlaylist(playlistId, { playlists, catalogo });
  assert.equal(detalhes.faixas[0]?.faixa, null);
});

test('resolve mais de 50 IDs únicos em lotes de até 50', async () => {
  const ids = Array.from({ length: 51 }, (_, index) => String(index + 1));
  const { playlists, catalogo, calls } = mockServices({
    referencias: ids.map((id, position) => referencia(id, position)),
    lotes: [
      { data: ids.slice(0, 50).map((id) => faixa(id)), requestedIds: ids.slice(0, 50), missingIds: [] },
      { data: [faixa('51')], requestedIds: ['51'], missingIds: [] },
    ],
  });
  const detalhes = await carregarDetalhesPlaylist(playlistId, { playlists, catalogo });
  assert.deepEqual(calls.ids[0], ids.slice(0, 50));
  assert.deepEqual(calls.ids[1], ['51']);
  assert.equal(detalhes.faixas.length, 51);
  assert.equal(detalhes.faixas[50]?.faixa?.id, '51');
});

test('playlist vazia não consulta o catálogo', async () => {
  const { playlists, catalogo, calls } = mockServices({ referencias: [] });
  const detalhes = await carregarDetalhesPlaylist(playlistId, { playlists, catalogo });
  assert.deepEqual(detalhes.faixas, []);
  assert.deepEqual(calls.ids, []);
});

test('playlist inexistente e falha de autenticação preservam o erro HTTP', async () => {
  await assert.rejects(
    carregarDetalhesPlaylist(playlistId, {
      playlists: mockServices({
        overrides: {
          playlists: {
            buscarPlaylist: async () => {
              throw new ApiClientError('Playlist não encontrada.', 'http', 404, 'PLAYLIST_NOT_FOUND');
            },
            listarFaixas: async () => [],
          },
        },
      }).playlists,
      catalogo: mockServices().catalogo,
    }),
    (error) => error instanceof ApiClientError && error.status === 404,
  );

  await assert.rejects(
    carregarDetalhesPlaylist(playlistId, {
      playlists: mockServices({
        overrides: {
          playlists: {
            buscarPlaylist: async () => {
              throw new ApiClientError('Sua sessão expirou. Entre novamente.', 'http', 401, 'UNAUTHORIZED');
            },
            listarFaixas: async () => [],
          },
        },
      }).playlists,
      catalogo: mockServices().catalogo,
    }),
    (error) => error instanceof ApiClientError && error.status === 401,
  );
});

test('gerenciador expõe carregamento, erro e nova tentativa', async () => {
  let falhar = true;
  const { playlists, catalogo } = mockServices({
    overrides: {
      playlists: {
        buscarPlaylist: async () => {
          if (falhar) throw new Error('Falha de rede');
          return playlist;
        },
        listarFaixas: async () => [],
      },
    },
  });
  const manager = criarGerenciadorDetalhesPlaylist(playlistId, { playlists, catalogo });
  await manager.carregar();
  assert.equal(manager.obterEstado().erro, 'Falha de rede');
  assert.equal(manager.obterEstado().carregando, false);

  falhar = false;
  await manager.carregar();
  assert.equal(manager.obterEstado().playlist?.id, playlistId);
  assert.equal(manager.obterEstado().erro, null);
});

test('inclusão envia o ID Jamendo, calcula a próxima posição e recarrega os dados', async () => {
  const estado = { referencias: [referencia('10', 4)] };
  const { playlists, catalogo, calls } = mockServices({
    referencias: estado.referencias,
    lotes: [{ data: [faixa('10')], requestedIds: ['10'], missingIds: [] }],
    overrides: {
      playlists: {
        listarFaixas: async () => estado.referencias,
        adicionarFaixa: async (id, dados) => {
          calls.adicionar.push({ id, dados });
          estado.referencias = [...estado.referencias, referencia(dados.jamendoTrackId, dados.position)];
          return { ...dados, addedAt: '2026-11-20T11:00:00.000Z' };
        },
      },
      catalogo: {
        buscarFaixasPorIds: async (ids) => ({
          data: ids.map((id) => faixa(id)),
          requestedIds: ids,
          missingIds: [],
        }),
      },
    },
  });
  const manager = criarGerenciadorDetalhesPlaylist(playlistId, { playlists, catalogo });
  await manager.carregar();
  assert.equal(await manager.adicionar('10'), false);
  assert.equal(await manager.adicionar('20'), true);
  assert.deepEqual(calls.adicionar, [{ id: playlistId, dados: { jamendoTrackId: '20', position: 5 } }]);
  assert.deepEqual(manager.obterEstado().faixas.map((item) => item.referencia.jamendoTrackId), ['10', '20']);
});

test('remoção usa o ID Jamendo e atualiza a lista', async () => {
  const estado = { referencias: [referencia('10', 0), referencia('20', 1)] };
  const { playlists, catalogo, calls } = mockServices({
    referencias: estado.referencias,
    overrides: {
      playlists: {
        listarFaixas: async () => estado.referencias,
        removerFaixa: async (id, jamendoTrackId) => {
          calls.remover.push({ id, jamendoTrackId });
          estado.referencias = estado.referencias.filter((item) => item.jamendoTrackId !== jamendoTrackId);
        },
      },
      catalogo: {
        buscarFaixasPorIds: async (ids) => ({
          data: ids.map((id) => faixa(id)),
          requestedIds: ids,
          missingIds: [],
        }),
      },
    },
  });
  const manager = criarGerenciadorDetalhesPlaylist(playlistId, { playlists, catalogo });
  await manager.carregar();
  assert.equal(await manager.remover('10'), true);
  assert.deepEqual(calls.remover, [{ id: playlistId, jamendoTrackId: '10' }]);
  assert.deepEqual(manager.obterEstado().faixas.map((item) => item.referencia.jamendoTrackId), ['20']);
});

test('conflito de posição recarrega as faixas e relança o erro 409', async () => {
  const estado = { referencias: [referencia('10', 0)] };
  const { playlists, catalogo, calls } = mockServices({
    referencias: estado.referencias,
    overrides: {
      playlists: {
        listarFaixas: async () => estado.referencias,
        adicionarFaixa: async (_id, dados) => {
          calls.adicionar.push(dados);
          estado.referencias = [referencia('10', 0), referencia('99', 1)];
          throw new ApiClientError('Esta posição já está ocupada na playlist.', 'http', 409, 'PLAYLIST_POSITION_IN_USE');
        },
      },
      catalogo: {
        buscarFaixasPorIds: async (ids) => ({
          data: ids.map((id) => faixa(id)),
          requestedIds: ids,
          missingIds: [],
        }),
      },
    },
  });
  const manager = criarGerenciadorDetalhesPlaylist(playlistId, { playlists, catalogo });
  await manager.carregar();
  await assert.rejects(manager.adicionar('20'), (error) =>
    error instanceof ApiClientError && error.status === 409 && error.code === 'PLAYLIST_POSITION_IN_USE');
  assert.deepEqual(manager.obterEstado().faixas.map((item) => item.referencia.jamendoTrackId), ['10', '99']);
  assert.equal(manager.obterEstado().processando, false);
});

test('impede inclusão duplicada enquanto a operação anterior não termina', async () => {
  let finishAdd;
  const { playlists, catalogo, calls } = mockServices({
    referencias: [],
    overrides: {
      playlists: {
        listarFaixas: async () => [],
        adicionarFaixa: async (_id, dados) => {
          calls.adicionar.push(dados);
          return new Promise((resolve) => { finishAdd = resolve; });
        },
      },
    },
  });
  const manager = criarGerenciadorDetalhesPlaylist(playlistId, { playlists, catalogo });
  await manager.carregar();
  const primeira = manager.adicionar('10');
  assert.equal(manager.obterEstado().processando, true);
  assert.equal(await manager.adicionar('11'), false);
  assert.equal(await manager.adicionar('10'), false);
  assert.equal(calls.adicionar.length, 1);
  finishAdd(referencia('10', 0));
  assert.equal(await primeira, true);
  assert.equal(manager.obterEstado().processando, false);
});

test('calcularProximaPosicao usa o maior position existente', () => {
  assert.equal(calcularProximaPosicao([]), 0);
  assert.equal(calcularProximaPosicao([referencia('1', 2), referencia('2', 7)]), 8);
  assert.throws(() => calcularProximaPosicao([referencia('1', 2_147_483_647)]), RangeError);
});
