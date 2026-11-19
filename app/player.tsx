import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFavoritos } from '@/contexts/FavoritosContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { useTimer } from '@/contexts/TimerContext';
import { formatarDuracao } from '@/utils/formatarDuracao';

export default function TelaDoPlayer() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const player = usePlayer();
  const { ehFavorita, alternarFavorito } = useFavoritos();
  const { fimEm } = useTimer();

  useEffect(() => {
    if (!player.faixaAtual) {
      router.back();
    }
  }, [player.faixaAtual, router]);

  if (!player.faixaAtual) return null;

  const { faixaAtual, estaTocando, progressoEmSegundos, alternarReproducao, irParaProxima, irParaAnterior } =
    player;
  const favoritada = ehFavorita(faixaAtual.id);
  const progressoPercentual = Math.min(100, (progressoEmSegundos / faixaAtual.duracaoEmSegundos) * 100);

  return (
    <LinearGradient colors={[cores.superficieElevada, cores.fundo]} style={{ flex: 1, paddingTop: insets.top }}>
      <Pressable onPress={() => router.back()} style={estilos.fechar} hitSlop={12}>
        <Ionicons name="chevron-down" size={28} color={cores.texto} />
      </Pressable>

      <View style={estilos.conteudo}>
        <Image source={{ uri: faixaAtual.capaUrl }} style={estilos.capa} contentFit="cover" />

        <View style={estilos.linhaTitulo}>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.titulo, { color: cores.texto }]} numberOfLines={1}>
              {faixaAtual.titulo}
            </Text>
            <Text style={[estilos.artista, { color: cores.textoSecundario }]} numberOfLines={1}>
              {faixaAtual.artista}
            </Text>
          </View>
          <Pressable onPress={() => alternarFavorito(faixaAtual.id)} hitSlop={12}>
            <Ionicons
              name={favoritada ? 'heart' : 'heart-outline'}
              size={26}
              color={favoritada ? cores.destaque : cores.textoSecundario}
            />
          </Pressable>
        </View>

        <View style={[estilos.trilhaDeProgresso, { backgroundColor: cores.borda }]}>
          <View style={[estilos.progresso, { width: `${progressoPercentual}%`, backgroundColor: cores.destaque }]} />
        </View>
        <View style={estilos.linhaDeTempo}>
          <Text style={[estilos.tempo, { color: cores.textoSecundario }]}>
            {formatarDuracao(progressoEmSegundos)}
          </Text>
          <Text style={[estilos.tempo, { color: cores.textoSecundario }]}>
            {formatarDuracao(faixaAtual.duracaoEmSegundos)}
          </Text>
        </View>

        <View style={estilos.controles}>
          <Pressable onPress={irParaAnterior} hitSlop={12}>
            <Ionicons name="play-skip-back" size={32} color={cores.texto} />
          </Pressable>
          <Pressable onPress={alternarReproducao} style={[estilos.botaoPlay, { backgroundColor: cores.destaque }]}>
            <Ionicons name={estaTocando ? 'pause' : 'play'} size={30} color="#121212" />
          </Pressable>
          <Pressable onPress={irParaProxima} hitSlop={12}>
            <Ionicons name="play-skip-forward" size={32} color={cores.texto} />
          </Pressable>
        </View>

        <View style={estilos.extras}>
          <Pressable onPress={() => router.push('/timer')} hitSlop={12}>
            <Ionicons name="moon" size={22} color={fimEm ? cores.destaque : cores.textoSecundario} />
          </Pressable>
          <Pressable onPress={() => router.push('/fila')} hitSlop={12}>
            <Ionicons name="list" size={24} color={cores.textoSecundario} />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fechar: { paddingHorizontal: 20, paddingTop: 8 },
  conteudo: { flex: 1, paddingHorizontal: 28, paddingTop: 24, alignItems: 'center' },
  capa: { width: '100%', aspectRatio: 1, borderRadius: 12, marginBottom: 32 },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 },
  titulo: { fontSize: 20, fontWeight: '800' },
  artista: { fontSize: 14, marginTop: 4 },
  trilhaDeProgresso: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progresso: { height: 4 },
  linhaDeTempo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  tempo: { fontSize: 11 },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 40 },
  extras: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 40 },
  botaoPlay: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
});
