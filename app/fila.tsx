import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinhaDeFaixa } from '@/components/LinhaDeFaixa';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';

export default function TelaDaFila() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { faixaAtual, filaDeFaixas, tocarFaixa, removerDaFila } = usePlayer();

  const indiceAtual = filaDeFaixas.findIndex((faixa) => faixa.id === faixaAtual?.id);
  const proximas = filaDeFaixas.slice(indiceAtual + 1);

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <View style={estilos.cabecalho}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={cores.texto} />
        </Pressable>
        <Text style={[estilos.titulo, { color: cores.texto }]}>Fila</Text>
      </View>

      <FlatList
        data={proximas}
        keyExtractor={(faixa) => faixa.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          faixaAtual && (
            <View style={estilos.secao}>
              <Text style={[estilos.rotulo, { color: cores.destaque }]}>Tocando agora</Text>
              <LinhaDeFaixa faixa={faixaAtual} aoPressionar={() => router.back()} />
              <Text style={[estilos.rotulo, { color: cores.textoSecundario, marginTop: 24 }]}>A seguir</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={estilos.linha}>
            <View style={{ flex: 1 }}>
              <LinhaDeFaixa faixa={item} aoPressionar={() => tocarFaixa(item, filaDeFaixas)} />
            </View>
            <Pressable onPress={() => removerDaFila(item.id)} hitSlop={10}>
              <Ionicons name="remove-circle-outline" size={22} color={cores.textoSecundario} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[estilos.vazio, { color: cores.textoSecundario }]}>Nada na sequência por aqui.</Text>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginBottom: 16 },
  titulo: { fontSize: 20, fontWeight: '800' },
  secao: { marginBottom: 8 },
  rotulo: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vazio: { textAlign: 'center', marginTop: 32, fontSize: 13 },
});
