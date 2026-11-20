import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFavoritos } from '@/contexts/FavoritosContext';
import { useTema } from '@/contexts/TemaContext';
import { Faixa } from '@/types/modelos';
import { formatarDuracao } from '@/utils/formatarDuracao';

type Propriedades = {
  faixa: Faixa;
  aoPressionar: () => void;
};

export function LinhaDeFaixa({ faixa, aoPressionar }: Propriedades) {
  const { cores } = useTema();
  const { ehFavorita, alternarFavorito } = useFavoritos();
  const favoritada = ehFavorita(faixa.id);

  return (
    <Pressable onPress={aoPressionar} style={estilos.container}>
      {faixa.capaUrl ? (
        <Image source={{ uri: faixa.capaUrl }} style={estilos.capa} contentFit="cover" />
      ) : (
        <View style={[estilos.capa, estilos.capaVazia, { backgroundColor: cores.superficieElevada }]}>
          <Ionicons name="musical-notes" size={20} color={cores.textoSecundario} />
        </View>
      )}
      <View style={estilos.informacoes}>
        <Text style={[estilos.titulo, { color: cores.texto }]} numberOfLines={1}>
          {faixa.titulo}
        </Text>
        <Text style={[estilos.artista, { color: cores.textoSecundario }]} numberOfLines={1}>
          {faixa.artista}
        </Text>
      </View>
      <Text style={[estilos.duracao, { color: cores.textoSecundario }]}>
        {formatarDuracao(faixa.duracaoEmSegundos)}
      </Text>
      <Pressable onPress={() => alternarFavorito(faixa.id)} hitSlop={10}>
        <Ionicons
          name={favoritada ? 'heart' : 'heart-outline'}
          size={20}
          color={favoritada ? cores.destaque : cores.textoSecundario}
        />
      </Pressable>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  capa: { width: 44, height: 44, borderRadius: 4 },
  capaVazia: { alignItems: 'center', justifyContent: 'center' },
  informacoes: { flex: 1 },
  titulo: { fontSize: 15, fontWeight: '600' },
  artista: { fontSize: 12, marginTop: 2 },
  duracao: { fontSize: 12, marginRight: 4 },
});
