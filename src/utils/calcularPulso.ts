import { Genero } from '@/constants/generos';
import { Reproducao } from '@/types/modelos';

export type Periodo = 'madrugada' | 'manhã' | 'tarde' | 'noite';

export type Pulso = {
  minutos: number;
  reproducoes: number;
  topArtista: string | null;
  topFaixa: string | null;
  periodo: Periodo | null;
  topGenero: Genero | null;
};

function maisFrequente<T>(itens: T[]): T | null {
  const contagem = new Map<T, number>();
  for (const item of itens) contagem.set(item, (contagem.get(item) ?? 0) + 1);

  let vencedor: T | null = null;
  let maior = 0;
  for (const [item, total] of contagem) {
    if (total > maior) {
      vencedor = item;
      maior = total;
    }
  }
  return vencedor;
}

function periodoDaHora(hora: number): Periodo {
  if (hora < 6) return 'madrugada';
  if (hora < 12) return 'manhã';
  if (hora < 18) return 'tarde';
  return 'noite';
}

export function calcularPulso(historico: Reproducao[]): Pulso {
  const segundos = historico.reduce((total, { faixa }) => total + faixa.duracaoEmSegundos, 0);

  return {
    minutos: Math.round(segundos / 60),
    reproducoes: historico.length,
    topArtista: maisFrequente(historico.map(({ faixa }) => faixa.artista)),
    topFaixa: maisFrequente(historico.map(({ faixa }) => faixa.titulo)),
    periodo: maisFrequente(historico.map(({ tocadaEm }) => periodoDaHora(new Date(tocadaEm).getHours()))),
    topGenero: maisFrequente(historico.map(({ faixa }) => faixa.genero)),
  };
}
