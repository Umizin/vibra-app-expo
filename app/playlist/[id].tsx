import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinhaDeFaixa } from '@/components/LinhaDeFaixa';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { catalogoService } from '@/services/catalogoService';

export default function TelaDeDetalheDaColecao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tocarFaixa } = usePlayer();

  const colecao = useRequisicao(() => catalogoService.buscarColecaoPorId(id), [id]);

  if (colecao.carregando) {
    return (
      <View style={[estilos.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator color={cores.destaque} size="large" />
      </View>
    );
  }

  if (!colecao.dado) {
    return (
      <View style={[estilos.centro, { backgroundColor: cores.fundo }]}>
        <Text style={{ color: cores.texto }}>Não encontramos essa coleção.</Text>
      </View>
    );
  }

  const { titulo, legenda, capaUrl, faixas } = colecao.dado;

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <FlatList
        data={faixas}
        keyExtractor={(faixa) => faixa.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        ListHeaderComponent={
          <LinearGradient colors={[cores.destaque, cores.fundo]} style={estilos.cabecalho}>
            <Pressable
              onPress={() => router.back()}
              style={[estilos.voltar, { top: insets.top + 8 }]}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </Pressable>
            <Image source={{ uri: capaUrl }} style={estilos.capa} contentFit="cover" />
            <Text style={estilos.titulo} numberOfLines={2}>
              {titulo}
            </Text>
            <Text style={estilos.legenda}>{legenda}</Text>
          </LinearGradient>
        }
        renderItem={({ item }) => <LinhaDeFaixa faixa={item} aoPressionar={() => tocarFaixa(item, faixas)} />}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cabecalho: { alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
  voltar: { position: 'absolute', left: 16, zIndex: 1 },
  capa: { width: 180, height: 180, borderRadius: 8, marginBottom: 16 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 24 },
  legenda: { fontSize: 13, color: '#FFFFFF', opacity: 0.8, marginTop: 6 },
});
