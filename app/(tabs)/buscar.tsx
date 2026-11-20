import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoDeTexto } from '@/components/CampoDeTexto';
import { LinhaDeFaixa } from '@/components/LinhaDeFaixa';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { catalogoService, PaginaCatalogo } from '@/services/catalogoService';
import type { Album, Artista, Faixa } from '@/types/modelos';

type CategoriaBusca = 'faixas' | 'artistas' | 'albuns';
type ResultadoBusca =
  | { tipo: 'faixa'; valor: Faixa }
  | { tipo: 'artista'; valor: Artista }
  | { tipo: 'album'; valor: Album };

export default function TelaDeBusca() {
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaBusca>('faixas');
  const [faixas, setFaixas] = useState<PaginaCatalogo<Faixa> | null>(null);
  const [artistas, setArtistas] = useState<PaginaCatalogo<Artista> | null>(null);
  const [albuns, setAlbuns] = useState<PaginaCatalogo<Album> | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tocarFaixa } = usePlayer();

  useEffect(() => {
    let cancelada = false;
    const termoNormalizado = termo.trim();
    setErro(null);

    if (!termoNormalizado) {
      setFaixas(null);
      setArtistas(null);
      setAlbuns(null);
      setCarregando(false);
      return () => { cancelada = true; };
    }

    if (categoria === 'faixas') setFaixas(null);
    else if (categoria === 'artistas') setArtistas(null);
    else setAlbuns(null);

    setCarregando(true);
    const timeout = setTimeout(async () => {
      try {
        if (categoria === 'faixas') {
          const resultado = await catalogoService.buscarPorTermo(termoNormalizado);
          if (!cancelada) setFaixas(resultado);
        } else if (categoria === 'artistas') {
          const resultado = await catalogoService.buscarArtistas(termoNormalizado);
          if (!cancelada) setArtistas(resultado);
        } else {
          const resultado = await catalogoService.buscarAlbuns(termoNormalizado);
          if (!cancelada) setAlbuns(resultado);
        }
      } catch (falha) {
        if (!cancelada) setErro(falha instanceof Error ? falha.message : 'Não foi possível buscar no catálogo.');
      } finally {
        if (!cancelada) setCarregando(false);
      }
    }, 300);

    return () => {
      cancelada = true;
      clearTimeout(timeout);
    };
  }, [termo, categoria]);

  const paginaAtual = categoria === 'faixas' ? faixas : categoria === 'artistas' ? artistas : albuns;
  const resultados = useMemo<ResultadoBusca[]>(() => {
    if (categoria === 'faixas') return (faixas?.data ?? []).map((valor) => ({ tipo: 'faixa', valor }));
    if (categoria === 'artistas') return (artistas?.data ?? []).map((valor) => ({ tipo: 'artista', valor }));
    return (albuns?.data ?? []).map((valor) => ({ tipo: 'album', valor }));
  }, [categoria, faixas, artistas, albuns]);

  async function carregarMais() {
    if (!paginaAtual?.pagination.hasMore || carregandoMais || carregando) return;
    setCarregandoMais(true);
    setErro(null);
    const { offset, limit } = paginaAtual.pagination;
    try {
      if (categoria === 'faixas') {
        const proxima = await catalogoService.buscarPorTermo(termo, offset + limit, limit);
        setFaixas((atual) => atual ? { data: [...atual.data, ...proxima.data], pagination: proxima.pagination } : proxima);
      } else if (categoria === 'artistas') {
        const proxima = await catalogoService.buscarArtistas(termo, offset + limit, limit);
        setArtistas((atual) => atual ? { data: [...atual.data, ...proxima.data], pagination: proxima.pagination } : proxima);
      } else {
        const proxima = await catalogoService.buscarAlbuns(termo, undefined, offset + limit, limit);
        setAlbuns((atual) => atual ? { data: [...atual.data, ...proxima.data], pagination: proxima.pagination } : proxima);
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar mais resultados.');
    } finally {
      setCarregandoMais(false);
    }
  }

  function renderResultado({ item }: { item: ResultadoBusca }) {
    if (item.tipo === 'faixa') {
      return <LinhaDeFaixa faixa={item.valor} aoPressionar={() => tocarFaixa(item.valor, faixas?.data ?? [item.valor])} />;
    }
    const ehArtista = item.tipo === 'artista';
    const titulo = ehArtista ? item.valor.nome : item.valor.titulo;
    const subtitulo = ehArtista ? 'Artista' : item.valor.artista;
    const capaUrl = ehArtista ? item.valor.fotoUrl : item.valor.capaUrl;
    const destino = ehArtista ? `/artista/${item.valor.id}` : `/album/${item.valor.id}`;
    return (
      <Pressable style={estilos.itemCatalogo} onPress={() => router.push(destino as never)}>
        {capaUrl ? (
          <Image source={{ uri: capaUrl }} style={estilos.capaCatalogo} contentFit="cover" />
        ) : (
          <View style={[estilos.capaCatalogo, estilos.capaVazia, { backgroundColor: cores.superficieElevada }]}>
            <Ionicons name={ehArtista ? 'person' : 'disc'} size={22} color={cores.textoSecundario} />
          </View>
        )}
        <View style={estilos.textoCatalogo}>
          <Text style={[estilos.itemTitulo, { color: cores.texto }]} numberOfLines={1}>{titulo}</Text>
          <Text style={[estilos.itemSubtitulo, { color: cores.textoSecundario }]}>{subtitulo}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={cores.textoSecundario} />
      </Pressable>
    );
  }

  const listaVazia = termo.trim().length > 0 && !carregando && !erro && resultados.length === 0;

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <Text style={[estilos.titulo, { color: cores.texto }]}>Buscar</Text>
      <CampoDeTexto valor={termo} aoMudar={setTermo} placeholder="Músicas, artistas ou álbuns" />

      <View style={estilos.categorias}>
        {([
          ['faixas', 'Faixas'], ['artistas', 'Artistas'], ['albuns', 'Álbuns'],
        ] as const).map(([valor, rotulo]) => (
          <Pressable
            key={valor}
            onPress={() => setCategoria(valor)}
            style={[estilos.categoria, { backgroundColor: categoria === valor ? cores.destaque : cores.superficieElevada }]}
          >
            <Text style={{ color: categoria === valor ? cores.fundo : cores.texto, fontWeight: '700' }}>{rotulo}</Text>
          </Pressable>
        ))}
      </View>

      {!termo.trim() ? (
        <Text style={[estilos.estado, { color: cores.textoSecundario }]}>Busque no catálogo de faixas, artistas e álbuns.</Text>
      ) : erro && resultados.length === 0 ? (
        <Text style={[estilos.estado, { color: cores.perigo }]}>{erro}</Text>
      ) : carregando && resultados.length === 0 ? (
        <ActivityIndicator color={cores.destaque} style={estilos.carregando} />
      ) : listaVazia ? (
        <Text style={[estilos.estado, { color: cores.textoSecundario }]}>Nenhum resultado para &quot;{termo}&quot;.</Text>
      ) : (
        <FlatList
          data={resultados}
          keyExtractor={(item) => `${item.tipo}-${item.valor.id}`}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={renderResultado}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.5}
          ListFooterComponent={erro ? (
            <Text style={[estilos.estado, { color: cores.perigo }]}>{erro}</Text>
          ) : carregandoMais ? (
            <ActivityIndicator color={cores.destaque} style={{ marginVertical: 20 }} />
          ) : null}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  titulo: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  categorias: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 10 },
  categoria: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  estado: { marginTop: 24, textAlign: 'center', fontSize: 13 },
  carregando: { marginTop: 24 },
  itemCatalogo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  capaCatalogo: { width: 48, height: 48, borderRadius: 6 },
  capaVazia: { alignItems: 'center', justifyContent: 'center' },
  textoCatalogo: { flex: 1 },
  itemTitulo: { fontSize: 15, fontWeight: '600' },
  itemSubtitulo: { fontSize: 12, marginTop: 3 },
});
