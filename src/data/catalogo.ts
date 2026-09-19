import { Album, Artista, Faixa, Playlist } from '@/types/modelos';

const capa = (semente: string) => `https://picsum.photos/seed/${semente}/400/400`;

const faixa = (
  id: string,
  titulo: string,
  artista: string,
  duracaoEmSegundos: number,
  capaSemente: string
): Faixa => ({
  id,
  titulo,
  artista,
  duracaoEmSegundos,
  capaUrl: capa(capaSemente),
});

export const artistas: Artista[] = [
  { id: 'art-1', nome: 'Luiza Menezes', fotoUrl: capa('luiza-menezes') },
  { id: 'art-2', nome: 'Coletivo Norte', fotoUrl: capa('coletivo-norte') },
  { id: 'art-3', nome: 'Rafa Duarte', fotoUrl: capa('rafa-duarte') },
  { id: 'art-4', nome: 'Bruma', fotoUrl: capa('bruma-banda') },
  { id: 'art-5', nome: 'Pedro Quintas', fotoUrl: capa('pedro-quintas') },
  { id: 'art-6', nome: 'Nina Alves', fotoUrl: capa('nina-alves') },
];

const faixas: Faixa[] = [
  faixa('fx-1', 'Madrugada', 'Luiza Menezes', 187, 'madrugada'),
  faixa('fx-2', 'Sinais', 'Coletivo Norte', 212, 'sinais'),
  faixa('fx-3', 'Rota 12', 'Rafa Duarte', 165, 'rota-12'),
  faixa('fx-4', 'Vento Sul', 'Bruma', 198, 'vento-sul'),
  faixa('fx-5', 'Contraluz', 'Pedro Quintas', 231, 'contraluz'),
  faixa('fx-6', 'Deriva', 'Nina Alves', 174, 'deriva'),
  faixa('fx-7', 'Cidade Alta', 'Luiza Menezes', 203, 'cidade-alta'),
  faixa('fx-8', 'Ressaca', 'Coletivo Norte', 189, 'ressaca'),
  faixa('fx-9', 'Fogo Baixo', 'Rafa Duarte', 221, 'fogo-baixo'),
  faixa('fx-10', 'Constelação', 'Bruma', 176, 'constelacao'),
  faixa('fx-11', 'Concreto', 'Pedro Quintas', 194, 'concreto'),
  faixa('fx-12', 'Onda Curta', 'Nina Alves', 208, 'onda-curta'),
  faixa('fx-13', 'Setembro', 'Luiza Menezes', 182, 'setembro'),
  faixa('fx-14', 'Circuito', 'Coletivo Norte', 199, 'circuito'),
  faixa('fx-15', 'Litoral', 'Rafa Duarte', 217, 'litoral'),
  faixa('fx-16', 'Espelho', 'Bruma', 163, 'espelho'),
  faixa('fx-17', 'Refúgio', 'Pedro Quintas', 236, 'refugio'),
  faixa('fx-18', 'Traçado', 'Nina Alves', 191, 'tracado'),
];

function buscarFaixasPorId(ids: string[]): Faixa[] {
  return ids
    .map((id) => faixas.find((item) => item.id === id))
    .filter((item): item is Faixa => item !== undefined);
}

export const playlists: Playlist[] = [
  {
    id: 'pl-1',
    titulo: 'Hits do Momento',
    descricao: 'As faixas mais tocadas desta semana.',
    capaUrl: capa('hits-do-momento'),
    faixas: buscarFaixasPorId(['fx-1', 'fx-2', 'fx-3', 'fx-4', 'fx-5']),
  },
  {
    id: 'pl-2',
    titulo: 'Foco Total',
    descricao: 'Sem letra, sem distração.',
    capaUrl: capa('foco-total'),
    faixas: buscarFaixasPorId(['fx-6', 'fx-7', 'fx-8', 'fx-9']),
  },
  {
    id: 'pl-3',
    titulo: 'Treino Pesado',
    descricao: 'Energia do aquecimento ao último repeat.',
    capaUrl: capa('treino-pesado'),
    faixas: buscarFaixasPorId(['fx-9', 'fx-10', 'fx-11', 'fx-12', 'fx-1']),
  },
  {
    id: 'pl-4',
    titulo: 'Modo Chill',
    descricao: 'Pra desacelerar o dia.',
    capaUrl: capa('modo-chill'),
    faixas: buscarFaixasPorId(['fx-13', 'fx-14', 'fx-15', 'fx-16']),
  },
  {
    id: 'pl-5',
    titulo: 'Clássicos da Casa',
    descricao: 'O repertório que nunca sai de moda.',
    capaUrl: capa('classicos-da-casa'),
    faixas: buscarFaixasPorId(['fx-17', 'fx-18', 'fx-2', 'fx-5']),
  },
  {
    id: 'pl-6',
    titulo: 'Descobertas da Semana',
    descricao: 'Novidades separadas pra você.',
    capaUrl: capa('descobertas-da-semana'),
    faixas: buscarFaixasPorId(['fx-3', 'fx-6', 'fx-10', 'fx-14', 'fx-17']),
  },
];

export const albuns: Album[] = [
  {
    id: 'al-1',
    titulo: 'Panorama',
    artista: 'Luiza Menezes',
    capaUrl: capa('panorama'),
    faixas: buscarFaixasPorId(['fx-1', 'fx-7', 'fx-13']),
  },
  {
    id: 'al-2',
    titulo: 'Interferência',
    artista: 'Coletivo Norte',
    capaUrl: capa('interferencia'),
    faixas: buscarFaixasPorId(['fx-2', 'fx-8', 'fx-14']),
  },
  {
    id: 'al-3',
    titulo: 'Estrada Aberta',
    artista: 'Rafa Duarte',
    capaUrl: capa('estrada-aberta'),
    faixas: buscarFaixasPorId(['fx-3', 'fx-9', 'fx-15']),
  },
  {
    id: 'al-4',
    titulo: 'Névoa',
    artista: 'Bruma',
    capaUrl: capa('nevoa'),
    faixas: buscarFaixasPorId(['fx-4', 'fx-10', 'fx-16']),
  },
];

export const todasAsFaixas = faixas;
