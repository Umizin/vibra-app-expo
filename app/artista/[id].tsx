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

export default function TelaDeArtista() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const { tocarFaixa } = usePlayer();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const artista = useRequisicao(() => catalogoService.obterArtista(id), [id]);
  const faixas = useRequisicao(() => catalogoService.buscarFaixas({ artistId: id }), [id]);

  return (
    <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={[estilos.container, { paddingTop: insets.top + 12 }]}>
      <Text onPress={() => voltarOuIrPara(router, '/(tabs)/buscar')} style={[estilos.voltar, { color: cores.destaque }]}>‹ Voltar</Text>
      {artista.carregando ? <ActivityIndicator color={cores.destaque} /> : artista.erro ? (
        <Text style={[estilos.estado, { color: cores.perigo }]}>{artista.erro}</Text>
      ) : artista.dado ? (
        <View style={estilos.cabecalho}>
          {artista.dado.fotoUrl ? <Image source={{ uri: artista.dado.fotoUrl }} style={estilos.foto} contentFit="cover" /> : (
            <View style={[estilos.foto, estilos.fotoVazia, { backgroundColor: cores.superficieElevada }]}>
              <Ionicons name="person" size={44} color={cores.textoSecundario} />
            </View>
          )}
          <Text style={[estilos.titulo, { color: cores.texto }]}>{artista.dado.nome}</Text>
        </View>
      ) : null}

      <Text style={[estilos.secao, { color: cores.texto }]}>Faixas</Text>
      {faixas.carregando ? <ActivityIndicator color={cores.destaque} /> : faixas.erro ? (
        <Text style={[estilos.estado, { color: cores.perigo }]}>{faixas.erro}</Text>
      ) : faixas.dado?.data.length ? faixas.dado.data.map((faixa) => (
        <LinhaDeFaixa key={faixa.id} faixa={faixa} aoPressionar={() => tocarFaixa(faixa, faixas.dado?.data ?? [faixa])} />
      )) : <Text style={[estilos.estado, { color: cores.textoSecundario }]}>Nenhuma faixa encontrada para este artista.</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 140 },
  voltar: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  cabecalho: { alignItems: 'center', marginBottom: 26 },
  foto: { width: 180, height: 180, borderRadius: 90, marginBottom: 16 },
  fotoVazia: { alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  secao: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  estado: { fontSize: 13, textAlign: 'center', marginVertical: 18 },
});
