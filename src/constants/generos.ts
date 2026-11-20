export const generos = ['MPB', 'Eletrônica', 'Rock', 'Lo-fi', 'Indie', 'Pop'] as const;

export type Genero = (typeof generos)[number];

const personalidades: Record<Genero, { nome: string; descricao: string }> = {
  MPB: { nome: 'Poeta de Varanda', descricao: 'Você ouve a letra, a melodia e a saudade.' },
  Eletrônica: { nome: 'Pulso Acelerado', descricao: 'Batida constante e cabeça a mil.' },
  Rock: { nome: 'Alma de Garagem', descricao: 'Volume no máximo, sem pedir licença.' },
  'Lo-fi': { nome: 'Mente Serena', descricao: 'Sua trilha é feita de foco e calmaria.' },
  Indie: { nome: 'Garimpeiro', descricao: 'Você descobre os artistas antes de todo mundo.' },
  Pop: { nome: 'Coração de Refrão', descricao: 'Se gruda na cabeça, está na sua lista.' },
};

function ehGenero(valor: string | null | undefined): valor is Genero {
  return generos.some((genero) => genero === valor);
}

export function personalidadeDe(genero: string | null | undefined) {
  return ehGenero(genero) ? personalidades[genero] : null;
}
