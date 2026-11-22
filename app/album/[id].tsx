import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinhaDeFaixa } from '@/components/LinhaDeFaixa';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { catalogoService } from '@/services/catalogoService';
import { voltarOuIrPara } from '@/utils/navegacao';

export default function TelaDeAlbum() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const { tocarFaixa } = usePlayer();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const album = useRequisicao(() => catalogoService.obterAlbum(id), [id]);
  const faixas = useRequisicao(() => catalogoService.buscarFaixas({ albumId: id }), [id]);

  return (
    <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={[estilos.container, { paddingTop: insets.top + 12 }]}>
      <Text onPress={() => voltarOuIrPara(router, '/(tabs)')} style={[estilos.voltar, { color: cores.destaque }]}>‹ Voltar</Text>
      {album.carregando ? <ActivityIndicator color={cores.destaque} /> : album.erro ? (
        <Text style={[estilos.estado, { color: cores.perigo }]}>{album.erro}</Text>
      ) : album.dado ? (
        <View style={estilos.cabecalho}>
          {album.dado.capaUrl ? <Image source={{ uri: album.dado.capaUrl }} style={estilos.capa} contentFit="cover" /> : (
            <View style={[estilos.capa, estilos.capaVazia, { backgroundColor: cores.superficieElevada }]}>
              <Ionicons name="disc" size={44} color={cores.textoSecundario} />
            </View>
          )}
          <Text style={[estilos.titulo, { color: cores.texto }]}>{album.dado.titulo}</Text>
          <Text style={[estilos.subtitulo, { color: cores.textoSecundario }]}>
            {album.dado.artista}{album.dado.releasedate ? ` · ${album.dado.releasedate}` : ''}
          </Text>
        </View>
      ) : null}

      <Text style={[estilos.secao, { color: cores.texto }]}>Faixas</Text>
      {faixas.carregando ? <ActivityIndicator color={cores.destaque} /> : faixas.erro ? (
        <Text style={[estilos.estado, { color: cores.perigo }]}>{faixas.erro}</Text>
      ) : faixas.dado?.data.length ? faixas.dado.data.map((faixa) => (
        <LinhaDeFaixa key={faixa.id} faixa={faixa} aoPressionar={() => tocarFaixa(faixa, faixas.dado?.data ?? [faixa])} />
      )) : <Text style={[estilos.estado, { color: cores.textoSecundario }]}>Nenhuma faixa encontrada neste álbum.</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 140 },
  voltar: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  cabecalho: { alignItems: 'center', marginBottom: 26 },
  capa: { width: 210, height: 210, borderRadius: 10, marginBottom: 16 },
  capaVazia: { alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitulo: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  secao: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  estado: { fontSize: 13, textAlign: 'center', marginVertical: 18 },
});
