import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { usePlaylistDetalhes } from '@/hooks/usePlaylistDetalhes';
import { ApiClientError } from '@/services/api';
import { catalogoService, type PaginaCatalogo } from '@/services/catalogoService';
import type { Faixa } from '@/types/modelos';
import { formatarDuracao } from '@/utils/formatarDuracao';

export default function TelaDeDetalheDaPlaylist() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const playlistId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tocarFaixa } = usePlayer();
  const { estado, carregar, adicionar, remover } = usePlaylistDetalhes(playlistId);

  const [seletorVisivel, setSeletorVisivel] = useState(false);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<PaginaCatalogo<Faixa> | null>(null);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);

  useEffect(() => {
    if (!seletorVisivel || !termo.trim()) {
      setResultados(null);
      setCarregandoBusca(false);
      setErroBusca(null);
      return;
    }

    let cancelada = false;
    const timeout = setTimeout(async () => {
      setCarregandoBusca(true);
      setErroBusca(null);
      try {
        const pagina = await catalogoService.buscarFaixas({ q: termo.trim(), offset: 0, limit: 20 });
        if (!cancelada) setResultados(pagina);
      } catch (error) {
        if (!cancelada) setErroBusca(error instanceof Error ? error.message : 'Não foi possível buscar faixas.');
      } finally {
        if (!cancelada) setCarregandoBusca(false);
      }
    }, 300);

    return () => {
      cancelada = true;
      clearTimeout(timeout);
    };
  }, [seletorVisivel, termo]);

  function mensagemErro(error: unknown, operacao: 'adicionar' | 'remover'): string {
    if (error instanceof ApiClientError && error.status === 404) {
      return operacao === 'remover'
        ? 'A faixa já não está na playlist. A lista foi atualizada.'
        : 'A playlist não foi encontrada. Atualize a tela e tente novamente.';
    }
    if (error instanceof ApiClientError && error.status === 409) {
      return 'A playlist mudou durante a operação. Atualizamos as faixas; tente novamente.';
    }
    return error instanceof Error ? error.message : `Não foi possível ${operacao} a faixa.`;
  }

  async function adicionarFaixa(faixa: Faixa) {
    setErroOperacao(null);
    try {
      const added = await adicionar(faixa.id);
      if (added) {
        setSeletorVisivel(false);
        setTermo('');
        setErroOperacao('Faixa adicionada à playlist.');
      }
    } catch (error) {
      setErroBusca(mensagemErro(error, 'adicionar'));
    }
  }

  function confirmarRemocao(jamendoTrackId: string) {
    Alert.alert(
      'Remover faixa?',
      'A faixa será removida somente desta playlist.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setErroOperacao(null);
            void remover(jamendoTrackId)
              .then((removed) => { if (removed) setErroOperacao('Faixa removida da playlist.'); })
              .catch((error: unknown) => setErroOperacao(mensagemErro(error, 'remover')));
          },
        },
      ],
      { cancelable: true },
    );
  }

  async function carregarMaisResultados() {
    const pagina = resultados;
    if (!pagina?.pagination.hasMore || carregandoMais || carregandoBusca) return;
    setCarregandoMais(true);
    setErroBusca(null);
    try {
      const next = await catalogoService.buscarFaixas({
        q: termo.trim(),
        offset: pagina.pagination.offset + pagina.pagination.limit,
        limit: pagina.pagination.limit,
      });
      setResultados((current) => current
        ? { data: [...current.data, ...next.data], pagination: next.pagination }
        : next);
    } catch (error) {
      setErroBusca(error instanceof Error ? error.message : 'Não foi possível carregar mais faixas.');
    } finally {
      setCarregandoMais(false);
    }
  }

  if (estado.carregando && !estado.playlist) {
    return (
      <View style={[estilos.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator color={cores.destaque} size="large" />
      </View>
    );
  }

  if (!estado.playlist) {
    return (
      <View style={[estilos.centro, { backgroundColor: cores.fundo, padding: 24 }]}>
        <Text style={[estilos.mensagem, { color: cores.texto }]}>{estado.erro ?? 'Não encontramos essa playlist.'}</Text>
        <Pressable
          disabled={estado.carregando}
          onPress={() => void carregar()}
          style={estilos.tentarNovamente}
        >
          <Text style={[estilos.link, { color: cores.destaque }]}>Tentar novamente</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={estilos.tentarNovamente}>
          <Text style={[estilos.link, { color: cores.textoSecundario }]}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const { playlist, faixas } = estado;

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <FlatList
        data={faixas}
        keyExtractor={(item) => `${playlist.id}-${item.referencia.jamendoTrackId}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, flexGrow: 1 }}
        ListHeaderComponent={(
          <>
            <LinearGradient colors={[cores.destaque, cores.fundo]} style={estilos.cabecalho}>
              <Pressable onPress={() => router.back()} style={[estilos.voltar, { top: insets.top + 8 }]} hitSlop={12}>
                <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
              </Pressable>
              <View style={[estilos.capaPlaylist, { backgroundColor: cores.superficieElevada }]}>
                <Ionicons name="musical-notes" size={48} color={cores.textoSecundario} />
              </View>
              <Text style={estilos.titulo} numberOfLines={2}>{playlist.name}</Text>
              <Text style={estilos.legenda}>{playlist.description || 'Playlist privada'}</Text>
              <Text style={estilos.contagem}>{faixas.length} música(s)</Text>
            </LinearGradient>
            <View style={estilos.acoesPlaylist}>
              <Pressable
                onPress={() => { setErroBusca(null); setSeletorVisivel(true); }}
                disabled={estado.processando}
                style={[estilos.botaoAdicionar, { backgroundColor: cores.destaque, opacity: estado.processando ? 0.6 : 1 }]}
              >
                <Ionicons name="add" size={20} color="#121212" />
                <Text style={estilos.textoBotaoAdicionar}>Adicionar músicas</Text>
              </Pressable>
              {estado.processando ? <ActivityIndicator color={cores.destaque} /> : null}
            </View>
            {erroOperacao ? <Text accessibilityRole="alert" style={[estilos.feedback, { color: cores.textoSecundario }]}>{erroOperacao}</Text> : null}
            {estado.erro ? (
              <View style={[estilos.erroAtualizacao, { backgroundColor: cores.superficieElevada }]}>
                <Text style={[estilos.mensagem, { color: cores.perigo }]}>{estado.erro}</Text>
                <Pressable disabled={estado.processando || estado.carregando} onPress={() => void carregar()}>
                  <Text style={[estilos.link, { color: cores.destaque }]}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
        ListEmptyComponent={estado.carregando ? (
          <ActivityIndicator color={cores.destaque} style={{ marginTop: 22 }} />
        ) : (
          <View style={estilos.vazio}>
            <Ionicons name="musical-notes-outline" size={34} color={cores.textoSecundario} />
            <Text style={[estilos.mensagem, { color: cores.textoSecundario }]}>Esta playlist ainda não tem faixas.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const faixa = item.faixa;
          if (!faixa) {
            return (
          <View style={[estilos.linhaFaixa, estilos.linhaIndisponivel, { backgroundColor: cores.superficie }]}>
            <View style={[estilos.capaFaixa, estilos.placeholder, { backgroundColor: cores.superficieElevada }]}>
              <Ionicons name="help-circle-outline" size={22} color={cores.textoSecundario} />
            </View>
            <View style={estilos.informacoesFaixa}>
              <Text style={[estilos.nomeFaixa, { color: cores.textoSecundario }]}>Faixa indisponível</Text>
              <Text style={[estilos.artistaFaixa, { color: cores.textoSecundario }]} numberOfLines={1}>
                ID Jamendo: {item.referencia.jamendoTrackId}
              </Text>
              <Text style={[estilos.artistaFaixa, { color: cores.textoSecundario }]}>Metadados não encontrados</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover referência indisponível"
              disabled={estado.processando}
              onPress={() => confirmarRemocao(item.referencia.jamendoTrackId)}
              style={estilos.botaoRemover}
            >
              <Ionicons name="trash-outline" size={20} color={cores.perigo} />
            </Pressable>
          </View>
            );
          }
          const fila = faixas.flatMap((entry) => (entry.faixa ? [entry.faixa] : []));
          return (
          <View style={estilos.linhaFaixa}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reproduzir ${faixa.titulo}`}
              onPress={() => tocarFaixa(faixa, fila)}
              style={estilos.faixaConteudo}
            >
              {faixa.capaUrl ? (
                <Image source={{ uri: faixa.capaUrl }} style={estilos.capaFaixa} contentFit="cover" />
              ) : (
                <View style={[estilos.capaFaixa, estilos.placeholder, { backgroundColor: cores.superficieElevada }]}>
                  <Ionicons name="musical-notes" size={20} color={cores.textoSecundario} />
                </View>
              )}
              <View style={estilos.informacoesFaixa}>
                <Text style={[estilos.nomeFaixa, { color: cores.texto }]} numberOfLines={1}>{faixa.titulo}</Text>
                <Text style={[estilos.artistaFaixa, { color: cores.textoSecundario }]} numberOfLines={1}>{faixa.artista}</Text>
              </View>
              <Text style={[estilos.duracao, { color: cores.textoSecundario }]}>{formatarDuracao(faixa.duracaoEmSegundos)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover ${faixa.titulo} da playlist`}
              disabled={estado.processando}
              onPress={() => confirmarRemocao(item.referencia.jamendoTrackId)}
              style={estilos.botaoRemover}
            >
              <Ionicons name="remove-circle-outline" size={22} color={cores.textoSecundario} />
            </Pressable>
          </View>
          );
        }}
      />

      <Modal visible={seletorVisivel} transparent animationType="slide" onRequestClose={() => setSeletorVisivel(false)}>
        <View style={estilos.modalFundo}>
          <View style={[estilos.modalConteudo, { backgroundColor: cores.fundo }]}>
            <View style={estilos.modalCabecalho}>
              <Text style={[estilos.modalTitulo, { color: cores.texto }]}>Adicionar músicas</Text>
              <Pressable accessibilityLabel="Fechar busca" onPress={() => setSeletorVisivel(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color={cores.textoSecundario} />
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Buscar músicas"
              value={termo}
              onChangeText={setTermo}
              placeholder="Buscar no catálogo"
              placeholderTextColor={cores.textoSecundario}
              autoCorrect={false}
              style={[estilos.campoBusca, { color: cores.texto, backgroundColor: cores.superficieElevada }]}
            />
            {erroBusca ? <Text accessibilityRole="alert" style={[estilos.erroBusca, { color: cores.perigo }]}>{erroBusca}</Text> : null}
            {carregandoBusca ? <ActivityIndicator color={cores.destaque} style={{ marginTop: 18 }} /> : null}
            {!termo.trim() ? <Text style={[estilos.dicaBusca, { color: cores.textoSecundario }]}>Pesquise faixas para adicionar à playlist.</Text> : null}
            {termo.trim() && !carregandoBusca && !erroBusca && resultados?.data.length === 0 ? (
              <Text style={[estilos.dicaBusca, { color: cores.textoSecundario }]}>Nenhuma faixa encontrada.</Text>
            ) : null}
            <FlatList
              data={resultados?.data ?? []}
              keyExtractor={(faixa) => faixa.id}
              keyboardShouldPersistTaps="handled"
              onEndReached={() => void carregarMaisResultados()}
              onEndReachedThreshold={0.5}
              ListFooterComponent={carregandoMais ? <ActivityIndicator color={cores.destaque} style={{ marginVertical: 16 }} /> : null}
              renderItem={({ item }) => {
                const jaAdicionada = estado.faixas.some((faixa) => faixa.referencia.jamendoTrackId === item.id);
                return (
                  <View style={[estilos.resultadoBusca, { borderBottomColor: cores.borda }]}>
                    {item.capaUrl ? (
                      <Image source={{ uri: item.capaUrl }} style={estilos.capaFaixa} contentFit="cover" />
                    ) : (
                      <View style={[estilos.capaFaixa, estilos.placeholder, { backgroundColor: cores.superficieElevada }]}>
                        <Ionicons name="musical-notes" size={20} color={cores.textoSecundario} />
                      </View>
                    )}
                    <View style={estilos.informacoesFaixa}>
                      <Text style={[estilos.nomeFaixa, { color: cores.texto }]} numberOfLines={1}>{item.titulo}</Text>
                      <Text style={[estilos.artistaFaixa, { color: cores.textoSecundario }]} numberOfLines={1}>{item.artista}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={jaAdicionada ? 'Faixa já adicionada' : `Adicionar ${item.titulo}`}
                      disabled={jaAdicionada || estado.processando}
                      onPress={() => void adicionarFaixa(item)}
                      style={estilos.botaoRemover}
                    >
                      <Ionicons name={jaAdicionada ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={jaAdicionada ? cores.destaque : cores.texto} />
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cabecalho: { alignItems: 'center', paddingTop: 70, paddingBottom: 22 },
  voltar: { position: 'absolute', left: 16, zIndex: 1 },
  capaPlaylist: { width: 164, height: 164, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 24 },
  legenda: { fontSize: 13, color: '#FFFFFF', opacity: 0.85, marginTop: 6 },
  contagem: { fontSize: 12, color: '#FFFFFF', opacity: 0.75, marginTop: 5 },
  acoesPlaylist: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  botaoAdicionar: { minHeight: 42, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  textoBotaoAdicionar: { color: '#121212', fontWeight: '700', fontSize: 14 },
  feedback: { fontSize: 13, marginBottom: 8 },
  erroAtualizacao: { padding: 12, borderRadius: 8, gap: 8, marginBottom: 10 },
  mensagem: { textAlign: 'center', fontSize: 14 },
  link: { fontSize: 14, fontWeight: '700' },
  tentarNovamente: { padding: 12 },
  vazio: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10 },
  linhaFaixa: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  linhaIndisponivel: { paddingHorizontal: 8, borderRadius: 8, marginVertical: 3 },
  faixaConteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, paddingVertical: 4 },
  capaFaixa: { width: 46, height: 46, borderRadius: 5 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  informacoesFaixa: { flex: 1, minWidth: 0 },
  nomeFaixa: { fontSize: 14, fontWeight: '600' },
  artistaFaixa: { fontSize: 12, marginTop: 3 },
  duracao: { fontSize: 12 },
  botaoRemover: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalFundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' },
  modalConteudo: { height: '82%', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingHorizontal: 16 },
  modalCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: '800' },
  campoBusca: { minHeight: 46, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, marginBottom: 8 },
  erroBusca: { fontSize: 13, marginVertical: 6 },
  dicaBusca: { marginVertical: 16, textAlign: 'center', fontSize: 13 },
  resultadoBusca: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});
