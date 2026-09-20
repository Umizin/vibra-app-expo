import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFavoritos } from '@/contexts/FavoritosContext';
import { useTema } from '@/contexts/TemaContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { catalogoService } from '@/services/catalogoService';

export default function TelaDeBiblioteca() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { idsFavoritos } = useFavoritos();

  const playlists = useRequisicao(() => catalogoService.listarPlaylists(), []);

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <Text style={[estilos.titulo, { color: cores.texto }]}>Sua Biblioteca</Text>

      <Pressable
        style={[estilos.itemFavoritas, { backgroundColor: cores.superficieElevada }]}
        onPress={() => router.push('/favoritas')}
      >
        <View style={[estilos.iconeFavoritas, { backgroundColor: cores.destaque }]}>
          <Ionicons name="heart" size={22} color="#121212" />
        </View>
        <View>
          <Text style={[estilos.itemTitulo, { color: cores.texto }]}>Músicas Curtidas</Text>
          <Text style={[estilos.itemSubtitulo, { color: cores.textoSecundario }]}>
            {idsFavoritos.length} faixa(s)
          </Text>
        </View>
      </Pressable>

      {playlists.carregando ? (
        <ActivityIndicator color={cores.destaque} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={playlists.dado ?? []}
          keyExtractor={(playlist) => playlist.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <Pressable style={estilos.item} onPress={() => router.push(`/playlist/${item.id}`)}>
              <Image source={{ uri: item.capaUrl }} style={estilos.capa} contentFit="cover" />
              <View>
                <Text style={[estilos.itemTitulo, { color: cores.texto }]}>{item.titulo}</Text>
                <Text style={[estilos.itemSubtitulo, { color: cores.textoSecundario }]}>Playlist</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  titulo: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  itemFavoritas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  iconeFavoritas: { width: 48, height: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  capa: { width: 48, height: 48, borderRadius: 4 },
  itemTitulo: { fontSize: 15, fontWeight: '600' },
  itemSubtitulo: { fontSize: 12, marginTop: 2 },
});
