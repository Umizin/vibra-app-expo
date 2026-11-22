// Frontend tests run with the existing backend tsx/node:test toolchain.
// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  criarGerenciadorBibliotecaPlaylists,
  executarSeConfirmado,
  validarFormularioPlaylist,
} from '@/hooks/useBibliotecaPlaylists';

const playlist = {
  id: 'a465e5fa-ae82-4ad0-9cb5-24ad4da4b84f',
  name: 'Favoritas para viagem',
  description: 'Uma seleção',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  trackCount: 2,
};

function mockService(overrides = {}) {
  const calls = { list: 0, create: [], update: [], delete: [] };
  const service = {
    listarPlaylists: async () => { calls.list += 1; return []; },
    criarPlaylist: async (data) => { calls.create.push(data); return playlist; },
    atualizarPlaylist: async (id, data) => { calls.update.push({ id, data }); return { ...playlist, ...data }; },
    excluirPlaylist: async (id) => { calls.delete.push(id); },
    ...overrides,
  };
  return { service, calls };
}

test('Biblioteca expõe carregamento, lista vazia, erro e nova tentativa', async () => {
  let resolveList;
  const { service, calls } = mockService({
    listarPlaylists: async () => {
      calls.list += 1;
      if (calls.list === 1) throw new Error('Falha de rede');
      return new Promise((resolve) => { resolveList = resolve; });
    },
  });
  const manager = criarGerenciadorBibliotecaPlaylists(service);
  manager.selecionarUsuario('user-1');

  const firstLoad = manager.carregar();
  assert.equal(manager.obterEstado().carregando, true);
  await firstLoad;
  assert.equal(manager.obterEstado().erro, 'Falha de rede');

  const retry = manager.carregar();
  assert.equal(manager.obterEstado().carregando, true);
  resolveList([]);
  await retry;
  assert.deepEqual(manager.obterEstado().playlists, []);
  assert.equal(manager.obterEstado().erro, null);
  assert.equal(manager.obterEstado().carregando, false);
  assert.equal(calls.list, 2);
});

test('validação impede nome vazio e limites de nome e descrição', () => {
  assert.equal(validarFormularioPlaylist('   ', ''), 'Informe o nome da playlist.');
  assert.match(validarFormularioPlaylist('x'.repeat(81), '') ?? '', /80 caracteres/);
  assert.match(validarFormularioPlaylist('Válida', 'x'.repeat(501)) ?? '', /500 caracteres/);
  assert.equal(validarFormularioPlaylist('  Válida  ', 'Descrição'), null);
});

test('criação insere a playlist na lista e impede envio duplicado', async () => {
  let finishCreate;
  const { service, calls } = mockService({
    criarPlaylist: async (data) => {
      calls.create.push(data);
      return new Promise((resolve) => { finishCreate = resolve; });
    },
  });
  const manager = criarGerenciadorBibliotecaPlaylists(service);
  manager.selecionarUsuario('user-1');
  await manager.carregar();
  const firstCreate = manager.criar({ name: playlist.name });
  assert.equal(manager.obterEstado().processando, true);
  assert.equal(await manager.criar({ name: 'Duplicada' }), null);
  assert.equal(calls.create.length, 1);
  finishCreate(playlist);
  assert.deepEqual(await firstCreate, playlist);
  assert.deepEqual(manager.obterEstado().playlists, [playlist]);
  assert.equal(manager.obterEstado().processando, false);
});

test('edição atualiza a lista e envia null para limpar a descrição', async () => {
  const { service, calls } = mockService({
    listarPlaylists: async () => [playlist],
    atualizarPlaylist: async (id, data) => {
      calls.update.push({ id, data });
      return { ...playlist, ...data };
    },
  });
  const manager = criarGerenciadorBibliotecaPlaylists(service);
  manager.selecionarUsuario('user-1');
  await manager.carregar();
  const updated = await manager.atualizar(playlist.id, { name: 'Renomeada', description: null });
  assert.deepEqual(calls.update, [{ id: playlist.id, data: { name: 'Renomeada', description: null } }]);
  assert.equal(updated.description, null);
  assert.equal(manager.obterEstado().playlists[0]?.name, 'Renomeada');
});

test('exclusão só ocorre após confirmação e remove o item da lista', async () => {
  const { service, calls } = mockService({ listarPlaylists: async () => [playlist] });
  const manager = criarGerenciadorBibliotecaPlaylists(service);
  manager.selecionarUsuario('user-1');
  await manager.carregar();
  const operation = () => manager.excluir(playlist.id);

  assert.equal(await executarSeConfirmado(async () => false, operation), false);
  assert.deepEqual(calls.delete, []);
  assert.equal(await executarSeConfirmado(async () => true, operation), true);
  assert.deepEqual(calls.delete, [playlist.id]);
  assert.deepEqual(manager.obterEstado().playlists, []);
});

test('trocar de usuário limpa playlists antigas e ignora resposta pendente da sessão anterior', async () => {
  let responderPrimeiraLista;
  let chamada = 0;
  const service = mockService({
    listarPlaylists: async () => {
      chamada += 1;
      if (chamada === 1) return new Promise((resolve) => { responderPrimeiraLista = resolve; });
      return [];
    },
  }).service;
  const manager = criarGerenciadorBibliotecaPlaylists(service);

  manager.selecionarUsuario('user-1');
  const primeiraCarga = manager.carregar();
  manager.selecionarUsuario('user-2');
  await manager.carregar();
  responderPrimeiraLista([playlist]);
  await primeiraCarga;

  assert.deepEqual(manager.obterEstado().playlists, []);
  assert.equal(manager.obterEstado().carregando, false);
});
