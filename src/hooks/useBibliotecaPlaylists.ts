import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { ApiClientError } from '@/services/api';
import { playlistService } from '@/services/playlistService';
import type { AtualizarPlaylistInput, CriarPlaylistInput, PlaylistPersistida } from '@/types/modelos';

type PlaylistService = Pick<
  typeof playlistService,
  'listarPlaylists' | 'criarPlaylist' | 'atualizarPlaylist' | 'excluirPlaylist'
>;

export type EstadoBibliotecaPlaylists = {
  playlists: PlaylistPersistida[];
  carregando: boolean;
  processando: boolean;
  erro: string | null;
};

export function validarFormularioPlaylist(name: string, description: string): string | null {
  const nome = name.trim();
  if (!nome) return 'Informe o nome da playlist.';
  if ([...nome].length > 80) return 'O nome deve ter até 80 caracteres.';
  if ([...description].length > 500) return 'A descrição deve ter até 500 caracteres.';
  return null;
}

export async function executarSeConfirmado(
  confirmar: () => Promise<boolean>,
  operacao: () => Promise<boolean>,
): Promise<boolean> {
  if (!await confirmar()) return false;
  return operacao();
}

export function criarGerenciadorBibliotecaPlaylists(service: PlaylistService = playlistService) {
  let estado: EstadoBibliotecaPlaylists = {
    playlists: [],
    carregando: true,
    processando: false,
    erro: null,
  };
  let promiseDeCarga: Promise<void> | null = null;
  let usuarioAtual: string | null = null;
  let versaoSessao = 0;
  const ouvintes = new Set<(estado: EstadoBibliotecaPlaylists) => void>();

  function publicar(novoEstado: EstadoBibliotecaPlaylists) {
    estado = novoEstado;
    for (const ouvinte of ouvintes) ouvinte(estado);
  }

  function carregar(): Promise<void> {
    if (promiseDeCarga) return promiseDeCarga;
    const versaoAtual = versaoSessao;
    publicar({ ...estado, carregando: true, erro: null });
    promiseDeCarga = service.listarPlaylists()
      .then((playlists) => {
        if (versaoAtual === versaoSessao) publicar({ ...estado, playlists, erro: null });
      })
      .catch((error: unknown) => {
        if (versaoAtual === versaoSessao) publicar({
          ...estado,
          erro: error instanceof Error ? error.message : 'Não foi possível carregar suas playlists.',
        });
      })
      .finally(() => {
        if (versaoAtual === versaoSessao) {
          promiseDeCarga = null;
          publicar({ ...estado, carregando: false });
        }
      });
    return promiseDeCarga;
  }

  return {
    obterEstado: () => estado,
    observar(ouvinte: (estado: EstadoBibliotecaPlaylists) => void) {
      ouvintes.add(ouvinte);
      return () => { ouvintes.delete(ouvinte); };
    },
    carregar,
    selecionarUsuario(userId: string | null) {
      if (usuarioAtual === userId) return;
      usuarioAtual = userId;
      versaoSessao += 1;
      promiseDeCarga = null;
      publicar({ playlists: [], carregando: Boolean(userId), processando: false, erro: null });
    },
    async criar(dados: CriarPlaylistInput): Promise<PlaylistPersistida | null> {
      if (!usuarioAtual || estado.processando || estado.carregando) return null;
      const versaoAtual = versaoSessao;
      publicar({ ...estado, processando: true });
      try {
        const criada = await service.criarPlaylist(dados);
        if (versaoAtual === versaoSessao) {
          publicar({ ...estado, playlists: [criada, ...estado.playlists.filter((item) => item.id !== criada.id)] });
        }
        return criada;
      } finally {
        if (versaoAtual === versaoSessao) publicar({ ...estado, processando: false });
      }
    },
    async atualizar(id: string, dados: AtualizarPlaylistInput): Promise<PlaylistPersistida | null> {
      if (!usuarioAtual || estado.processando || estado.carregando) return null;
      const versaoAtual = versaoSessao;
      publicar({ ...estado, processando: true });
      try {
        const atualizada = await service.atualizarPlaylist(id, dados);
        if (versaoAtual === versaoSessao) {
          publicar({ ...estado, playlists: estado.playlists.map((item) => item.id === id ? atualizada : item) });
        }
        return atualizada;
      } catch (error) {
        if (versaoAtual === versaoSessao && error instanceof ApiClientError && error.status === 404) await carregar();
        throw error;
      } finally {
        if (versaoAtual === versaoSessao) publicar({ ...estado, processando: false });
      }
    },
    async excluir(id: string): Promise<boolean> {
      if (!usuarioAtual || estado.processando || estado.carregando) return false;
      const versaoAtual = versaoSessao;
      publicar({ ...estado, processando: true });
      try {
        await service.excluirPlaylist(id);
        if (versaoAtual === versaoSessao) {
          publicar({ ...estado, playlists: estado.playlists.filter((item) => item.id !== id) });
        }
        return true;
      } catch (error) {
        if (versaoAtual === versaoSessao && error instanceof ApiClientError && error.status === 404) await carregar();
        throw error;
      } finally {
        if (versaoAtual === versaoSessao) publicar({ ...estado, processando: false });
      }
    },
  };
}

const gerenciador = criarGerenciadorBibliotecaPlaylists();

export function useBibliotecaPlaylists() {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id ?? null;
  const [usuarioIdDoEstado, setUsuarioIdDoEstado] = useState(usuarioId);
  const [estado, setEstado] = useState(gerenciador.obterEstado());

  useEffect(() => {
    const pararDeObservar = gerenciador.observar(setEstado);
    gerenciador.selecionarUsuario(usuarioId);
    setUsuarioIdDoEstado(usuarioId);
    if (usuario) void gerenciador.carregar();
    return pararDeObservar;
  }, [usuarioId]);

  const estadoAtual = usuarioIdDoEstado === usuarioId
    ? estado
    : { playlists: [], carregando: Boolean(usuarioId), processando: false, erro: null };

  return {
    estado: estadoAtual,
    carregar: gerenciador.carregar,
    criar: gerenciador.criar,
    atualizar: gerenciador.atualizar,
    excluir: gerenciador.excluir,
  };
}
