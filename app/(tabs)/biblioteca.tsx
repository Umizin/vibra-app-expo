import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFavoritos } from '@/contexts/FavoritosContext';
import { useTema } from '@/contexts/TemaContext';
import { executarSeConfirmado, useBibliotecaPlaylists, validarFormularioPlaylist } from '@/hooks/useBibliotecaPlaylists';
import { ApiClientError } from '@/services/api';
import type { PlaylistPersistida } from '@/types/modelos';

export default function TelaDeBiblioteca() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { idsFavoritos } = useFavoritos();
  const { estado, carregar, criar, atualizar, excluir } = useBibliotecaPlaylists();
  const [modalVisivel, setModalVisivel] = useState(false);
  const [playlistEditada, setPlaylistEditada] = useState<PlaylistPersistida | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function abrirCriacao() {
    setPlaylistEditada(null);
    setNome('');
    setDescricao('');
    setErroFormulario(null);
    setModalVisivel(true);
  }

  function abrirEdicao(playlist: PlaylistPersistida) {
    setPlaylistEditada(playlist);
    setNome(playlist.name);
    setDescricao(playlist.description ?? '');
    setErroFormulario(null);
    setModalVisivel(true);
  }

  function mensagemErro(error: unknown): string {
    if (error instanceof ApiClientError && error.status === 404) {
      return 'Essa playlist não está mais disponível. A lista foi atualizada.';
    }
    if (error instanceof ApiClientError && error.status === 409) {
      return 'A alteração entrou em conflito. Atualize os dados e tente novamente.';
    }
    return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
  }

  async function salvarPlaylist() {
    const validationError = validarFormularioPlaylist(nome, descricao);
    if (validationError) {
      setErroFormulario(validationError);
      return;
    }
    setErroFormulario(null);
    try {
      const saved = playlistEditada
        ? await atualizar(playlistEditada.id, { name: nome.trim(), description: descricao.trim() || null })
        : await criar({ name: nome.trim(), ...(descricao.trim() ? { description: descricao.trim() } : {}) });
      if (!saved) return;
      setModalVisivel(false);
      setFeedback(playlistEditada ? 'Playlist atualizada.' : 'Playlist criada.');
    } catch (error) {
      setErroFormulario(mensagemErro(error));
    }
  }

  function confirmarExclusao(playlist: PlaylistPersistida) {
    void executarSeConfirmado(
      () => new Promise<boolean>((resolve) => {
        Alert.alert(
          'Excluir playlist?',
          `“${playlist.name}” será removida da sua biblioteca.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      }),
      async () => {
        try {
          const removed = await excluir(playlist.id);
          if (removed) setFeedback('Playlist excluída.');
          return removed;
        } catch (error) {
          setFeedback(mensagemErro(error));
          return false;
        }
      },
    );
  }

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <View style={estilos.tituloLinha}>
        <Text style={[estilos.titulo, { color: cores.texto }]}>Sua Biblioteca</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Criar playlist"
          onPress={abrirCriacao}
          disabled={estado.carregando || estado.processando}
          style={[estilos.botaoCriar, { backgroundColor: cores.destaque, opacity: estado.carregando || estado.processando ? 0.6 : 1 }]}
        >
          <Ionicons name="add" size={22} color="#121212" />
          <Text style={estilos.textoBotaoCriar}>Criar</Text>
        </Pressable>
      </View>

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

      {feedback ? (
        <Text accessibilityRole="alert" style={[estilos.feedback, { color: cores.textoSecundario }]}>
          {feedback}
        </Text>
      ) : null}

      {estado.erro ? (
        <View style={[estilos.estadoErro, { backgroundColor: cores.superficieElevada }]}>
          <Text style={[estilos.estadoTexto, { color: cores.texto }]}>{estado.erro}</Text>
          <Pressable onPress={() => void carregar()} disabled={estado.carregando}>
            <Text style={[estilos.link, { color: cores.destaque }]}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      {estado.carregando ? (
        <ActivityIndicator accessibilityLabel="Carregando playlists" color={cores.destaque} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={estado.playlists}
          keyExtractor={(playlist) => playlist.id}
          contentContainerStyle={{ paddingBottom: 140, flexGrow: 1 }}
          ListEmptyComponent={estado.erro ? null : (
            <View style={estilos.vazio}>
              <Ionicons name="musical-notes-outline" size={34} color={cores.textoSecundario} />
              <Text style={[estilos.vazioTitulo, { color: cores.texto }]}>Sua biblioteca começa aqui</Text>
              <Text style={[estilos.itemSubtitulo, { color: cores.textoSecundario }]}>Crie uma playlist para reunir suas faixas.</Text>
              <Pressable onPress={abrirCriacao}>
                <Text style={[estilos.link, { color: cores.destaque }]}>Criar playlist</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={[estilos.item, { borderBottomColor: cores.borda }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir playlist ${item.name}`}
                style={estilos.itemPrincipal}
                onPress={() => router.push(`/playlist/${item.id}`)}
              >
                <View style={[estilos.capa, { backgroundColor: cores.superficieElevada }]}>
                  <Ionicons name="musical-notes" size={22} color={cores.destaque} />
                </View>
                <View style={estilos.dadosPlaylist}>
                  <Text style={[estilos.itemTitulo, { color: cores.texto }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[estilos.itemSubtitulo, { color: cores.textoSecundario }]} numberOfLines={1}>
                    {item.description || 'Playlist'} · {item.trackCount} faixa(s)
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar playlist ${item.name}`}
                onPress={() => abrirEdicao(item)}
                disabled={estado.processando}
                style={estilos.acao}
              >
                <Ionicons name="create-outline" size={21} color={cores.textoSecundario} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Excluir playlist ${item.name}`}
                onPress={() => confirmarExclusao(item)}
                disabled={estado.processando}
                style={estilos.acao}
              >
                <Ionicons name="trash-outline" size={20} color={cores.perigo} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <View style={estilos.modalFundo}>
          <View style={[estilos.modalCartao, { backgroundColor: cores.superficie }]}>
            <Text style={[estilos.modalTitulo, { color: cores.texto }]}>
              {playlistEditada ? 'Editar playlist' : 'Nova playlist'}
            </Text>
            <Text style={[estilos.rotulo, { color: cores.textoSecundario }]}>Nome</Text>
            <TextInput
              accessibilityLabel="Nome da playlist"
              value={nome}
              onChangeText={setNome}
              placeholder="Nome da playlist"
              placeholderTextColor={cores.textoSecundario}
              maxLength={80}
              style={[estilos.campo, { color: cores.texto, borderColor: cores.borda, backgroundColor: cores.superficieElevada }]}
            />
            <Text style={[estilos.rotulo, { color: cores.textoSecundario }]}>Descrição (opcional)</Text>
            <TextInput
              accessibilityLabel="Descrição da playlist"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Conte um pouco sobre esta playlist"
              placeholderTextColor={cores.textoSecundario}
              maxLength={500}
              multiline
              style={[estilos.campo, estilos.campoDescricao, { color: cores.texto, borderColor: cores.borda, backgroundColor: cores.superficieElevada }]}
            />
            {erroFormulario ? <Text accessibilityRole="alert" style={[estilos.erroFormulario, { color: cores.perigo }]}>{erroFormulario}</Text> : null}
            <View style={estilos.botoesModal}>
              <Pressable onPress={() => setModalVisivel(false)} disabled={estado.processando} style={estilos.botaoSecundario}>
                <Text style={[estilos.link, { color: cores.textoSecundario }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => void salvarPlaylist()}
                disabled={estado.processando || estado.carregando}
                style={[estilos.botaoSalvar, { backgroundColor: cores.destaque, opacity: estado.processando || estado.carregando ? 0.6 : 1 }]}
              >
                {estado.processando ? <ActivityIndicator color="#121212" /> : (
                  <Text style={estilos.textoBotaoCriar}>{playlistEditada ? 'Salvar' : 'Criar'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  titulo: { fontSize: 24, fontWeight: '800' },
  botaoCriar: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  textoBotaoCriar: { color: '#121212', fontSize: 14, fontWeight: '700' },
  itemFavoritas: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 8, marginBottom: 16 },
  iconeFavoritas: { width: 48, height: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  itemPrincipal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  capa: { width: 48, height: 48, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  dadosPlaylist: { flex: 1, minWidth: 0 },
  acao: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  itemTitulo: { fontSize: 15, fontWeight: '600' },
  itemSubtitulo: { fontSize: 12, marginTop: 3 },
  estadoErro: { borderRadius: 8, padding: 14, gap: 10, marginVertical: 8 },
  estadoTexto: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '700' },
  vazio: { flex: 1, minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  vazioTitulo: { fontSize: 17, fontWeight: '700' },
  feedback: { marginBottom: 8, fontSize: 13 },
  modalFundo: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 20 },
  modalCartao: { borderRadius: 14, padding: 20, gap: 10 },
  modalTitulo: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  rotulo: { fontSize: 13, fontWeight: '600' },
  campo: { minHeight: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  campoDescricao: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  erroFormulario: { fontSize: 13 },
  botoesModal: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 10 },
  botaoSecundario: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 8 },
  botaoSalvar: { minWidth: 90, minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
});
