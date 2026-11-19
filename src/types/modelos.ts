import { Genero } from '@/constants/generos';

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string;
};

export type Faixa = {
  id: string;
  titulo: string;
  artista: string;
  duracaoEmSegundos: number;
  capaUrl: string;
  genero: Genero;
};

export type Reproducao = {
  faixa: Faixa;
  tocadaEm: string;
};

export type Album = {
  id: string;
  titulo: string;
  artista: string;
  capaUrl: string;
  faixas: Faixa[];
};

export type Playlist = {
  id: string;
  titulo: string;
  descricao: string;
  capaUrl: string;
  faixas: Faixa[];
};

export type Artista = {
  id: string;
  nome: string;
  fotoUrl: string;
};

export type ColecaoDeFaixas = {
  id: string;
  titulo: string;
  legenda: string;
  capaUrl: string;
  faixas: Faixa[];
};
