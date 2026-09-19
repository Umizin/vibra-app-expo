import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';

const ALTURA_DA_BARRA_DE_ABAS = 56;

export function MiniPlayer() {
  const { faixaAtual, estaTocando, alternarReproducao } = usePlayer();
  const { cores } = useTema();
  const router = useRouter();

  if (!faixaAtual) return null;

  return (
    <Pressable
      onPress={() => router.push('/player')}
      style={[estilos.container, { backgroundColor: cores.superficieElevada, bottom: ALTURA_DA_BARRA_DE_ABAS }]}
    >
      <Image source={{ uri: faixaAtual.capaUrl }} style={estilos.capa} contentFit="cover" />
      <View style={estilos.informacoes}>
        <Text style={[estilos.titulo, { color: cores.texto }]} numberOfLines={1}>
          {faixaAtual.titulo}
        </Text>
        <Text style={[estilos.artista, { color: cores.textoSecundario }]} numberOfLines={1}>
          {faixaAtual.artista}
        </Text>
      </View>
      <Pressable onPress={alternarReproducao} hitSlop={12}>
        <Ionicons name={estaTocando ? 'pause' : 'play'} size={26} color={cores.texto} />
      </Pressable>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 56,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  capa: { width: 40, height: 40, borderRadius: 4 },
  informacoes: { flex: 1 },
  titulo: { fontSize: 14, fontWeight: '600' },
  artista: { fontSize: 12 },
});
