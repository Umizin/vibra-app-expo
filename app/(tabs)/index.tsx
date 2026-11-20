import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartaoDeCapa } from '@/components/CartaoDeCapa';
import { SecaoComTitulo } from '@/components/SecaoComTitulo';
import { corSobreHumor, humores } from '@/constants/humores';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePreferencias } from '@/contexts/PreferenciasContext';
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
  const { generos } = usePreferencias();
  const { tocarFaixa } = usePlayer();
  const daVibe = useRequisicao(() => catalogoService.buscarPorGeneros(generos), [generos.join()]);

  return (
    <ScrollView
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }}
    >
      <Text style={[estilos.saudacao, { color: cores.texto }]}>
        {saudacaoConformeHorario()}, {usuario?.nome}
      </Text>

      <Pressable onPress={() => router.push('/radio')} style={estilos.banner}>
        <LinearGradient colors={humores[3].cores} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={estilos.gradiente}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.tituloBanner}>Rádio de Humor</Text>
            <Text style={estilos.legendaBanner}>Uma estação para cada momento do seu dia</Text>
          </View>
          <Ionicons name="radio" size={36} color={corSobreHumor} />
        </LinearGradient>
      </Pressable>

      {generos.length > 0 && (
        <SecaoComTitulo titulo="Na sua vibe">
          {daVibe.carregando ? (
            <ActivityIndicator color={cores.destaque} />
          ) : daVibe.erro ? (
            <Text style={[estilos.estado, { color: cores.perigo }]}>{daVibe.erro}</Text>
          ) : daVibe.dado?.length ? (
            daVibe.dado.map((faixa) => (
              <CartaoDeCapa
                key={faixa.id}
                titulo={faixa.titulo}
                subtitulo={faixa.artista}
                capaUrl={faixa.capaUrl}
                aoPressionar={() => tocarFaixa(faixa, daVibe.dado ?? [faixa])}
              />
            ))
          ) : (
            <Text style={[estilos.estado, { color: cores.textoSecundario }]}>Nenhuma faixa encontrada para seus estilos compatíveis.</Text>
          )}
        </SecaoComTitulo>
      )}

      <SecaoComTitulo titulo="Feitas para você">
        {playlists.carregando ? (
          <ActivityIndicator color={cores.destaque} />
        ) : playlists.erro ? (
          <Text style={[estilos.estado, { color: cores.perigo }]}>{playlists.erro}</Text>
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
        ) : albuns.erro ? (
          <Text style={[estilos.estado, { color: cores.perigo }]}>{albuns.erro}</Text>
        ) : albuns.dado?.data.length ? (
          albuns.dado.data.map((album) => (
            <CartaoDeCapa
              key={album.id}
              titulo={album.titulo}
              subtitulo={album.artista}
              capaUrl={album.capaUrl}
              aoPressionar={() => router.push(`/album/${album.id}` as never)}
            />
          ))
        ) : (
          <Text style={[estilos.estado, { color: cores.textoSecundario }]}>Nenhum álbum disponível no catálogo.</Text>
        )}
      </SecaoComTitulo>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  saudacao: { fontSize: 24, fontWeight: '800', paddingHorizontal: 16, marginBottom: 20 },
  banner: { marginHorizontal: 16, marginBottom: 28 },
  gradiente: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 20, gap: 12 },
  tituloBanner: { color: corSobreHumor, fontSize: 20, fontWeight: '900' },
  legendaBanner: { color: corSobreHumor, opacity: 0.85, fontSize: 13, marginTop: 4 },
  estado: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 8 },
});
