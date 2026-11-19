import { Ionicons } from '@expo/vector-icons';

import { Genero } from './generos';

export type Humor = {
  id: string;
  nome: string;
  icone: keyof typeof Ionicons.glyphMap;
  cores: [string, string];
  generos: Genero[];
};

export const humores: Humor[] = [
  { id: 'foco', nome: 'Foco', icone: 'bulb', cores: ['#2563EB', '#0B1120'], generos: ['Lo-fi', 'Indie'] },
  { id: 'treino', nome: 'Treino', icone: 'barbell', cores: ['#DC2626', '#1C0505'], generos: ['Rock', 'Eletrônica'] },
  { id: 'chuva', nome: 'Chuva', icone: 'rainy', cores: ['#64748B', '#0F172A'], generos: ['Lo-fi', 'MPB'] },
  { id: 'festa', nome: 'Festa', icone: 'sparkles', cores: ['#C026D3', '#2E0538'], generos: ['Pop', 'Eletrônica'] },
  { id: 'madrugada', nome: '3 da manhã', icone: 'moon', cores: ['#4338CA', '#020617'], generos: ['MPB', 'Indie'] },
];

export const corSobreHumor = '#FFFFFF';
