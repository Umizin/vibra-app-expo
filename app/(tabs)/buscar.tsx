import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoDeTexto } from '@/components/CampoDeTexto';
import { LinhaDeFaixa } from '@/components/LinhaDeFaixa';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/contexts/TemaContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { catalogoService } from '@/services/catalogoService';

export default function TelaDeBusca() {
  const [termo, setTermo] = useState('');
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { tocarFaixa } = usePlayer();

  const resultados = useRequisicao(() => catalogoService.buscarPorTermo(termo), [termo]);
  const faixasEncontradas = resultados.dado ?? [];

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <Text style={[estilos.titulo, { color: cores.texto }]}>Buscar</Text>

      <CampoDeTexto valor={termo} aoMudar={setTermo} placeholder="Músicas ou artistas" />

      {termo.trim().length === 0 ? (
        <Text style={[estilos.dica, { color: cores.textoSecundario }]}>
          Busque pelo nome de uma faixa ou de um artista.
        </Text>
      ) : resultados.carregando ? (
        <ActivityIndicator color={cores.destaque} style={estilos.carregando} />
      ) : (
        <FlatList
          data={faixasEncontradas}
          keyExtractor={(faixa) => faixa.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <LinhaDeFaixa faixa={item} aoPressionar={() => tocarFaixa(item, faixasEncontradas)} />
          )}
          ListEmptyComponent={
            <Text style={[estilos.dica, { color: cores.textoSecundario }]}>
              Nenhum resultado para &quot;{termo}&quot;.
            </Text>
          }
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  titulo: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  dica: { marginTop: 24, textAlign: 'center', fontSize: 13 },
  carregando: { marginTop: 24 },
});
