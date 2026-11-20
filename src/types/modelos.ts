export type Usuario = {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string;
};

export type Faixa = {
  id: string;
  titulo: string;
  artista: string;
  artistaId?: string;
  albumId?: string;
  album?: string;
  duracaoEmSegundos: number;
  capaUrl?: string;
  genero?: string;
  tags?: string[];
  audioUrl?: string;
  license?: string;
  jamendoUrl?: string;
};

export type Reproducao = {
  faixa: Faixa;
  tocadaEm: string;
};

export type Album = {
  id: string;
  titulo: string;
  artista: string;
  artistaId?: string;
  capaUrl?: string;
  releasedate?: string;
  shareUrl?: string;
  faixas?: Faixa[];
};

export type Playlist = {
  id: string;
  titulo: string;
  descricao: string;
  capaUrl: string;
  faixas: Faixa[];
};

/** Playlist persistida retornada pela API Vibra. Datas chegam como strings JSON. */
export type PlaylistPersistida = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  trackCount: number;
};

/** Referência de faixa persistida na playlist; metadados vêm do catálogo. */
export type PlaylistTrack = {
  jamendoTrackId: string;
  position: number;
  addedAt: string;
};

export type CriarPlaylistInput = {
  name: string;
  description?: string;
};

export type AtualizarPlaylistInput = {
  name?: string;
  description?: string | null;
};

export type AdicionarFaixaPlaylistInput = {
  jamendoTrackId: string;
  position: number;
};

export type Artista = {
  id: string;
  nome: string;
  fotoUrl?: string;
  website?: string;
  shareUrl?: string;
};

export type ColecaoDeFaixas = {
  id: string;
  titulo: string;
  legenda: string;
  capaUrl?: string;
  faixas: Faixa[];
};
