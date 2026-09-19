import { albuns, artistas, playlists, todasAsFaixas } from '@/data/catalogo';
import { Artista, ColecaoDeFaixas, Faixa } from '@/types/modelos';
import { simularRequisicao } from './api';

function buscarColecaoPorId(id: string): Promise<ColecaoDeFaixas | null> {
  const playlist = playlists.find((item) => item.id === id);
  if (playlist) {
    return simularRequisicao({
      id: playlist.id,
      titulo: playlist.titulo,
      legenda: playlist.descricao,
      capaUrl: playlist.capaUrl,
      faixas: playlist.faixas,
    });
  }

  const album = albuns.find((item) => item.id === id);
  if (album) {
    return simularRequisicao({
      id: album.id,
      titulo: album.titulo,
      legenda: `Álbum · ${album.artista}`,
      capaUrl: album.capaUrl,
      faixas: album.faixas,
    });
  }

  return simularRequisicao(null);
}

function buscarPorTermo(termo: string): Promise<Faixa[]> {
  const termoNormalizado = termo.trim().toLowerCase();
  if (!termoNormalizado) return simularRequisicao([], 0);

  const resultado = todasAsFaixas.filter(
    (faixa) =>
      faixa.titulo.toLowerCase().includes(termoNormalizado) ||
      faixa.artista.toLowerCase().includes(termoNormalizado)
  );

  return simularRequisicao(resultado, 250);
}

export const catalogoService = {
  listarPlaylists: () => simularRequisicao(playlists),
  listarAlbuns: () => simularRequisicao(albuns),
  listarArtistas: (): Promise<Artista[]> => simularRequisicao(artistas),
  buscarColecaoPorId,
  buscarPorTermo,
};
