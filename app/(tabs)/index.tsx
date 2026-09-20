import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartaoDeCapa } from '@/components/CartaoDeCapa';
import { SecaoComTitulo } from '@/components/SecaoComTitulo';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/TemaContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { catalogoService } from '@/services/catalogoService';

function saudacaoConformeHorario(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function TelaInicial() {
  const { cores } = useTema();
  const { usuario } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const playlists = useRequisicao(() => catalogoService.listarPlaylists(), []);
  const albuns = useRequisicao(() => catalogoService.listarAlbuns(), []);

  return (
    <ScrollView
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }}
    >
      <Text style={[estilos.saudacao, { color: cores.texto }]}>
        {saudacaoConformeHorario()}, {usuario?.nome}
      </Text>

      <SecaoComTitulo titulo="Feitas para você">
        {playlists.carregando ? (
          <ActivityIndicator color={cores.destaque} />
        ) : (
          playlists.dado?.map((playlist) => (
            <CartaoDeCapa
              key={playlist.id}
              titulo={playlist.titulo}
              subtitulo={playlist.descricao}
              capaUrl={playlist.capaUrl}
              aoPressionar={() => router.push(`/playlist/${playlist.id}`)}
            />
          ))
        )}
      </SecaoComTitulo>

      <SecaoComTitulo titulo="Álbuns em alta">
        {albuns.carregando ? (
          <ActivityIndicator color={cores.destaque} />
        ) : (
          albuns.dado?.map((album) => (
            <CartaoDeCapa
              key={album.id}
              titulo={album.titulo}
              subtitulo={album.artista}
              capaUrl={album.capaUrl}
              aoPressionar={() => router.push(`/playlist/${album.id}`)}
            />
          ))
        )}
      </SecaoComTitulo>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  saudacao: { fontSize: 24, fontWeight: '800', paddingHorizontal: 16, marginBottom: 20 },
});
