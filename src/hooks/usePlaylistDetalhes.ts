import { useEffect, useMemo, useState } from 'react';

import { catalogoService } from '@/services/catalogoService';
import type { ResultadoFaixasPorIds } from '@/services/catalogoService';
import { ApiClientError } from '@/services/api';
import { playlistService } from '@/services/playlistService';
import type { Faixa, PlaylistPersistida, PlaylistTrack } from '@/types/modelos';

type CatalogService = Pick<typeof catalogoService, 'buscarFaixasPorIds'>;
type PlaylistService = Pick<typeof playlistService, 'buscarPlaylist' | 'listarFaixas' | 'adicionarFaixa' | 'removerFaixa'>;

export type FaixaPlaylistResolvida = {
  referencia: PlaylistTrack;
  faixa: Faixa | null;
};

export type DetalhesPlaylist = {
  playlist: PlaylistPersistida;
  faixas: FaixaPlaylistResolvida[];
};

export type EstadoDetalhesPlaylist = {
  playlist: PlaylistPersistida | null;
  faixas: FaixaPlaylistResolvida[];
  carregando: boolean;
  processando: boolean;
  erro: string | null;
};

export async function carregarDetalhesPlaylist(
  playlistId: string,
  services: { playlists?: PlaylistService; catalogo?: CatalogService } = {},
): Promise<DetalhesPlaylist> {
  const playlists = services.playlists ?? playlistService;
  const catalogo = services.catalogo ?? catalogoService;
  const [playlist, referencias] = await Promise.all([
    playlists.buscarPlaylist(playlistId),
    playlists.listarFaixas(playlistId),
  ]);
  const ordenadas = [...referencias].sort((a, b) => a.position - b.position);
  const uniqueIds = [...new Set(ordenadas.map((item) => item.jamendoTrackId))];
  const batches: ResultadoFaixasPorIds[] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 50) {
    batches.push(await catalogo.buscarFaixasPorIds(uniqueIds.slice(offset, offset + 50)));
  }

  const metadadosPorId = new Map(batches.flatMap((batch) => batch.data.map((faixa) => [faixa.id, faixa] as const)));
  const ausentes = new Set(batches.flatMap((batch) => batch.missingIds));
  return {
    playlist,
    faixas: ordenadas.map((referencia) => ({
      referencia,
      faixa: ausentes.has(referencia.jamendoTrackId)
        ? null
        : metadadosPorId.get(referencia.jamendoTrackId) ?? null,
    })),
  };
}

export function calcularProximaPosicao(referencias: PlaylistTrack[]): number {
  if (referencias.length === 0) return 0;
  const ultimaPosicao = Math.max(...referencias.map((referencia) => referencia.position));
  if (ultimaPosicao >= 2_147_483_647) throw new RangeError('A playlist atingiu a posição máxima de faixas.');
  return ultimaPosicao + 1;
}

export function criarGerenciadorDetalhesPlaylist(
  playlistId: string,
  services: { playlists?: PlaylistService; catalogo?: CatalogService } = {},
) {
  const playlists = services.playlists ?? playlistService;
  const catalogo = services.catalogo ?? catalogoService;
  let estado: EstadoDetalhesPlaylist = {
    playlist: null,
    faixas: [],
    carregando: true,
    processando: false,
    erro: null,
  };
  let carregamento: Promise<void> | null = null;
  const listeners = new Set<(estado: EstadoDetalhesPlaylist) => void>();

  function publicar(next: EstadoDetalhesPlaylist) {
    estado = next;
    for (const listener of listeners) listener(estado);
  }

  function carregar(): Promise<void> {
    if (carregamento) return carregamento;
    if (!playlistId) {
      publicar({
        ...estado,
        playlist: null,
        faixas: [],
        carregando: false,
        erro: 'Não encontramos essa playlist.',
      });
      return Promise.resolve();
    }
    publicar({ ...estado, carregando: true, erro: null });
    carregamento = carregarDetalhesPlaylist(playlistId, { playlists, catalogo })
      .then(({ playlist, faixas }) => publicar({ ...estado, playlist, faixas, erro: null }))
      .catch((error: unknown) => publicar({
        ...estado,
        erro: error instanceof Error ? error.message : 'Não foi possível carregar a playlist.',
      }))
      .finally(() => {
        carregamento = null;
        publicar({ ...estado, carregando: false });
      });
    return carregamento;
  }

  return {
    obterEstado: () => estado,
    observar(listener: (estado: EstadoDetalhesPlaylist) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    carregar,
    async adicionar(jamendoTrackId: string): Promise<boolean> {
      if (estado.processando || estado.carregando || estado.faixas.some((item) => item.referencia.jamendoTrackId === jamendoTrackId)) return false;
      const position = calcularProximaPosicao(estado.faixas.map((item) => item.referencia));
      publicar({ ...estado, processando: true, erro: null });
      try {
        await playlists.adicionarFaixa(playlistId, { jamendoTrackId, position });
        await carregar();
        return true;
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 409) await carregar();
        throw error;
      } finally {
        publicar({ ...estado, processando: false });
      }
    },
    async remover(jamendoTrackId: string): Promise<boolean> {
      if (estado.processando || estado.carregando) return false;
      publicar({ ...estado, processando: true, erro: null });
      try {
        await playlists.removerFaixa(playlistId, jamendoTrackId);
        await carregar();
        return true;
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) await carregar();
        throw error;
      } finally {
        publicar({ ...estado, processando: false });
      }
    },
  };
}

export function usePlaylistDetalhes(playlistId: string) {
  const manager = useMemo(() => criarGerenciadorDetalhesPlaylist(playlistId), [playlistId]);
  const [estado, setEstado] = useState(manager.obterEstado());

  useEffect(() => {
    const unsubscribe = manager.observar(setEstado);
    void manager.carregar();
    return unsubscribe;
  }, [manager]);

  return {
    estado,
    carregar: manager.carregar,
    adicionar: manager.adicionar,
    remover: manager.remover,
  };
}
