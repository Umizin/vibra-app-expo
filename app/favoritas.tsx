import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinhaDeFaixa } from '@/components/LinhaDeFaixa';
import { useFavoritos } from '@/contexts/FavoritosContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { todasAsFaixas } from '@/data/catalogo';

export default function TelaDeFavoritas() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { idsFavoritos } = useFavoritos();
  const { tocarFaixa } = usePlayer();

  const faixasFavoritas = todasAsFaixas.filter((faixa) => idsFavoritos.includes(faixa.id));

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <View style={estilos.cabecalho}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={cores.texto} />
        </Pressable>
        <Text style={[estilos.titulo, { color: cores.texto }]}>Músicas Curtidas</Text>
      </View>

      <FlatList
        data={faixasFavoritas}
        keyExtractor={(faixa) => faixa.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        renderItem={({ item }) => (
          <LinhaDeFaixa faixa={item} aoPressionar={() => tocarFaixa(item, faixasFavoritas)} />
        )}
        ListEmptyComponent={
          <Text style={[estilos.vazio, { color: cores.textoSecundario }]}>
            Toque no coração de uma faixa para curti-la.
          </Text>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginBottom: 16 },
  titulo: { fontSize: 20, fontWeight: '800' },
  vazio: { textAlign: 'center', marginTop: 40, fontSize: 13, paddingHorizontal: 32 },
});
